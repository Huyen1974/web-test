resource "google_secret_manager_secret" "qdrant_api" {
  secret_id = "Qdrant_agent_data_N1D8R2vC0_5"

  replication {
    automatic = true
  }

  project = var.project_id
}

resource "google_secret_manager_secret_version" "qdrant_api_v1" {
  secret      = google_secret_manager_secret.qdrant_api.id
  secret_data = var.qdrant_api_key
}
