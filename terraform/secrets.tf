# Secret Manager resources for agent-data-langroid

resource "google_secret_manager_secret" "qdrant_api" {
  secret_id = "Qdrant_agent_data_N1D8R2vC0_5"
  project   = var.project_id

  replication {
    user_managed {
      replicas {
        location = "asia-southeast1"
      }
    }
  }

  labels = {
    environment = var.env
    project     = "agent-data-langroid"
    managed_by  = "terraform"
  }
}
