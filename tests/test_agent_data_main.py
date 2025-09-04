from unittest.mock import MagicMock, patch

import pytest
from google.api_core import exceptions

from agent_data.main import AgentData, AgentDataConfig


@pytest.mark.unit
def test_agent_data_instantiation():
    """Basic instantiation test for AgentData core class.

    Ensures that an AgentData instance can be created from a default
    AgentDataConfig, and the resulting object is an instance of AgentData.
    """

    cfg = AgentDataConfig()
    # Avoid external dependencies during unit test
    # by disabling vector store initialization
    cfg.vecdb = None
    agent = AgentData(cfg)
    assert isinstance(agent, AgentData)


@pytest.mark.unit
def test_agent_data_config_handling():
    """Ensure AgentData preserves provided config attributes.

    We mock key config attributes to avoid external dependencies and
    verify they are retained on the instantiated AgentData.
    """

    cfg = AgentDataConfig()
    # Avoid external services in unit tests
    cfg.vecdb = None
    cfg.llm = None

    agent = AgentData(cfg)

    assert agent.config is cfg
    assert getattr(agent.config, "vecdb", "__missing__") is None
    assert getattr(agent.config, "llm", "__missing__") is None


@pytest.mark.unit
def test_gcs_ingest_is_registered_tool():
    """Verify the gcs_ingest tool is registered and callable.

    Ensures that the AgentData instance exposes the tool name in a tools
    collection for simple discovery, and that calling the tool method returns
    the expected placeholder message containing the input URI.
    """

    cfg = AgentDataConfig()
    cfg.vecdb = None

    agent = AgentData(cfg)

    # Verify tool registration list contains our tool
    assert hasattr(agent, "tools"), "Agent should expose a tools collection"
    assert "gcs_ingest" in agent.tools

    # Verify placeholder logic returns the URI
    uri = "gs://fake-bucket/test.pdf"
    result = agent.gcs_ingest(uri)
    assert uri in result


@pytest.mark.unit
@patch("agent_data.main.storage")
def test_gcs_ingest_download_success(
    mock_storage: MagicMock, monkeypatch: pytest.MonkeyPatch
):
    """Mock a successful GCS download via storage.Client and ensure it's called."""

    # Arrange: mock storage client, bucket, and blob
    mock_client = MagicMock()
    mock_bucket = MagicMock()
    mock_blob = MagicMock()

    mock_storage.Client.return_value = mock_client
    mock_client.bucket.return_value = mock_bucket
    mock_bucket.blob.return_value = mock_blob

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    # Act + Assert within patched ingest_doc_paths
    # Ensure caching path executes by faking file reads to return content
    monkeypatch.setattr(
        "pathlib.Path.read_text", lambda self, **kwargs: "Framework text"
    )

    with patch.object(
        agent, "ingest_doc_paths", return_value="Mock ingestion result."
    ) as mock_ingest:
        uri = "gs://test-bucket/test.txt"
        result = agent.gcs_ingest(uri)

        # Ensure download and ingestion were invoked
        mock_blob.download_to_filename.assert_called_once()
        mock_ingest.assert_called_once()

        # Result should include mocked ingestion output
        assert "Mock ingestion result." in result
        # last_ingested_text should be set from our fake content
        assert agent.last_ingested_text == "Framework text"


@pytest.mark.unit
@patch("agent_data.main.storage")
def test_gcs_ingest_handles_not_found_error(mock_storage: MagicMock):
    """Ensure NotFound errors are translated into a friendly message."""

    mock_client = MagicMock()
    mock_bucket = MagicMock()
    mock_blob = MagicMock()

    mock_storage.Client.return_value = mock_client
    mock_client.bucket.return_value = mock_bucket
    mock_bucket.blob.return_value = mock_blob

    # Configure the blob to raise NotFound from google.api_core.exceptions
    mock_blob.download_to_filename.side_effect = exceptions.NotFound("not found")

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    uri = "gs://test-bucket/missing.txt"
    result = agent.gcs_ingest(uri)

    assert "File not found" in result


@pytest.mark.unit
def test_gcs_ingest_missing_client_libraries(monkeypatch: pytest.MonkeyPatch):
    """When GCS client libs are unavailable, method returns helpful message."""

    import agent_data.main as adm

    # Simulate unavailable google-cloud libraries
    monkeypatch.setattr(adm, "storage", None, raising=False)
    monkeypatch.setattr(adm, "exceptions", None, raising=False)

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    res = agent.gcs_ingest("gs://bucket/obj.txt")
    assert "GCS client libraries not available" in res


