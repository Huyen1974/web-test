import os
import subprocess
import sys
import tempfile
import time

import pytest


@pytest.mark.unit
def test_a2a_communication():
    """Simulate an A2A Pub/Sub exchange using file-based test mode.

    Starts the listener in a subprocess with A2A_TEST_QUEUE_FILE, then runs the
    sender with the same env. Asserts the listener prints the expected message.
    """

    with tempfile.TemporaryDirectory() as tmpdir:
        queue_file = os.path.join(tmpdir, "queue.txt")
        env = os.environ.copy()
        env["A2A_TEST_QUEUE_FILE"] = queue_file

        # Start listener
        listener = subprocess.Popen(
            [sys.executable, "-m", "agent_data.pubsub_listener"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            env=env,
        )

        try:
            # Give listener a moment to initialize
            time.sleep(0.5)

            # Run sender
            sender = subprocess.run(
                [sys.executable, "-m", "agent_data.pubsub_sender"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                env=env,
                timeout=10,
            )
            assert sender.returncode == 0
            assert "SENT: Hello from sender agent!" in sender.stdout

            # Wait up to ~5s for listener to consume and exit
            try:
                out, _ = listener.communicate(timeout=5)
            except subprocess.TimeoutExpired:
                listener.kill()
                out, _ = listener.communicate()

            assert "RECEIVED: Hello from sender agent!" in (out or "")
        finally:
            if listener.poll() is None:
                listener.terminate()
                try:
                    listener.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    listener.kill()

