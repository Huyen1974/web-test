# Artifact Registry for web-test infrastructure
# Per PHỤ LỤC D (Quy hoạch Hạ tầng Web-Test)

resource "google_artifact_registry_repository" "web_test" {
  repository_id = "web-test"
  location      = var.region
  format        = "DOCKER"
  description   = "Docker repository for web-test services (Directus, Kestra, Chatwoot)"
}
