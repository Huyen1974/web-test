# ==============================================================================
# web-test Infrastructure - Phase 1 (Appendix F: MySQL First, Minimal)
# ==============================================================================

# Enable required APIs
resource "google_project_service" "artifactregistry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

# ------------------------------------------------------------------------------
# Artifact Registry for web-test Docker Images
# ------------------------------------------------------------------------------

resource "google_artifact_registry_repository" "web_test_docker_repo" {
  project       = var.project_id
  location      = var.region
  repository_id = "web-test"
  description   = "Docker repository for the web-test project"
  format        = "DOCKER"

  labels = {
    environment = var.env
    project     = "web-test"
    managed_by  = "terraform"
  }

  depends_on = [google_project_service.artifactregistry]
}

# ------------------------------------------------------------------------------
# Cloud Run Service for Directus CMS
# ------------------------------------------------------------------------------

# Note: Using inline Cloud Run resource instead of module for simplicity (Appendix F: simple is best)
# Can refactor to use standard_cloud_run module later if needed

resource "google_cloud_run_v2_service" "directus" {
  name     = "directus-${var.env}"
  location = var.region
  project  = var.project_id

  template {
    service_account = "chatgpt-deployer@${var.project_id}.iam.gserviceaccount.com"

    # Cloud SQL connection
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [module.mysql_directus.instance_connection_name]
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    containers {
      image = var.directus_image

      # Resource limits
      resources {
        limits = {
          cpu    = "1000m"
          memory = "1024Mi"
        }
      }

      # Health check endpoint
      # Fix (0022B): Increased initial_delay_seconds from 10 to 30 for Directus CMS startup
      # Fix (0022J): Changed port from 8055 to 8080 (Cloud Run default PORT)
      # Directus needs time to initialize, connect to DB, and start web server
      startup_probe {
        http_get {
          path = "/server/health"
          port = 8080
        }
        initial_delay_seconds = 30
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 15
      }

      liveness_probe {
        http_get {
          path = "/server/health"
          port = 8080
        }
        initial_delay_seconds = 10
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 3
      }

      # Environment variables for Directus
      env {
        name  = "DB_CLIENT"
        value = "mysql"
      }

      env {
        name  = "DB_HOST"
        value = "localhost"
      }

      env {
        name  = "DB_PORT"
        value = "3306"
      }

      env {
        name  = "DB_SOCKET_PATH"
        value = "/cloudsql/${module.mysql_directus.instance_connection_name}"
      }

      env {
        name  = "DB_DATABASE"
        value = "directus"
      }

      env {
        name  = "DB_USER"
        value = "directus"
      }

      env {
        name  = "ADMIN_EMAIL"
        value = var.directus_admin_email
      }

      env {
        name  = "DIRECTUS_ADMIN_EMAIL"
        value = var.directus_admin_email
      }

      env {
        name  = "PUBLIC_URL"
        value = "https://directus-${var.env}-812872501910.${var.region}.run.app"
      }

      env {
        name  = "WEBSOCKETS_ENABLED"
        value = "true"
      }

      # NOTE: PORT env is automatically set by Cloud Run (default: 8080)
      # Do NOT explicitly set PORT - it's a reserved environment variable
      # Cloud Run will inject PORT=8080, and Directus will respect it

      # Secret environment variables
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.directus_db_password.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "DIRECTUS_ADMIN_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = "DIRECTUS_ADMIN_PASSWORD_test"
            version = "latest"
          }
        }
      }

      env {
        name = "KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.directus_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.directus_secret.secret_id
            version = "latest"
          }
        }
      }

      # Mount Cloud SQL Proxy volume
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.run,
    module.mysql_directus,
    google_secret_manager_secret.directus_key,
    google_secret_manager_secret.directus_secret,
    google_secret_manager_secret.directus_db_password
    # Note: directus_admin_password is a data source (pre-existing secret)
  ]
}

# NOTE: Cloud Run service will fail to start until secret versions are injected
# After terraform apply, run the injection commands documented in secrets.tf

# Allow unauthenticated access to Directus
resource "google_cloud_run_v2_service_iam_member" "directus_public_access" {
  name     = google_cloud_run_v2_service.directus.name
  location = google_cloud_run_v2_service.directus.location
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ------------------------------------------------------------------------------
# Cloud Run Service for Chatwoot (Postponed - Phase 2)
# ------------------------------------------------------------------------------

# TODO: Uncomment when ready for Chatwoot deployment
# resource "google_cloud_run_v2_service" "chatwoot" {
#   name     = "chatwoot-${var.env}"
#   location = var.region
#   project  = var.project_id
#   ...
# }
