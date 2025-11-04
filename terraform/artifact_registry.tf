# Artifact Registry per PHỤ LỤC D, Điều 3
resource "google_artifact_registry_repository" "web_test" {
  repository_id = "web-test"
  location      = var.region
  format        = "DOCKER"
  description   = "Docker images for web-test services"

  lifecycle {
    prevent_destroy = true
  }
}
