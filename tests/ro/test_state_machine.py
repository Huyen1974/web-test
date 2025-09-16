import pytest

from agent_data.resilient_ops import EventLog, TaskState, TaskStateMachine

pytestmark = pytest.mark.unit


def _machine():
    return TaskStateMachine(
        subject="demo.subject",
        idempotency_key="idem-1",
        action_version="1.0.0",
        event_log=EventLog(),
    )


def test_overall_refinement():
    machine = _machine()
    machine.start()
    with pytest.raises(ValueError):
        machine.start()
    machine.succeed()
    events = machine.event_log.events()
    assert [e.event_type.value for e in events] == [
        "running",
        "done",
    ], "# @req:RO-STM-001"
    assert machine.state is TaskState.SUCCEEDED


def test_transitions():
    machine = _machine()
    machine.start()
    machine.fail("TIMEOUT")
    done_event = machine.event_log.events()[-1]
    assert done_event.status == TaskState.FAILED.value, "# @req:RO-STM-002"
    assert done_event.error_code == "TIMEOUT"
    machine2 = _machine()
    with pytest.raises(ValueError):
        machine2.succeed()
