from datetime import UTC, datetime, timedelta

import pytest

from agent_data.security_governance import RateLimiter, RateLimitExceeded

pytestmark = pytest.mark.unit


def test_quota_headers_event_policy_numeric():
    limiter = RateLimiter(limit=2, window_seconds=5)
    now = datetime.now(UTC)

    result = limiter.check(principal_id="svc-1", tenant_id="tenant-a", now=now)
    headers = result.headers
    assert headers["X-RateLimit-Limit"] == "2"
    assert headers["X-RateLimit-Remaining"] == "1", "# @req:SG-RATE-001"

    limiter.check(principal_id="svc-1", tenant_id="tenant-a", now=now)
    with pytest.raises(RateLimitExceeded) as exc:
        limiter.check(
            principal_id="svc-1", tenant_id="tenant-a", now=now + timedelta(seconds=1)
        )
    assert exc.value.retry_after >= 1
    assert str(exc.value) == "RATE_LIMIT_EXCEEDED"
    state = limiter._state[("svc-1", "tenant-a")]
    assert isinstance(exc.value.retry_after, int)
    assert state["count"] > limiter.limit
