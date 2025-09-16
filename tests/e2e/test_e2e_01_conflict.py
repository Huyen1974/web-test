import pytest

from agent_data.resilient_ops import EventLog, TaskState, TaskStateMachine

pytestmark = pytest.mark.e2e


def test_e2e_01_conflict_detection():
    machine = TaskStateMachine(
        subject="draft-001",
        idempotency_key="req-1",
        action_version="1.0.0",
        event_log=EventLog(),
    )

    machine.start()
    with pytest.raises(ValueError):
        machine.start()

    machine.fail("CONFLICT")
    events = machine.event_log.events()
    assert [event.event_type.value for event in events] == ["running", "done"]
    assert events[-1].error_code == "CONFLICT"
    assert events[-1].status == TaskState.FAILED.value
    replayed = machine.event_log.replay_done("draft-001", "req-1")
    assert replayed is events[-1]
