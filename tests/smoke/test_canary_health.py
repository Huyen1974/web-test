import os
import pytest
import requests

pytestmark = pytest.mark.smoke


def test_canary_health_endpoint():
    url = os.getenv("CANARY_URL", "").rstrip("/")
    assert url, "CANARY_URL not provided"
    r = requests.get(f"{url}/health", timeout=20)
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "healthy"

