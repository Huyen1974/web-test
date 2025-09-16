import pytest

from agent_data.resilient_ops import (
    ActionProfile,
    AsyncFirstEnforcer,
    AsyncRequirementError,
)

pytestmark = pytest.mark.unit


def test_enforce_over_2s_linter():
    registry = {"long-action": ActionProfile(name="long-action", eta_seconds=3.1)}
    enforcer = AsyncFirstEnforcer(registry)
    with pytest.raises(AsyncRequirementError):
        enforcer.validate("long-action")  # @req:RO-RESP-003


def test_validate_ignores_missing_entries():
    registry = {}
    enforcer = AsyncFirstEnforcer(registry)
    enforcer.validate("unknown")
