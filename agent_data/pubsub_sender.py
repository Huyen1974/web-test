"""Pub/Sub Task Sender Skeleton for AgentData (ID 5.2).

Sends a simple text message to the A2A Pub/Sub topic using Langroid Task.
Includes a lightweight test-mode that writes the message to a file path
specified by A2A_TEST_QUEUE_FILE environment variable (for CI environments
without GCP access).
"""

from __future__ import annotations

import os

try:
    from langroid import Task  # type: ignore
except Exception:  # pragma: no cover - optional at import time
    Task = None  # type: ignore


def main() -> None:
    message = "Hello from sender agent!"

    # Test-mode: write to a file instead of Pub/Sub
    queue_file = os.environ.get("A2A_TEST_QUEUE_FILE")
    if queue_file:
        # Append to keep simple; listener reads entire file content
        with open(queue_file, "a", encoding="utf-8") as f:
            f.write(message)
        print(f"SENT: {message}")
        return

    if Task is None:
        raise RuntimeError("Langroid Task not available; ensure langroid is installed.")

    topic = "projects/github-chatgpt-ggcloud/topics/agent-data-tasks-test"
    task = Task(name="AgentData-Sender")
    task.run(message, send_to_topic=topic)


if __name__ == "__main__":
    main()

