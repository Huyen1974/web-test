# Artifact Registry for Docker images
# Note: The main artifact registry resource is already defined in main.tf
# This file contains additional artifact registry configurations for multi-service stack

# IAM binding for Artifact Registry - Allow GitHub Actions to push images
resource "google_artifact_registry_repository_iam_member" "github_actions_writer" {
  project    = var.project_id
  location   = google_artifact_registry_repository.web_test_docker_repo.location
  repository = google_artifact_registry_repository.web_test_docker_repo.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com"
}

# IAM binding for Artifact Registry - Allow Cloud Run to pull images
resource "google_artifact_registry_repository_iam_member" "cloud_run_reader" {
  project    = var.project_id
  location   = google_artifact_registry_repository.web_test_docker_repo.location
  repository = google_artifact_registry_repository.web_test_docker_repo.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}
