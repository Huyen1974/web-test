// Pub/Sub topic for Agent-to-Agent task messages (ID 5.2)
resource "google_pubsub_topic" "agent_data_tasks_test" {
  name = "agent-data-tasks-test"

  labels = {
    environment = "test"
    service     = "agent-data"
  }
}

