from unittest.mock import MagicMock, patch

import pytest

from agent_data.main import AgentData, AgentDataConfig


@pytest.mark.unit
@patch("agent_data.main.firestore.Client")
def test_add_metadata_success(mock_client_cls: MagicMock):
    client = mock_client_cls.return_value
    coll = client.collection.return_value
    doc = coll.document.return_value

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    out = agent.add_metadata("doc1", "{\"k\": \"v\"}")
    assert "saved" in out
    doc.set.assert_called_once_with({"k": "v"})


@pytest.mark.unit
@patch("agent_data.main.firestore.Client")
def test_get_metadata_found(mock_client_cls: MagicMock):
    client = mock_client_cls.return_value
    coll = client.collection.return_value
    doc_ref = coll.document.return_value
    snap = MagicMock()
    snap.exists = True
    snap.to_dict.return_value = {"data": "mock"}
    doc_ref.get.return_value = snap

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    res = agent.get_metadata("docX")
    assert res == '{"data": "mock"}' or res == '{"data":"mock"}'


@pytest.mark.unit
@patch("agent_data.main.firestore.Client")
def test_get_metadata_not_found(mock_client_cls: MagicMock):
    client = mock_client_cls.return_value
    coll = client.collection.return_value
    doc_ref = coll.document.return_value
    snap = MagicMock()
    snap.exists = False
    doc_ref.get.return_value = snap

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    res = agent.get_metadata("docY")
    assert "not found" in res.lower()


@pytest.mark.unit
@patch("agent_data.main.firestore.Client")
def test_update_status_success(mock_client_cls: MagicMock):
    client = mock_client_cls.return_value
    coll = client.collection.return_value
    doc = coll.document.return_value

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    res = agent.update_ingestion_status("docZ", "completed")
    assert "updated" in res and "completed" in res
    doc.update.assert_called_once_with({"ingestion_status": "completed"})


@pytest.mark.unit
@patch("agent_data.main.AgentData.add_metadata")
@patch("langroid.agent.special.doc_chat_agent.DocChatAgent.ingest_doc_paths")
def test_ingest_override_calls_add_metadata(
    mock_super_ingest: MagicMock, mock_add_metadata: MagicMock
):
    mock_super_ingest.return_value = "OK"
    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    paths = ["/tmp/a.txt", "/tmp/b.pdf"]
    msg = agent.ingest_doc_paths(paths)
    mock_super_ingest.assert_called_once()
    assert mock_add_metadata.call_count == len(paths)
    assert "Ingestion complete." in msg