@pytest.mark.unit
@patch("agent_data.main.storage")
def test_gcs_ingest_handles_forbidden_error(mock_storage: MagicMock):
    """Ensure Forbidden errors produce an access message."""

    mock_client = MagicMock()
    mock_bucket = MagicMock()
    mock_blob = MagicMock()
    mock_storage.Client.return_value = mock_client
    mock_client.bucket.return_value = mock_bucket
    mock_bucket.blob.return_value = mock_blob

    mock_blob.download_to_filename.side_effect = exceptions.Forbidden("forbidden")

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    res = agent.gcs_ingest("gs://bucket/protected.txt")
    assert "Access forbidden" in res


@pytest.mark.unit
def test_gcs_ingest_invalid_uri_returns_failure_message():
    """Invalid URI should be handled and return a failure message."""

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    res = agent.gcs_ingest("http://not-a-gcs-uri")
    assert "Failed to download" in res


@pytest.mark.unit
def test_gcs_ingest_invalid_uri_missing_object_path():
    """URI missing object path should be handled with failure message."""

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    res = agent.gcs_ingest("gs://bucket-only")
    assert "Failed to download" in res


@pytest.mark.unit
def test_gcs_ingest_invalid_uri_empty_blob():
    """URI with empty blob path should be handled with failure message."""

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    res = agent.gcs_ingest("gs://bucket/")
    assert "Failed to download" in res


# ==== Firestore tool skeleton tests ====


@pytest.mark.unit
@patch("agent_data.main.firestore")
def test_add_metadata_tool_calls_firestore(mock_firestore: MagicMock):
    """Ensure add_metadata parses JSON and calls Firestore .set with dict."""

    # Arrange Firestore mock chain
    client = mock_firestore.Client.return_value
    coll = client.collection.return_value
    doc_ref = coll.document.return_value

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    # Act
    result = agent.add_metadata(document_id="doc1", metadata_json='{"data":"test"}')

    # Assert
    assert "saved" in result
    doc_ref.set.assert_called_once_with({"data": "test"})


@pytest.mark.unit
@patch("agent_data.main.firestore")
def test_get_metadata_tool_returns_json(mock_firestore: MagicMock):
    """Ensure get_metadata returns JSON from Firestore doc."""

    client = mock_firestore.Client.return_value
    coll = client.collection.return_value
    doc_ref = coll.document.return_value
    # Mock a document snapshot
    doc = MagicMock()
    doc.exists = True
    doc.to_dict.return_value = {"data": "mock_value"}
    doc_ref.get.return_value = doc

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    out = agent.get_metadata("doc1")
    assert out == '{"data": "mock_value"}' or out == '{"data":"mock_value"}'


@pytest.mark.unit
@patch("agent_data.main.firestore")
def test_get_metadata_tool_not_found(mock_firestore: MagicMock):
    """Ensure get_metadata returns not-found when doc does not exist."""

    client = mock_firestore.Client.return_value
    coll = client.collection.return_value
    doc_ref = coll.document.return_value
    doc = MagicMock()
    doc.exists = False
    doc_ref.get.return_value = doc

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    out = agent.get_metadata("doc1")
    assert "Metadata not found" in out


@pytest.mark.unit
@patch("agent_data.main.firestore")
def test_update_status_tool_calls_firestore(mock_firestore: MagicMock):
    """Ensure update_ingestion_status calls Firestore .update with correct dict."""

    client = mock_firestore.Client.return_value
    coll = client.collection.return_value
    doc_ref = coll.document.return_value

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    out = agent.update_ingestion_status(document_id="doc1", status="completed")
    assert "updated to 'completed'" in out
    doc_ref.update.assert_called_once_with({"ingestion_status": "completed"})


@pytest.mark.unit
@patch("agent_data.main.storage")
def test_gcs_ingest_handles_api_error(mock_storage: MagicMock):
    """Simulate a generic Google API error during download."""

    mock_client = MagicMock()
    mock_bucket = MagicMock()
    mock_blob = MagicMock()

    mock_storage.Client.return_value = mock_client
    mock_client.bucket.return_value = mock_bucket
    mock_bucket.blob.return_value = mock_blob

    mock_blob.download_to_filename.side_effect = exceptions.GoogleAPICallError("boom")

    cfg = AgentDataConfig()
    cfg.vecdb = None
    agent = AgentData(cfg)

    res = agent.gcs_ingest("gs://bucket/file.txt")
    assert "GCS API error" in res
