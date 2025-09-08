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
        # Ingest the document from GCS (async)
        r_ing = requests.post(ingest_url, json={"text": gcs_uri}, timeout=60)
        assert (
            r_ing.status_code == 202
        ), f"Unexpected ingest status: {r_ing.status_code}, body={r_ing.text}"

        # Poll Firestore for metadata completion
        try:
            from google.cloud import firestore  # type: ignore
        except Exception:
            pytest.skip("Firestore client not available in environment")

        db = firestore.Client()  # type: ignore[attr-defined]
        doc_id = "e2e_doc.txt"
        doc_ref = db.collection("metadata_test").document(doc_id)
        deadline = time.time() + 90
        found = False
        while time.time() < deadline:
            doc = doc_ref.get()
            if getattr(doc, "exists", False):
                data = doc.to_dict() or {}
                if data.get("ingestion_status") == "completed":
                    found = True
                    break
            time.sleep(2)
        assert found, "Metadata with status 'completed' not found in time"
    finally:
        # Cleanup uploaded object and Qdrant collection
        subprocess.run(
            [sys.executable, "scripts/e2e_gcs_setup.py", "cleanup"],
            check=False,
            text=True,
        )
        _qdrant_cleanup_collection()
