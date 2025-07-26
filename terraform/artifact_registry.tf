# Artifact Registry for Docker images
resource "google_artifact_registry_repository" "agent_data_docker_repo" {
  project       = var.project_id
  location      = var.region
  repository_id = "agent-data-${var.env}"
  description   = "Agent Data ${title(var.env)} Docker Repository"
  format        = "DOCKER"

  labels = {
    environment = var.env
    project     = "agent-data-langroid"
    managed_by  = "terraform"
  }
}
