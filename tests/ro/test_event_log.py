import pytest

from agent_data.resilient_ops import Event, EventLog, EventType

pytestmark = pytest.mark.unit


def test_event_log_major_regression_rejected():
    log = EventLog()
    e1 = Event(
        subject="demo",
        event_type=EventType.RUNNING,
        seq=5,
        idempotency_key="k",
        action_version="2.0.0",
    )
    assert log.record(e1)
    old = Event(
        subject="demo",
        event_type=EventType.DONE,
        seq=3,
        idempotency_key="k",
        action_version="1.0.0",
    )
    assert not log.record(old), "# @req:RO-SEM-001"
    assert log.replay_done("demo", "missing") is None
    assert log.events()[0] is e1


def test_event_log_handles_invalid_version():
    log = EventLog()
    event = Event(
        subject="sub",
        event_type=EventType.RUNNING,
        seq=1,
        idempotency_key="k",
        action_version="invalid",
    )
    assert log.record(event)
