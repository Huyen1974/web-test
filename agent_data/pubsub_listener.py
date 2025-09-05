"""Pub/Sub Task Listener Skeleton for AgentData (ID 5.2).

This script initializes the AgentData agent and sets up a Langroid Task
to listen for incoming work on a Google Cloud Pub/Sub topic.

This is a minimal, blocking listener intended for local/manual runs.
Production hardening (graceful shutdown, structured logging, config/env
overrides) can be added in subsequent tasks.
"""

from __future__ import annotations

from agent_data.main import AgentData, AgentDataConfig

try:
    # Langroid Task entry-point for Pub/Sub listen/run
    from langroid import Task  # type: ignore
except Exception:  # pragma: no cover - optional at import time
    Task = None  # type: ignore


def main() -> None:
    print("Initializing Pub/Sub task listener...")

    # Initialize AgentData
    cfg = AgentDataConfig()
    agent = AgentData(cfg)

    # Configure a Task to listen on a Pub/Sub topic
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
