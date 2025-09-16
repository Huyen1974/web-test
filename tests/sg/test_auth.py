import json
import time

import pytest

from agent_data.security_governance import (
    JWTValidator,
    OAuthResourceIndicatorValidator,
    PrincipalAuthenticator,
    _b64url_encode,
)

pytestmark = pytest.mark.unit


def _make_jwt(payload: dict, secret: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header, separators=",:").encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=",:").encode("utf-8"))
    # mimic module algorithm
    import hashlib
    import hmac

    signature = hmac.new(
        secret.encode("utf-8"),
        msg=f"{header_b64}.{payload_b64}".encode("ascii"),
        digestmod=hashlib.sha256,
    ).digest()
    signature_b64 = _b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"


def test_principal_iam_jwt():
    authenticator = PrincipalAuthenticator(JWTValidator(secret="secret"))
    iam_envelope = {"principal": {"google_iam_verified": True}}
    assert authenticator.verify(iam_envelope), "# @req:SG-SEC-001"

    payload = {
        "sub": "service-account@example.com",
        "iss": "https://accounts.google.com",
        "aud": "agent-data",
        "exp": int(time.time() + 60),
    }
    token = _make_jwt(payload, "secret")
    jwt_envelope = {"principal": {"jwt": token}}
    assert authenticator.verify(jwt_envelope)


def test_oauth_rfc8707():
    validator = OAuthResourceIndicatorValidator()
    meta = {"resource_indicators": ["https://example.com/resource"]}
    validator.validate(meta)  # @req:SG-SEC-002

    with pytest.raises(ValueError):
        validator.validate({"resource_indicators": []})
    with pytest.raises(ValueError):
        validator.validate({"resource_indicators": ["not-a-url"]})
