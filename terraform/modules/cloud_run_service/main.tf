resource "google_artifact_registry_repository" "repo" {
  project       = var.project_id
  location      = var.location
  repository_id = var.service_name
  description   = "Docker repository for ${var.service_name}"
  format        = "DOCKER"
}

resource "google_cloud_run_v2_service" "default" {
  name     = var.service_name
  location = var.location
  project  = var.project_id

  template {
    containers {
      image = var.image_path

      dynamic "env" {
        for_each = var.api_key_secret == null ? [] : [var.api_key_secret]
        content {
          name = "API_KEY"
          value_source {
            secret_key_ref {
              secret  = var.api_key_secret
              version = var.api_key_secret_version
            }
          }
        }
      }
    }
  }
}
