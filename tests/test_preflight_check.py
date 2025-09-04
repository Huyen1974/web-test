from unittest.mock import patch

import pytest

from scripts.preflight_check import main as preflight_main
from scripts.preflight_check import preflight_check


@pytest.mark.unit
def test_preflight_success(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("GCP_PROJECT_ID", "proj-123")
    monkeypatch.setenv("GCP_SERVICE_ACCOUNT", "sa@proj.iam.gserviceaccount.com")
    monkeypatch.setenv(
        "GCP_WIF_PROVIDER",
        "projects/123/locations/global/workloadIdentityPools/pool/providers/provider",
    )

    ok, missing = preflight_check()
    assert ok is True
    assert missing == []
    # main() should return 0
    with patch("builtins.print"):
        assert preflight_main() == 0


@pytest.mark.unit
def test_preflight_missing_var(monkeypatch: pytest.MonkeyPatch):
    # Only set two of the required variables
    monkeypatch.delenv("GCP_PROJECT_ID", raising=False)
    monkeypatch.setenv("GCP_SERVICE_ACCOUNT", "sa@proj.iam.gserviceaccount.com")
    monkeypatch.setenv("GCP_WIF_PROVIDER", "projects/.../providers/provider")

    ok, missing = preflight_check()
    assert ok is False
    assert "GCP_PROJECT_ID" in missing
    # main() should return non-zero
    with patch("builtins.print"):
        assert preflight_main() == 1
