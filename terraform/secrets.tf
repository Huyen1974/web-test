# Secret Manager resources for agent-data-langroid

resource "google_secret_manager_secret" "qdrant_api" {
  secret_id = "Qdrant_agent_data_N1D8R2vC0_5"
  project   = var.project_id

  replication {
    automatic = true
  }

  labels = {
    environment = var.env
    project     = "agent-data-langroid"
    managed_by  = "terraform"
  }
}
