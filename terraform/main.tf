# Artifact Registry for web-test
resource "google_artifact_registry_repository" "web_test_docker_repo" {
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

# Service account for Cloud Run - using chatgpt-deployer as per constitution
locals {
  chatgpt_deployer_sa = "chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com"
}

# Cloud Run service for Directus CMS
# Note: Using direct resource instead of module to support Cloud SQL connection
resource "google_cloud_run_v2_service" "directus" {
  name     = "directus-${var.env}"
  location = var.region
  project  = var.project_id

  template {
    service_account = local.chatgpt_deployer_sa

    # Cloud SQL volume configuration for Unix socket connection
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.mysql_directus.connection_name]
      }
    }

    containers {
      image = "directus/directus:11.2.2"

      # Mount Cloud SQL volume
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }

      # Regular environment variables
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
        value = "/cloudsql/${google_sql_database_instance.mysql_directus.connection_name}"
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
        name  = "PUBLIC_URL"
        value = "https://directus-${var.env}-${var.project_id}.run.app"
      }

      env {
        name  = "WEBSOCKETS_ENABLED"
        value = "true"
      }

      # Secret environment variables
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.directus_db_password.secret_id
            version = google_secret_manager_secret_version.directus_db_password.version
          }
        }
      }

      env {
        name = "KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.directus_key.secret_id
            version = google_secret_manager_secret_version.directus_key.version
          }
        }
      }

      env {
        name = "SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.directus_secret.secret_id
            version = google_secret_manager_secret_version.directus_secret.version
          }
        }
      }

      # Startup probe - optimized for Directus
      startup_probe {
        http_get {
          path = "/server/health"
        }
        initial_delay_seconds = 10
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 10
      }

      # Liveness probe
      liveness_probe {
        http_get {
          path = "/server/health"
        }
        initial_delay_seconds = 10
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 3
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    max_instance_request_concurrency = 80
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
    ]
  }
}

# Allow unauthenticated access
resource "google_cloud_run_service_iam_member" "directus_public_access" {
  service  = google_cloud_run_v2_service.directus.name
  location = google_cloud_run_v2_service.directus.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
