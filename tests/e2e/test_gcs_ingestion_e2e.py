import os
import subprocess
import time

import pytest
import requests


@pytest.fixture(scope="module")
def setup_and_teardown_gcs():
    # Upload fixture to GCS (best-effort; do not fail test if upload fails)
    subprocess.run(["python", "scripts/e2e_gcs_setup.py", "upload"], check=False)

    # Start API server
    server_process = subprocess.Popen(
        [
            "uvicorn",
            "agent_data.server:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    # Wait for server to boot
    time.sleep(10)

    yield

    # Teardown: terminate server and cleanup GCS
    server_process.terminate()
    subprocess.run(["python", "scripts/e2e_gcs_setup.py", "cleanup"], check=False)


@pytest.mark.unit
@pytest.mark.xfail(reason="Server echo stub not integrated with ingestion yet", strict=False)
def test_full_ingestion_and_query_flow(setup_and_teardown_gcs):
    # Step 1: Ask the server to ingest from GCS
    ingest_uri = "gs://huyen1974-agent-data-knowledge-test/e2e_doc.txt"
    r1 = requests.post(
        "http://127.0.0.1:8000/chat",
        json={"message": f"Please ingest the document from {ingest_uri}"},
        timeout=30,
    )
    assert r1.status_code == 200

    # Step 2: Ask a question about the ingested content
    r2 = requests.post(
        "http://127.0.0.1:8000/chat",
        json={"message": "What does the document say about Langroid?"},
        timeout=30,
    )
    assert r2.status_code == 200

    # Expect the response to mention 'framework' per the fixture content
    body = r2.json()
    # Our server returns {'response': ...}
    content = body.get("response", "")
    assert "framework" in content.lower()
