import pytest

from agent_data.security_governance import MetricsCollector

pytestmark = pytest.mark.unit


def test_metrics_counter():
    collector = MetricsCollector()
    collector.increment_request(profile="A2A-Basic", principal_id="svc-1")
    collector.increment_request(profile="A2A-Basic", principal_id="svc-1")
    collector.increment_request(profile="A2A-External", principal_id="svc-2")
    snapshot = collector.snapshot()
    assert snapshot["A2A-Basic:svc-1"] == 2, "# @req:SG-MET-001"
    assert snapshot["A2A-External:svc-2"] == 1
