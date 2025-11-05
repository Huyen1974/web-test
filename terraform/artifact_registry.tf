# Artifact Registry for Docker images
# Per PHỤ LỤC D (Quy hoạch Hạ tầng Web-Test)

resource "google_artifact_registry_repository" "web_test" {
  location      = var.region
  repository_id = "web-test"
  description   = "Docker registry for web-test applications (Directus, Kestra, Chatwoot)"
  format        = "DOCKER"
}
