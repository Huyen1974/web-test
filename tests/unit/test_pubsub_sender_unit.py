from __future__ import annotations

import os
import tempfile

import pytest


@pytest.mark.unit
def test_pubsub_sender_writes_to_file_and_prints(capsys, monkeypatch):
    # Arrange: set test-mode via env
    with tempfile.TemporaryDirectory() as tmpdir:
        queue_file = os.path.join(tmpdir, "queue.txt")
        monkeypatch.setenv("A2A_TEST_QUEUE_FILE", queue_file)

        # Act
        from agent_data import pubsub_sender

        pubsub_sender.main()

        # Assert file contents
        with open(queue_file, encoding="utf-8") as f:
            content = f.read()
        assert "Hello from sender agent!" in content

        # Assert printed output
        out = capsys.readouterr().out
        assert "SENT: Hello from sender agent!" in out

