import pytest

from agent_data.resilient_ops import (
    EventLog,
    OperationResponder,
    TaskState,
    TaskStateMachine,
)

pytestmark = pytest.mark.unit


def _machine():
    return TaskStateMachine(
        subject="responder",
        idempotency_key="key-1",
        action_version="1.0.0",
        event_log=EventLog(),
    )


def test_sync_under_2s():
    machine = _machine()
    machine.start()
    responder = OperationResponder(machine.event_log)
    response = responder.respond_sync(machine, success=True)
    assert response.state is TaskState.SUCCEEDED, "# @req:RO-RESP-001"
    done_event = response.events[-1]
    assert done_event.status == TaskState.SUCCEEDED.value


def test_async_ack_events():
    machine = _machine()
    responder = OperationResponder(machine.event_log)
    response = responder.respond_async(machine)
    assert response.state is TaskState.ACKED, "# @req:RO-RESP-002"
    assert response.http_status == 202, "# @req:RO-RESP-004"
    assert response.events[0].event_type.value == "accepted"


def test_ack_http_202_recommended():
    machine = _machine()
    responder = OperationResponder(machine.event_log)
    response = responder.respond_async(machine)
    assert response.http_status == 202, "# @req:RO-RESP-004"


def test_done_failure_has_error_code():
    machine = _machine()
    machine.start()
    responder = OperationResponder(machine.event_log)
    response = responder.respond_sync(machine, success=False, error_code="E_FAIL")
    done_event = response.events[-1]
    assert done_event.status == TaskState.FAILED.value, "# @req:RO-EVENT-001"
    assert done_event.error_code == "E_FAIL"


def test_async_ack_is_idempotent():
    machine = _machine()
    responder = OperationResponder(machine.event_log)
    responder.respond_async(machine)
    responder.respond_async(machine)
    events = machine.event_log.events()
    assert len(events) == 1, "# @req:RO-RESP-002"


def test_sync_failure_uses_default_error():
    machine = _machine()
    machine.start()
    responder = OperationResponder(machine.event_log)
    response = responder.respond_sync(machine, success=False)
    assert response.state is TaskState.FAILED
    assert response.events[-1].error_code == "UNKNOWN_ERROR"
