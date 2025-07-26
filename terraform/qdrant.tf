# Qdrant secret version - secret definition is in secrets.tf
resource "google_secret_manager_secret_version" "qdrant_api_v1" {
  secret      = google_secret_manager_secret.qdrant_api.id
  secret_data = var.qdrant_api_key
}
