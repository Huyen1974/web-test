from __future__ import annotations

import json
import os
import subprocess
import threading
from pathlib import Path

import pytest

from tests.helpers import temporary_env

try:
    from http.server import BaseHTTPRequestHandler
    from socketserver import TCPServer
except ImportError as exc:  # pragma: no cover - defensive
    raise RuntimeError("HTTP server modules unavailable") from exc


class _CaptureHandler(BaseHTTPRequestHandler):
    server_version = "AgentDataTest/1.0"

    def do_POST(self) -> None:  # noqa: N802 - required by BaseHTTPRequestHandler
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length) if length else b""
        self.server.requests.append(  # type: ignore[attr-defined]
            {
                "path": self.path,
                "headers": {k.lower(): v for k, v in self.headers.items()},
                "body": body.decode("utf-8"),
            }
        )
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok": true}')

    def log_message(self, *_: object) -> None:  # pragma: no cover - silence output
        return


@pytest.mark.unit
def test_save_report_script_posts_valid_payload(tmp_path: Path) -> None:
    repo_root = Path(__file__).resolve().parents[1]
    script_path = repo_root / "scripts" / "client" / "save_report.sh"
    assert script_path.is_file()

    class _Server(TCPServer):
        allow_reuse_address = True

    server = _Server(("127.0.0.1", 0), _CaptureHandler)
    server.requests = []  # type: ignore[attr-defined]

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        port = server.server_address[1]
        report_path = tmp_path / "report.md"
        report_path.write_text(
            "# Weekly Report\nAll systems operational.\n", encoding="utf-8"
        )

        with temporary_env(
            AGENT_DATA_API_KEY="test-secret",
            AGENT_DATA_BASE_URL=f"http://127.0.0.1:{port}",
            AGENT_DATA_REPORT_TAGS="report,qa",
        ):
            result = subprocess.run(
                [str(script_path), "Weekly Status", str(report_path)],
                cwd=repo_root,
                check=False,
                capture_output=True,
                text=True,
            )

        assert result.returncode == 0, f"stdout={result.stdout}\nstderr={result.stderr}"
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()

    assert server.requests, "Expected at least one request"
    request = server.requests[0]
    assert request["path"] == "/documents"
    assert request["headers"].get("x-api-key") == "test-secret"

    payload = json.loads(request["body"])
    assert payload["metadata"]["title"] == "Weekly Status"
    assert payload["parent_id"] == "root"
    assert payload["content"]["mime_type"] == "text/markdown"
    assert "Weekly Report" in payload["content"]["body"]
    assert set(payload["metadata"]["tags"]) == {"report", "qa"}
    assert payload["is_human_readable"] is False


@pytest.mark.unit
def test_save_report_script_fetches_api_key_when_missing(tmp_path: Path) -> None:
    repo_root = Path(__file__).resolve().parents[1]
    script_path = repo_root / "scripts" / "client" / "save_report.sh"

    class _Server(TCPServer):
        allow_reuse_address = True

    server = _Server(("127.0.0.1", 0), _CaptureHandler)
    server.requests = []  # type: ignore[attr-defined]

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        port = server.server_address[1]
        report_path = tmp_path / "report.md"
        report_path.write_text("Report body", encoding="utf-8")

        fake_bin = tmp_path / "bin"
        fake_bin.mkdir()
        gcloud_bin = fake_bin / "gcloud"
        gcloud_bin.write_text("#!/usr/bin/env bash\necho fetched-secret\n")
        gcloud_bin.chmod(0o755)

        with temporary_env(
            AGENT_DATA_API_KEY=None,
            AGENT_DATA_BASE_URL=f"http://127.0.0.1:{port}",
            PATH=f"{fake_bin}:{os.environ['PATH']}",
        ):
            result = subprocess.run(
                [str(script_path), "Title", str(report_path)],
                cwd=repo_root,
                check=False,
                capture_output=True,
                text=True,
            )

        assert result.returncode == 0, result.stderr
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()

    assert server.requests, "Expected a request after secret fetch"
    request = server.requests[0]
    assert request["headers"].get("x-api-key") == "fetched-secret"

    payload = json.loads(request["body"])
    assert payload["is_human_readable"] is False


@pytest.mark.unit
def test_save_report_script_sets_visible_flag(tmp_path: Path) -> None:
    repo_root = Path(__file__).resolve().parents[1]
    script_path = repo_root / "scripts" / "client" / "save_report.sh"

    class _Server(TCPServer):
        allow_reuse_address = True

    server = _Server(("127.0.0.1", 0), _CaptureHandler)
    server.requests = []  # type: ignore[attr-defined]

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        port = server.server_address[1]
        report_path = tmp_path / "report.md"
        report_path.write_text("Visible report", encoding="utf-8")

        with temporary_env(
            AGENT_DATA_API_KEY="visible-secret",
            AGENT_DATA_BASE_URL=f"http://127.0.0.1:{port}",
        ):
            result = subprocess.run(
                [str(script_path), "--visible", "Visible Title", str(report_path)],
                cwd=repo_root,
                check=False,
                capture_output=True,
                text=True,
            )

        assert result.returncode == 0, result.stderr
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()

    assert server.requests, "Expected request when using --visible"
    payload = json.loads(server.requests[0]["body"])
    assert payload["is_human_readable"] is True
