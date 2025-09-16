from datetime import UTC, datetime, timedelta

import pytest

from agent_data.security_governance import JWSValidationError, JWSVerifier

pytestmark = pytest.mark.unit


def test_ed25519_kid_rotate_config_shold():
    verifier = JWSVerifier()
    payload = {"event": "demo"}
    token = verifier.build(payload, kid="kid-1", key=b"secret")
    parsed = verifier.verify(token, {"kid-1": b"secret"})
    assert parsed["event"] == "demo", "# @req:SG-JWS-001"

    with pytest.raises(JWSValidationError):
        verifier.verify(token, {"kid-1": b"other"})

    created = datetime.now(UTC) - timedelta(days=91)
    assert JWSVerifier.should_rotate(created, now=datetime.now(UTC))
