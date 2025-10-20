# Artifact Registry for Docker images
resource "google_artifact_registry_repository" "agent_data_docker_repo" {
  project       = var.project_id
  location      = "asia-southeast1"
  repository_id = "web-test"
  description   = "Docker repository for the web-test project"
  format        = "DOCKER"

  labels = {
    environment = var.env
    project     = "web-test"
    managed_by  = "terraform"
  }
}

// Moved to module: modules/cloud_run_service
