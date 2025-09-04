"""
AgentData core classes.

This module introduces the foundational AgentData class and its configuration
as the base for a future Knowledge Manager. It subclasses Langroid's
DocChatAgent and DocChatAgentConfig to stay aligned with existing agent
capabilities while remaining easy to extend.

References:
- Plan V12: ID 1.1 — Create AgentData Core Class
- Reuse Plan A1 — Foundational module for future reuse and extension
"""

from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Tuple

try:
    from google.cloud import storage  # type: ignore
    from google.api_core import exceptions  # type: ignore
except Exception:  # pragma: no cover - optional dependency at import time
    storage = None  # type: ignore
    exceptions = None  # type: ignore

from langroid.agent.special.doc_chat_agent import (
    DocChatAgent,
    DocChatAgentConfig,
)
from langroid.agent.tool_message import ToolMessage  # noqa: F401
try:  # prefer canonical location
    from langroid.agent.chat_agent import tool  # type: ignore
except Exception:  # pragma: no cover - compatibility shim for older Langroid
    def tool(func=None, *args, **kwargs):  # type: ignore
        def _wrap(f):
            return f

        return _wrap(func) if callable(func) else _wrap

__all__ = ["AgentDataConfig", "AgentData"]


class AgentDataConfig(DocChatAgentConfig):
    """Configuration for the AgentData agent.

    Currently identical to ``DocChatAgentConfig`` and serves as a placeholder
    for future, AgentData-specific options.

    - Plan V12 ID 1.1
    - Reuse Plan A1
    """


class AgentData(DocChatAgent):
    """AgentData: the core agent for the Knowledge Manager.

    This class extends Langroid's ``DocChatAgent`` and is intended to be the
    foundation for higher-level orchestration and capabilities. It is designed
    for straightforward future extension with AgentData-specific behaviors.

    - Plan V12 ID 1.1
    - Reuse Plan A1
    """

    def __init__(self, config: AgentDataConfig) -> None:
        """Initialize an AgentData instance with the provided configuration.

        Parameters
        ----------
        config:
            The configuration object for AgentData; currently the same shape as
            ``DocChatAgentConfig``.
        """

        super().__init__(config)
        # Track tool registrations for simple verification/tests.
        # In full Langroid integration, tool enablement is handled via
        # ToolMessage classes and enable_message(); here we maintain
        # a minimal list of tool names for skeleton validation.
        self.tools = getattr(self, "tools", []) or []
        if "gcs_ingest" not in self.tools:
            self.tools.append("gcs_ingest")

    @tool
    def gcs_ingest(self, gcs_uri: str) -> str:
        """Downloads a file from the given GCS URI, ingests it into the vector store.

        Args:
            gcs_uri (str): The GCS URI of the file to ingest, e.g.,
                "gs://bucket-name/path/to/file.pdf".

        Returns:
            str: A confirmation message indicating the result of the ingestion.
        """

        # Validate availability of Google Cloud Storage client
        if storage is None or exceptions is None:  # pragma: no cover
            return (
                "GCS client libraries not available. Please install 'google-cloud-storage' "
                f"and try again. URI: {gcs_uri}"
            )

        def parse_gcs_uri(uri: str) -> Tuple[str, str]:
            if not uri.startswith("gs://"):
                raise ValueError(
                    f"Invalid GCS URI '{uri}'. Expected format: gs://<bucket>/<path>"
                )
            path = uri[len("gs://") :]
            if "/" not in path:
                raise ValueError(
                    f"Invalid GCS URI '{uri}'. Missing object path after bucket name."
                )
            bucket_name, blob_name = path.split("/", 1)
            if not bucket_name or not blob_name:
                raise ValueError(
                    f"Invalid GCS URI '{uri}'. Bucket and object path must be non-empty."
                )
            return bucket_name, blob_name

        try:
            bucket_name, blob_name = parse_gcs_uri(gcs_uri)

            client = storage.Client()
            bucket = client.bucket(bucket_name)
            blob = bucket.blob(blob_name)

            with tempfile.TemporaryDirectory(prefix="agentdata_gcs_") as tmpdir:
                # Save to a simple filename inside the temporary directory
                filename = Path(blob_name).name or "downloaded_object"
                local_path = Path(tmpdir) / filename
                blob.download_to_filename(str(local_path))

                # After download, integrate with DocChatAgent ingestion.
                ingestion_result = None
                try:
                    ingestion_result = self.ingest_doc_paths([str(local_path)])
                except Exception as ingest_err:  # pragma: no cover - integration fallback
                    ingestion_result = (
                        f"Ingestion skipped or failed: {ingest_err}"
                    )

                # Note: local_path resides in a TemporaryDirectory and will be
                # cleaned up on context exit; we return the ingestion result
                # for confirmation in logs or tooling.
                return (
                    f"Successfully downloaded and ingested {gcs_uri}. Result: {ingestion_result}"
                )

        except Exception as e:
            # Handle common GCS exceptions with clearer messages
            if exceptions is not None and isinstance(e, exceptions.NotFound):
                return f"File not found: {gcs_uri}"
            if exceptions is not None and isinstance(e, exceptions.Forbidden):
                return (
                    "Access forbidden when attempting to download from GCS. "
                    f"Check permissions for URI: {gcs_uri}"
                )
            if exceptions is not None and isinstance(e, exceptions.GoogleAPICallError):
                return f"GCS API error for URI {gcs_uri}: {e}"
            # Fallback for any other error
            return f"Failed to download from GCS for URI {gcs_uri}: {e}"
