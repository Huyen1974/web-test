import pytest

from agent_data.security_governance import SecurityProfiles

pytestmark = pytest.mark.unit


def test_basic_external_throttle():
    profiles = SecurityProfiles(internal_qps=100, external_qps=50)
    basic = profiles.get("A2A-Basic")
    assert basic.qps_limit == 100
    external = profiles.get("A2A-External")
    assert external.requires_jws, "# @req:SG-PROF-001"

    with pytest.raises(KeyError):
        profiles.get("unknown")


def test_external_throttle_config_is_tighter():
    profiles = SecurityProfiles(internal_qps=80, external_qps=20)
    assert profiles.get("A2A-External").qps_limit < profiles.get("A2A-Basic").qps_limit
    assert profiles.requires_jws("A2A-External"), "# @req:SG-PROF-002"

    with pytest.raises(ValueError):
        SecurityProfiles(internal_qps=50, external_qps=60)
