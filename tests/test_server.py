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


@pytest.mark.unit
@patch("agent_data.server._firestore")
def test_create_document_persists_payload(
    mock_fs: MagicMock, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("API_KEY", "secret")
    client = TestClient(server.app)

    doc_snapshot = MagicMock()
    doc_snapshot.exists = False
    doc_ref = MagicMock()
    doc_ref.get.return_value = doc_snapshot
    mock_fs.return_value.collection.return_value.document.return_value = doc_ref

    payload = {
        "document_id": "doc-123",
        "parent_id": "root",
        "content": {"mime_type": "text/markdown", "body": "# Intro"},
        "metadata": {"title": "Intro Doc", "tags": ["intro"]},
    }

    resp = client.post("/documents", json=payload, headers={"x-api-key": "secret"})

    assert resp.status_code == 200
    doc_ref.set.assert_called_once()
    stored = doc_ref.set.call_args[0][0]
    assert stored["document_id"] == payload["document_id"]
    assert stored["parent_id"] == payload["parent_id"]
    assert stored["content"] == payload["content"]
    assert stored["metadata"]["title"] == "Intro Doc"
    assert stored["is_human_readable"] is False
    assert stored["revision"] == 1
    assert resp.json()["revision"] == 1


@pytest.mark.unit
@patch("agent_data.server._firestore")
def test_create_document_conflict_returns_error(
    mock_fs: MagicMock, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("API_KEY", "secret")
    client = TestClient(server.app)

    doc_snapshot = MagicMock()
    doc_snapshot.exists = True
    doc_ref = MagicMock()
    doc_ref.get.return_value = doc_snapshot
    mock_fs.return_value.collection.return_value.document.return_value = doc_ref

    payload = {
        "document_id": "doc-123",
        "parent_id": "root",
        "content": {"mime_type": "text/plain", "body": "Hello"},
        "metadata": {"title": "Hello"},
    }

    resp = client.post("/documents", json=payload, headers={"x-api-key": "secret"})

    assert resp.status_code == 409
    detail = resp.json().get("detail", {})
    assert detail.get("code") == "CONFLICT"
    assert detail.get("details", {}).get("document_id") == "doc-123"


@pytest.mark.unit
@patch("agent_data.server._firestore")
def test_update_document_revision_conflict(
    mock_fs: MagicMock, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("API_KEY", "secret")
    client = TestClient(server.app)

    doc_snapshot = MagicMock()
    doc_snapshot.exists = True
    doc_snapshot.to_dict.return_value = {
        "revision": 5,
        "content": {"mime_type": "text/plain", "body": "Hello"},
        "metadata": {"title": "Hello"},
        "is_human_readable": False,
    }
    doc_ref = MagicMock()
    doc_ref.get.return_value = doc_snapshot
    mock_fs.return_value.collection.return_value.document.return_value = doc_ref

    payload = {
        "document_id": "doc-123",
        "patch": {
            "metadata": {"title": "Hello v2"},
        },
        "update_mask": ["metadata"],
        "last_known_revision": 4,
    }

    resp = client.put(
        "/documents/doc-123",
        json=payload,
        headers={"x-api-key": "secret"},
    )

    assert resp.status_code == 409
    detail = resp.json().get("detail", {})
    assert detail.get("code") == "CONFLICT"
    assert detail.get("details", {}).get("expected_revision") == 4
    assert detail.get("details", {}).get("actual_revision") == 5


@pytest.mark.unit
@patch("agent_data.server._firestore")
def test_delete_document_marks_deleted(
    mock_fs: MagicMock, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("API_KEY", "secret")
    client = TestClient(server.app)

    doc_snapshot = MagicMock()
    doc_snapshot.exists = True
    doc_snapshot.to_dict.return_value = {"revision": 3}
    doc_ref = MagicMock()
    doc_ref.get.return_value = doc_snapshot
    mock_fs.return_value.collection.return_value.document.return_value = doc_ref

    resp = client.delete("/documents/doc-123", headers={"x-api-key": "secret"})

    assert resp.status_code == 200
    assert resp.json()["status"] == "deleted"
    assert resp.json()["revision"] == 4
    doc_ref.update.assert_called_once()
    updates = doc_ref.update.call_args[0][0]
    assert updates["vector_status"] == "deleted"
    assert updates["revision"] == 4
    assert "deleted_at" in updates
