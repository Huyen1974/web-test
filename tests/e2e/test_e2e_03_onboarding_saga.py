import random

import pytest

from agent_data.resilient_ops import EventLog, TaskState, TaskStateMachine
from agent_data.security_governance import (
    DeadLetterQueue,
    JWSVerifier,
    MessageIntegrityVerifier,
    MetricsCollector,
    RateLimiter,
    RateLimitExceeded,
    SecurityProfiles,
)

pytestmark = pytest.mark.e2e


def test_e2e_03_onboarding_saga():
    profiles = SecurityProfiles(internal_qps=200, external_qps=40)
    assert profiles.requires_jws("A2A-External")

    machine = TaskStateMachine(
        subject="onboarding",
        idempotency_key="req-onboard",
        action_version="1.0.0",
        event_log=EventLog(),
    )
    machine.start()
    machine.mark_side_effects()
    machine.succeed()
    assert machine.state is TaskState.SUCCEEDED
    events = machine.event_log.events()
    assert events[-1].status == TaskState.SUCCEEDED.value

    verifier = MessageIntegrityVerifier(JWSVerifier())
    jws_payload = {"stage": "onboarding", "status": "ready"}
    compact = verifier.jws_verifier.build(
        jws_payload, kid="kid-onboard", key=b"onboard"
    )
    parsed = verifier.verify_before_enqueue(
        {"jws": compact}, {"kid-onboard": b"onboard"}
    )
    assert parsed["status"] == "ready"

    limiter = RateLimiter(limit=1, window_seconds=60)
    limiter.check(principal_id="new-user", tenant_id="tenant-new")
    with pytest.raises(RateLimitExceeded):
        limiter.check(principal_id="new-user", tenant_id="tenant-new")

    dlq = DeadLetterQueue(jitter=random.Random(5))
    retries = [dlq.schedule_retry(i) for i in range(1, 4)]
    assert retries[0] < retries[1] < retries[2]
    record = dlq.redrive(actor="automation", reason="cleanup", count=2)
    assert record["actor"] == "automation"

    metrics = MetricsCollector()
    metrics.increment_request(profile="A2A-External", principal_id="new-user")
    metrics.increment_request(profile="A2A-External", principal_id="new-user")
    assert metrics.snapshot()["A2A-External:new-user"] == 2
