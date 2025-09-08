import time

import pytest
from fastapi.testclient import TestClient

import agent_data.server as server


pytestmark = pytest.mark.e2e


def test_multi_turn_session_memory():
    app = server.app
    client = TestClient(app)

    # start a session implicitly
    r1 = client.post(
        "/chat", json={"text": "What does the document say about Langroid?"}
    )
    assert r1.status_code == 200
    body1 = r1.json()
    sess = body1.get("session_id")
    assert sess and isinstance(sess, str)
    assert "response" in body1

    # follow-up question in the same session, expecting contextual answer
    r2 = client.post(
        "/chat",
        json={
            "text": "Can you summarize it again in one sentence?",
            "session_id": sess,
        },
    )
    assert r2.status_code == 200
    body2 = r2.json()
    assert body2.get("session_id") == sess
    assert (
        "langroid" in body2.get("response", "").lower()
        or "framework" in body2.get("response", "").lower()
    )
