#!/usr/bin/env python3
"""
E2E GCS Setup Script

Usage:
  python scripts/e2e_gcs_setup.py upload   # Upload the E2E fixture to GCS
  python scripts/e2e_gcs_setup.py cleanup  # Delete the uploaded fixture from GCS

Credentials:
  Uses Application Default Credentials. Ensure your environment provides
  GCP auth (e.g., GOOGLE_APPLICATION_CREDENTIALS, Workload Identity, etc.).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from google.cloud import storage  # type: ignore
    from google.api_core import exceptions  # type: ignore
except Exception as e:  # pragma: no cover - import-time availability check
    print(
        "ERROR: google-cloud-storage is required. Install with: pip install google-cloud-storage",
        file=sys.stderr,
    )
    raise


BUCKET_NAME = "huyen1974-agent-data-knowledge-test"
# Blob name in the bucket
BLOB_NAME = "e2e_doc.txt"

# Project-root-relative path to the local fixture
FIXTURE_PATH = Path(__file__).resolve().parents[1] / "agent_data" / "fixtures" / "e2e_doc.txt"


def upload() -> int:
    print(f"Preparing to upload fixture to GCS bucket '{BUCKET_NAME}'...")
    if not FIXTURE_PATH.exists():
        print(f"ERROR: Fixture file not found at {FIXTURE_PATH}", file=sys.stderr)
        return 2

    try:
        client = storage.Client()
        bucket = client.bucket(BUCKET_NAME)
        blob = bucket.blob(BLOB_NAME)

        print(f"Uploading {FIXTURE_PATH} to gs://{BUCKET_NAME}/{BLOB_NAME} ...")
        blob.upload_from_filename(str(FIXTURE_PATH))
        print("Upload completed successfully.")
        print(f"GCS URI: gs://{BUCKET_NAME}/{BLOB_NAME}")
        return 0
    except exceptions.GoogleAPICallError as e:  # pragma: no cover
        print(f"ERROR: Google API error during upload: {e}", file=sys.stderr)
        return 1
    except Exception as e:  # pragma: no cover
        print(f"ERROR: Unexpected error during upload: {e}", file=sys.stderr)
        return 1


def cleanup() -> int:
    print(f"Preparing to delete fixture from GCS bucket '{BUCKET_NAME}'...")
    try:
        client = storage.Client()
        bucket = client.bucket(BUCKET_NAME)
        blob = bucket.blob(BLOB_NAME)

        print(f"Deleting gs://{BUCKET_NAME}/{BLOB_NAME} ...")
        blob.delete()
        print("Cleanup completed successfully.")
        return 0
    except exceptions.NotFound:
        print("Nothing to delete: object not found (already removed).")
        return 0
    except exceptions.GoogleAPICallError as e:  # pragma: no cover
        print(f"ERROR: Google API error during cleanup: {e}", file=sys.stderr)
        return 1
    except Exception as e:  # pragma: no cover
        print(f"ERROR: Unexpected error during cleanup: {e}", file=sys.stderr)
        return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="E2E GCS fixture manager")
    parser.add_argument("action", choices=["upload", "cleanup"], help="Action to perform")
    args = parser.parse_args(argv)

    if args.action == "upload":
        return upload()
    return cleanup()


if __name__ == "__main__":
    raise SystemExit(main())
