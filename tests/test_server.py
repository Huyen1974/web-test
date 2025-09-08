from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import agent_data.server as server


@pytest.mark.unit
@patch("agent_data.server.pubsub_v1.PublisherClient")
def test_ingest_publishes_to_pubsub(mock_pub: MagicMock):
    client = TestClient(server.app)
    # Setup mock publish future
    future = MagicMock()
    future.result.return_value = "msg-123"
    mock_pub.return_value.publish.return_value = future

    payload = {"text": "gs://test-bucket/test.pdf"}
    resp = client.post("/ingest", json=payload)

    assert resp.status_code == 202
    mock_pub.assert_called_once()
    # Verify publish invoked with JSON payload containing gcs_uri
    args, kwargs = mock_pub.return_value.publish.call_args
    assert "projects" in args[0] and "/topics/" in args[0]
    sent = kwargs.get("data") or (args[1] if len(args) > 1 else b"")
    assert b"test-bucket/test.pdf" in sent
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
def test_metrics_endpoint_exposes_custom_metrics():
    client = TestClient(server.app)
    resp = client.get("/metrics")
    assert resp.status_code == 200
    body = resp.text or ""
    # Verify our custom metric names are present in exposition
    assert "agent_chat_messages_total" in body
    assert "agent_ingest_success_total" in body
    assert "agent_rag_query_latency_seconds" in body


@pytest.mark.unit
def test_health_endpoint_ok():
    client = TestClient(server.app)
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert {"status", "version", "langroid_available"}.issubset(body.keys())
