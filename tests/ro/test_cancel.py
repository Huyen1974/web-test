import pytest

from agent_data.resilient_ops import EventLog, TaskState, TaskStateMachine

pytestmark = pytest.mark.unit


def _machine():
    return TaskStateMachine(
        subject="cancel",
        idempotency_key="cancel-key",
        action_version="1.0.0",
        event_log=EventLog(),
    )


def test_cancel_running_compensate_trigger():
    machine = _machine()
    machine.start()
    machine.mark_side_effects()
    response = machine.cancel()
    assert response.state is TaskState.COMPENSATED, "# @req:RO-CANCEL-001"
    assert response.http_status == 202
    assert response.events[0].event_type.value == "compensated"


def test_idempotency_multiple_noop():
    machine = _machine()
    machine.start()
    first = machine.cancel()
    second = machine.cancel()
    assert first.events, "expect first cancel to emit event"  # @req:RO-CANCEL-002
    assert not second.events
    assert second.http_status == 200


def test_after_done_noop_200_failed():
    machine = _machine()
    machine.start()
    machine.fail("ERR")
    pre_events = list(machine.event_log.events())
    response = machine.cancel()
    assert response.http_status == 200, "# @req:RO-CANCEL-003"
    assert machine.state is TaskState.FAILED
    assert machine.event_log.events() == pre_events


def test_cancel_before_start_without_side_effects():
    machine = _machine()
    response = machine.cancel()
    assert response.state is TaskState.CANCELLED, "# @req:RO-CANCEL-001"
    assert response.events[0].status == TaskState.CANCELLED.value
    assert machine.event_log.events()[0] is response.events[0]
