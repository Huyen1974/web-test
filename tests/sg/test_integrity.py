import json

import pytest

from agent_data.security_governance import (
    JWSValidationError,
    JWSVerifier,
    MessageIntegrityVerifier,
    _b64url_decode,
    _b64url_encode,
)

pytestmark = pytest.mark.unit


def test_jws_verify_enqueue_allowlist():
    verifier = MessageIntegrityVerifier(JWSVerifier())
    payload = {"msg": "hello"}
    compact = verifier.jws_verifier.build(payload, kid="key1", key=b"shared-secret")
    parsed = verifier.verify_before_enqueue(
        {"jws": compact}, {"key1": b"shared-secret"}
    )
    assert parsed["msg"] == "hello", "# @req:SG-INT-001"

    tampered = compact.rsplit(".", 1)[0] + ".invalid"
    with pytest.raises(JWSValidationError):
        verifier.verify_before_enqueue({"jws": tampered}, {"key1": b"shared-secret"})

    header_b64, payload_b64, signature_b64 = compact.split(".")
    bad_header = json.loads(_b64url_decode(header_b64))
    bad_header["alg"] = "HS256"
    bad_header_b64 = _b64url_encode(json.dumps(bad_header).encode("utf-8"))
    bad_token = "".join([bad_header_b64, ".", payload_b64, ".", signature_b64])
    with pytest.raises(JWSValidationError):
        verifier.verify_before_enqueue({"jws": bad_token}, {"key1": b"shared-secret"})
