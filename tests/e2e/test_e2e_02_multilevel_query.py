import json
import time

import pytest

from agent_data.security_governance import (
    JWSVerifier,
    JWTValidator,
    MessageIntegrityVerifier,
    MetricsCollector,
    OAuthResourceIndicatorValidator,
    PrincipalAuthenticator,
    RateLimiter,
    _b64url_encode,
    propagate_trace_id,
)

pytestmark = pytest.mark.e2e


def _build_jwt(secret: str) -> tuple[str, dict]:
    payload = {
        "sub": "svc-multi",
        "iss": "https://accounts.google.com",
        "aud": "agent-data",
        "exp": int(time.time() + 120),
    }
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header, separators=",:").encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=",:").encode("utf-8"))
    import hashlib
    import hmac

    signature = hmac.new(
        secret.encode("utf-8"),
        msg=f"{header_b64}.{payload_b64}".encode("ascii"),
        digestmod=hashlib.sha256,
    ).digest()
    signature_b64 = _b64url_encode(signature)
    token = f"{header_b64}.{payload_b64}.{signature_b64}"
    return token, payload


def test_e2e_02_multilevel_query_pipeline():
    secret = "sentinel-secret"
    token, payload = _build_jwt(secret)

    authenticator = PrincipalAuthenticator(JWTValidator(secret=secret))
    envelope = {"principal": {"jwt": token}, "trace_id": "trace-multi"}
    assert authenticator.verify(envelope)

    oauth_validator = OAuthResourceIndicatorValidator()
    oauth_validator.validate(
        {"resource_indicators": ["https://service/query", "https://service/cache"]}
    )

    jws_verifier = JWSVerifier()
    integrity = MessageIntegrityVerifier(jws_verifier)
    message_payload = {"query": "multi-level", "levels": ["root", "child", "leaf"]}
    compact = jws_verifier.build(message_payload, kid="key-1", key=b"shared-key")
    parsed_payload = integrity.verify_before_enqueue(
        {"jws": compact}, {"key-1": b"shared-key"}
    )
    assert parsed_payload["levels"][-1] == "leaf"

    limiter = RateLimiter(limit=3, window_seconds=30)
    result = limiter.check(principal_id=payload["sub"], tenant_id="tenant-x")
    assert result.headers["X-RateLimit-Limit"] == "3"

    metrics = MetricsCollector()
    metrics.increment_request(profile="A2A-External", principal_id=payload["sub"])
    assert metrics.snapshot()[f"A2A-External:{payload['sub']}"] == 1

    event = {}
    propagate_trace_id(envelope, event)
    assert event["trace_id"] == "trace-multi"
