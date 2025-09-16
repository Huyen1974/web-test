import random

import pytest

from agent_data.security_governance import DeadLetterQueue

pytestmark = pytest.mark.unit


def test_retry6_redrive_audit_record():
    dlq = DeadLetterQueue(jitter=random.Random(1))
    delays = [dlq.schedule_retry(i) for i in range(1, dlq.retry_attempts + 1)]
    assert len(delays) == 6, "# @req:SG-DLQ-001"
    assert all(delay > 0 for delay in delays)

    with pytest.raises(ValueError):
        dlq.schedule_retry(0)

    record = dlq.redrive(actor="ops", reason="manual", count=3)
    assert record["actor"] == "ops"
    assert dlq.audit_log[-1]["reason"] == "manual"
