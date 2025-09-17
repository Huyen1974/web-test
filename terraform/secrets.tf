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

resource "random_password" "agent_data_api_key" {
  length  = 48
  special = false
}

resource "google_secret_manager_secret" "agent_data_api_key" {
  secret_id = "AGENT_DATA_API_KEY"
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

resource "google_secret_manager_secret_version" "agent_data_api_key" {
  secret      = google_secret_manager_secret.agent_data_api_key.id
  secret_data = random_password.agent_data_api_key.result
}
