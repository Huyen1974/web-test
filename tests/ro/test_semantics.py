import pytest

from agent_data.resilient_ops import Event, EventLog, EventType

pytestmark = pytest.mark.unit


def test_at_least_once_dedupe_out_of_order_shold_seq_recovery():
    log = EventLog()
    e1 = Event(
        subject="subject",
        event_type=EventType.DONE,
        seq=1,
        idempotency_key="key",
        action_version="1.0.0",
        status="SUCCEEDED",
    )
    assert log.record(e1)
    duplicate = Event(
        subject="subject",
        event_type=EventType.DONE,
        seq=1,
        idempotency_key="key",
        action_version="1.0.0",
    )
    assert not log.record(duplicate), "# @req:RO-SEM-001"
    out_of_order = Event(
        subject="subject",
        event_type=EventType.RUNNING,
        seq=0,
        idempotency_key="key",
        action_version="1.0.0",
    )
    assert not log.record(out_of_order)
    replay = log.replay_done("subject", "key")
    assert replay is e1
