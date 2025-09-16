import pytest

from agent_data.resilient_ops import TaskState, state_to_event

pytestmark = pytest.mark.unit


def test_acked_accepted_done_status():
    mapping = {
        TaskState.ACKED: "accepted",
        TaskState.RUNNING: "running",
        TaskState.SUCCEEDED: "done",
        TaskState.FAILED: "done",
        TaskState.CANCELLED: "cancelled",
        TaskState.COMPENSATED: "compensated",
    }
    for state, event in mapping.items():
        assert state_to_event(state).value == event, "# @req:RO-NAME-001"
