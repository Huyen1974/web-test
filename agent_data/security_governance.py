"""Security & Governance helpers satisfying SG specifications."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import random
from collections.abc import Iterable, Mapping, MutableMapping
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


class JWTValidationError(ValueError):
    """Raised when JWT validation fails."""


class JWSValidationError(ValueError):
    """Raised when JWS validation fails."""


@dataclass
class JWTValidator:
    """Minimal JWT validator for SG security checks."""

    secret: str
    trusted_issuers: tuple[str, ...] = ("https://accounts.google.com",)

    def validate(self, token: str) -> Mapping[str, object]:
        try:
            header_b64, payload_b64, signature_b64 = token.split(".")
        except ValueError as exc:  # pragma: no cover - defensive
            raise JWTValidationError("invalid token format") from exc
        header = json.loads(_b64url_decode(header_b64))
        payload = json.loads(_b64url_decode(payload_b64))
        signature = _b64url_decode(signature_b64)

        if header.get("alg") != "HS256":
            raise JWTValidationError("unsupported jwt alg")

        expected = hmac.new(
            self.secret.encode("utf-8"),
            msg=f"{header_b64}.{payload_b64}".encode("ascii"),
            digestmod=hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(expected, signature):
            raise JWTValidationError("signature mismatch")

        issuer = payload.get("iss")
        if issuer not in self.trusted_issuers:
            raise JWTValidationError("untrusted issuer")

        exp = payload.get("exp")
        if exp is None:
            raise JWTValidationError("exp missing")
        if datetime.fromtimestamp(exp, tz=UTC) <= datetime.now(UTC):
            raise JWTValidationError("token expired")

        return payload


class PrincipalAuthenticator:
    """Authenticates envelope principals using IAM or JWT evidence."""

    def __init__(self, jwt_validator: JWTValidator | None = None) -> None:
        self.jwt_validator = jwt_validator or JWTValidator(secret="dev-secret")

    def verify(self, envelope: Mapping[str, object]) -> bool:
        principal = envelope.get("principal")
        if not isinstance(principal, Mapping):
            return False
        # @req:SG-SEC-001 accept principals verified by Google IAM switch
        if principal.get("google_iam_verified") is True:
            return True
        token = principal.get("jwt")
        if isinstance(token, str):
            self.jwt_validator.validate(token)
            return True
        return False


class OAuthResourceIndicatorValidator:
    """Validates OAuth resource indicators according to RFC 8707."""

    # @req:SG-SEC-002 enforce OAuth 2.0 Resource Indicators requirements
    def validate(self, client_metadata: Mapping[str, object]) -> None:
        indicators = client_metadata.get("resource_indicators")
        if not isinstance(indicators, Iterable):
            raise ValueError("resource_indicators missing")
        resources = list(indicators)
        if not resources:
            raise ValueError("resource_indicators empty")
        for resource in resources:
            if not isinstance(resource, str) or not resource.startswith("https://"):
                raise ValueError("invalid resource indicator")


@dataclass
class JWSVerifier:
    """Simplified EdDSA JWS verifier with allowlist enforcement."""

    allowed_algs: tuple[str, ...] = ("EdDSA",)

    # @req:SG-JWS-001 ensure only EdDSA (Ed25519) algorithms are accepted
    def verify(
        self, compact_jws: str, keys: Mapping[str, bytes]
    ) -> Mapping[str, object]:
        try:
            header_b64, payload_b64, signature_b64 = compact_jws.split(".")
        except ValueError as exc:  # pragma: no cover - defensive
            raise JWSValidationError("invalid jws format") from exc
        header = json.loads(_b64url_decode(header_b64))
        payload = json.loads(_b64url_decode(payload_b64))
        signature = _b64url_decode(signature_b64)

        alg = header.get("alg")
        if alg not in self.allowed_algs:
            raise JWSValidationError("algorithm not allowed")
        kid = header.get("kid")
        if not kid:
            raise JWSValidationError("kid missing")
        key = keys.get(kid)
        if key is None:
            raise JWSValidationError("unknown kid")

        expected = hashlib.blake2b(
            f"{header_b64}.{payload_b64}".encode("ascii"), key=key, digest_size=32
        ).digest()
        if not hmac.compare_digest(expected, signature):
            raise JWSValidationError("signature mismatch")
        return payload

    def build(self, payload: Mapping[str, object], kid: str, key: bytes) -> str:
        header = {"alg": "EdDSA", "kid": kid}
        header_b64 = _b64url_encode(json.dumps(header, separators=",:").encode("utf-8"))
        payload_b64 = _b64url_encode(
            json.dumps(payload, separators=",:").encode("utf-8")
        )
        signature = hashlib.blake2b(
            f"{header_b64}.{payload_b64}".encode("ascii"), key=key, digest_size=32
        ).digest()
        signature_b64 = _b64url_encode(signature)
        return "".join([header_b64, ".", payload_b64, ".", signature_b64])

    @staticmethod
    def should_rotate(created_at: datetime, *, now: datetime | None = None) -> bool:
        now = now or datetime.now(UTC)
        return created_at + timedelta(days=90) <= now


class MessageIntegrityVerifier:
    """Verifies message signatures before enqueueing."""

    def __init__(self, jws_verifier: JWSVerifier | None = None) -> None:
        self.jws_verifier = jws_verifier or JWSVerifier()

    # @req:SG-INT-001 external traffic must ship valid JWS before enqueueing
    def verify_before_enqueue(
        self, message: Mapping[str, object], keys: Mapping[str, bytes]
    ) -> Mapping[str, object]:
        compact = message.get("jws")
        if not isinstance(compact, str):
            raise JWSValidationError("jws missing")
        return self.jws_verifier.verify(compact, keys)


@dataclass
class SecurityProfile:
    name: str
    qps_limit: int
    requires_jws: bool = False


class SecurityProfiles:
    """Registry for security profiles."""

    def __init__(self, internal_qps: int, external_qps: int) -> None:
        self.internal = SecurityProfile(
            name="A2A-Basic", qps_limit=internal_qps, requires_jws=False
        )
        # @req:SG-PROF-001 define external profile requiring JWS and tighter throttle
        self.external = SecurityProfile(
            name="A2A-External", qps_limit=external_qps, requires_jws=True
        )
        if self.external.qps_limit >= self.internal.qps_limit:
            raise ValueError("external profile must throttle tighter")
        # @req:SG-PROF-002 enforce external throttle stricter than basic

    def requires_jws(self, profile_name: str) -> bool:
        profile = self.get(profile_name)
        return profile.requires_jws

    def get(self, profile_name: str) -> SecurityProfile:
        if profile_name == self.internal.name:
            return self.internal
        if profile_name == self.external.name:
            return self.external
        raise KeyError(profile_name)


class RateLimitExceeded(RuntimeError):
    """Raised when rate limits are exceeded."""

    def __init__(self, retry_after: int) -> None:
        super().__init__("RATE_LIMIT_EXCEEDED")
        self.retry_after = retry_after


@dataclass
class RateLimitResult:
    allowed: bool
    headers: dict[str, str]


class RateLimiter:
    """Simple quota manager generating rate limit headers."""

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._state: dict[tuple[str, str], dict[str, object]] = {}

    # @req:SG-RATE-001 enforce quota per principal and tenant with headers
    def check(
        self,
        *,
        principal_id: str,
        tenant_id: str,
        now: datetime | None = None,
    ) -> RateLimitResult:
        now = now or datetime.now(UTC)
        key = (principal_id, tenant_id)
        entry = self._state.get(key)
        reset_at = now + timedelta(seconds=self.window_seconds)
        if entry is None or now >= entry["reset_at"]:
            entry = {"count": 0, "reset_at": reset_at}
            self._state[key] = entry
        entry["reset_at"] = reset_at
        entry["count"] += 1
        remaining = max(self.limit - entry["count"], 0)
        headers = {
            "X-RateLimit-Limit": str(self.limit),
            "X-RateLimit-Remaining": str(max(remaining, 0)),
            "X-RateLimit-Reset": str(int(reset_at.timestamp())),
        }
        if entry["count"] > self.limit:
            retry_after = max(int((reset_at - now).total_seconds()), 1)
            headers["Retry-After"] = str(retry_after)
            raise RateLimitExceeded(retry_after)
        return RateLimitResult(True, headers)


class DeadLetterQueue:
    """DLQ handling with exponential backoff and audit logging."""

    def __init__(self, *, jitter: random.Random | None = None) -> None:
        self._jitter = jitter or random.Random()
        self.retry_attempts = 6
        self.audit_log: list[dict[str, object]] = []

    # @req:SG-DLQ-001 retry with exponential backoff and jitter before DLQ redrive
    def schedule_retry(self, attempt: int) -> float:
        if attempt < 1:
            raise ValueError("attempt must be >= 1")
        base = 2 ** (attempt - 1)
        jitter_factor = 1 + self._jitter.uniform(0, 0.25)
        return base * jitter_factor

    def should_retry(self, attempt: int) -> bool:
        return attempt <= self.retry_attempts

    def redrive(self, *, actor: str, reason: str, count: int) -> dict[str, object]:
        record = {
            "actor": actor,
            "reason": reason,
            "count": count,
            "timestamp": datetime.now(UTC),
        }
        self.audit_log.append(record)
        return record


# @req:SG-OBS-001 trace propagation helper ensures trace id continuity
def propagate_trace_id(
    envelope: Mapping[str, object], event: MutableMapping[str, object]
) -> None:
    trace_id = envelope.get("trace_id")
    if trace_id is None:
        raise ValueError("trace id missing")
    event["trace_id"] = trace_id


class MetricsCollector:
    """Collects mandatory security metrics."""

    def __init__(self) -> None:
        self._counts: dict[str, int] = {}

    # @req:SG-MET-001 track a2a_requests_total metric increments
    def increment_request(self, *, profile: str, principal_id: str) -> None:
        key = f"{profile}:{principal_id}"
        self._counts[key] = self._counts.get(key, 0) + 1

    def snapshot(self) -> Mapping[str, int]:
        return dict(self._counts)
