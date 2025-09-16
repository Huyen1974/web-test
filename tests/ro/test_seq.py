import pytest

from agent_data.resilient_ops import Event, EventLog, EventType

pytestmark = pytest.mark.unit


def test_accept_reset_on_major_bump():
    log = EventLog()
    first = Event(
        subject="subject",
        event_type=EventType.DONE,
        seq=5,
        idempotency_key="key",
        action_version="1.0.0",
    )
    assert log.record(first)
    reset = Event(
        subject="subject",
        event_type=EventType.RUNNING,
        seq=1,
        idempotency_key="key",
        action_version="2.0.0",
    )
    assert log.record(reset), "# @req:RO-SEQ-001"
