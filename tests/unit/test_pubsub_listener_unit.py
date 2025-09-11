from __future__ import annotations

import os
import tempfile

import pytest


@pytest.mark.unit
def test_pubsub_listener_reads_from_file_and_prints(capsys, monkeypatch):
    # Arrange: prepare a queue file with a message and set env
    with tempfile.TemporaryDirectory() as tmpdir:
        queue_file = os.path.join(tmpdir, "queue.txt")
        with open(queue_file, "w", encoding="utf-8") as f:
            f.write("Hello from sender agent!")

        monkeypatch.setenv("A2A_TEST_QUEUE_FILE", queue_file)

        # Act
        from agent_data import pubsub_listener

        pubsub_listener.main()

        # Assert output includes initialization and receipt
        out = capsys.readouterr().out
        assert "Initializing Pub/Sub task listener..." in out
        assert "RECEIVED: Hello from sender agent!" in out

