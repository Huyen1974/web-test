import pytest

from agent_data.security_governance import propagate_trace_id

pytestmark = pytest.mark.unit


def test_trace_propagation():
    envelope = {"trace_id": "trace-123"}
    event = {}
    propagate_trace_id(envelope, event)
    assert event["trace_id"] == "trace-123", "# @req:SG-OBS-001"

    with pytest.raises(ValueError):
        propagate_trace_id({}, event)
