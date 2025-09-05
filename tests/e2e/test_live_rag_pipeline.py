import os
import subprocess
import sys
import time

import pytest
import requests


pytestmark = pytest.mark.e2e


def _get_cloud_run_url() -> str:
    project = os.getenv("GCP_PROJECT_ID", "github-chatgpt-ggcloud")
    region = os.getenv("GCP_REGION", "asia-southeast1")
    service = os.getenv("GCP_RUN_SERVICE", "agent-data-test")
    cmd = [
        "gcloud",
        "run",
        "services",
        "describe",
        service,
        "--platform",
        "managed",
        "--region",
        region,
        "--project",
        project,
        "--format",
        "value(status.url)",
    ]
    url = subprocess.check_output(cmd, text=True).strip()
    assert url.startswith("http"), f"Unexpected Cloud Run URL: {url}"
    return url


def _qdrant_cleanup_collection():
    """Best-effort deletion of the test collection in Qdrant.

    Requires env variables `QDRANT_URL` (or `QDRANT_HOST`) and `QDRANT_API_KEY`.
    Skips silently if not provided.
    """
    try:
        from qdrant_client import QdrantClient  # type: ignore
    except Exception:
        return

    url = os.getenv("QDRANT_URL") or os.getenv("QDRANT_HOST")
    api_key = os.getenv("QDRANT_API_KEY")
    if not url or not api_key:
        return
    try:
        client = QdrantClient(url=url, api_key=api_key, prefer_grpc=False)
        client.delete_collection("test_documents")
    except Exception:
        # Ignore cleanup errors in best-effort teardown
        pass


@pytest.mark.skipif(
    not os.getenv("E2E_LIVE_ENABLE"), reason="Live E2E disabled (set E2E_LIVE_ENABLE=1)"
)
def test_full_rag_pipeline():
    bucket = "huyen1974-agent-data-knowledge-test"
    blob = "e2e_doc.txt"
    gcs_uri = f"gs://{bucket}/{blob}"

    # Upload fixture
    subprocess.run(
        [sys.executable, "scripts/e2e_gcs_setup.py", "upload"],
        check=True,
        text=True,
    )

    try:
        base_url = _get_cloud_run_url().rstrip("/")
        ingest_url = f"{base_url}/ingest"
        chat_url = f"{base_url}/chat"

        # Ingest the document from GCS
        r_ing = requests.post(ingest_url, json={"text": gcs_uri}, timeout=60)
        assert (
            r_ing.status_code == 200
        ), f"Unexpected ingest status: {r_ing.status_code}, body={r_ing.text}"

        # Give vectorization/indexing time to complete
        time.sleep(5)

        # Query about the document content
        question = {
            "text": "What does the document say about the Langroid framework?",
        }
        r_chat = requests.post(chat_url, json=question, timeout=60)
        assert (
            r_chat.status_code == 200
        ), f"Unexpected chat status: {r_chat.status_code}, body={r_chat.text}"
        content = (r_chat.json() or {}).get("content", "")
        assert "framework" in content.lower(), f"Unexpected answer: {content}"
    finally:
        # Cleanup uploaded object and Qdrant collection
        subprocess.run(
            [sys.executable, "scripts/e2e_gcs_setup.py", "cleanup"],
            check=False,
            text=True,
        )
        _qdrant_cleanup_collection()

