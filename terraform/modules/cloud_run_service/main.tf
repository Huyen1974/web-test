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
    }
  }
}
