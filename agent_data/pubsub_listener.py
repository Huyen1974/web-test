"""Pub/Sub Task Listener Skeleton for AgentData (ID 5.2).

This script initializes the AgentData agent and sets up a Langroid Task
to listen for incoming work on a Google Cloud Pub/Sub topic.

This is a minimal, blocking listener intended for local/manual runs.
Production hardening (graceful shutdown, structured logging, config/env
overrides) can be added in subsequent tasks.
"""

from __future__ import annotations

import os
import time

from agent_data.main import AgentData, AgentDataConfig

try:
    # Langroid Task entry-point for Pub/Sub listen/run
    from langroid import Task  # type: ignore
except Exception:  # pragma: no cover - optional at import time
    Task = None  # type: ignore


def _file_listen_loop(path: str, timeout_sec: float = 10.0) -> None:
    """Test-mode listener: poll a filesystem 'queue' for a message.

    Prints a line starting with 'RECEIVED:' when a message is available.
    """
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        try:
            with open(path, encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    print(f"RECEIVED: {content}")
                    return
        except FileNotFoundError:
            pass
        time.sleep(0.2)
    print("RECEIVED: <no message>")


def main() -> None:
    print("Initializing Pub/Sub task listener...")

    # Test-mode: listen via file queue if env is set
    queue_file = os.environ.get("A2A_TEST_QUEUE_FILE")
    if queue_file:
        _file_listen_loop(queue_file)
        return

    # Initialize AgentData (only in real Pub/Sub mode)
    cfg = AgentDataConfig()
    agent = AgentData(cfg)

    # Configure a Task to listen on a Pub/Sub topic (real Pub/Sub)
    if Task is None:
        raise RuntimeError("Langroid Task not available; ensure langroid is installed.")

    topic = "projects/github-chatgpt-ggcloud/topics/agent-data-tasks-test"
    task = Task(
        agent,
        name="AgentData-Listener",
        listen_on_topic=topic,
    )

    # Start listening loop (blocking)
    task.run()


if __name__ == "__main__":
    main()
