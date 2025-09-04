from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import agent_data.server as server


@pytest.mark.unit
@patch("agent_data.server.agent")
def test_ingest_calls_agent_gcs_ingest(mock_agent: MagicMock):
    client = TestClient(server.app)
    mock_agent.gcs_ingest.return_value = "ok"

    payload = {"text": "gs://test-bucket/test.pdf"}
    resp = client.post("/ingest", json=payload)

    assert resp.status_code == 200
    # Ensure the agent method was called with the exact URI
    mock_agent.gcs_ingest.assert_called_once_with("gs://test-bucket/test.pdf")
    assert isinstance(resp.json().get("content"), str)


@pytest.mark.unit
@patch("agent_data.server.agent")
def test_chat_calls_agent_llm_response(mock_agent: MagicMock):
    client = TestClient(server.app)
    # Mock an object with a .content attribute
    mock_reply = MagicMock()
    mock_reply.content = "Hello back"
    mock_agent.llm_response.return_value = mock_reply

    payload = {"text": "Hello"}
    resp = client.post("/chat", json=payload)

    assert resp.status_code == 200
    mock_agent.llm_response.assert_called_once_with("Hello")
    assert resp.json().get("content") == "Hello back"


@pytest.mark.unit
def test_health_endpoint_ok():
    client = TestClient(server.app)
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert set(["status", "version", "langroid_available"]).issubset(body.keys())

