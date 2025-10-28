# Kestra Service Configuration for Sprint 2
# Kestra is a workflow orchestration platform running on Cloud Run

# Read existing Kestra encryption key from Secret Manager
# Secret was created manually via gcloud in Task #199
data "google_secret_manager_secret_version" "kestra_encryption_key" {
  project = var.project_id
  secret  = "kestra-encryption-key-test"
  version = "latest"
}

# Read existing Kestra secret key from Secret Manager
# Secret was created manually via gcloud in Task #199
data "google_secret_manager_secret_version" "kestra_secret_key" {
  project = var.project_id
  secret  = "kestra-secret-key-test"
  version = "latest"
}

# Grant Secret Manager access for Kestra secrets
resource "google_secret_manager_secret_iam_member" "kestra_encryption_key_accessor" {
  project   = var.project_id
  secret_id = "kestra-encryption-key-test"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.chatgpt_deployer_sa}"
}

resource "google_secret_manager_secret_iam_member" "kestra_secret_key_accessor" {
  project   = var.project_id
  secret_id = "kestra-secret-key-test"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.chatgpt_deployer_sa}"
}

# Cloud Run service for Kestra with Cloud SQL Auth Proxy sidecar
# Using direct resource definition instead of module to enable sidecar pattern
resource "google_cloud_run_v2_service" "kestra" {
  name     = "kestra-${var.env}"
  location = var.region
  project  = var.project_id

  template {
    # Service account for Kestra
    service_account = local.chatgpt_deployer_sa

    # Scaling configuration
    scaling {
      min_instance_count = 0 # Cost optimization: scale to zero when not in use
      max_instance_count = 3
    }

    # Maximum concurrent requests per instance
    max_instance_request_concurrency = 40

    # Main Kestra container
    containers {
      name  = "kestra"
      image = "kestra/kestra:latest"

      # Container arguments - run Kestra in standalone mode
      args = ["server", "standalone"]

      # Resource limits - increased for workflow orchestration
      resources {
        limits = {
          cpu    = "4000m"
          memory = "2Gi"
        }
        cpu_idle = true
      }

      # Environment variables for Kestra
      env {
        name  = "DATASOURCES_POSTGRES_URL"
        value = "jdbc:postgresql://127.0.0.1:5432/kestra"
      }
      env {
        name  = "DATASOURCES_POSTGRES_USERNAME"
        value = "kestra"
      }
      env {
        name  = "DATASOURCES_POSTGRES_DRIVER_CLASS_NAME"
        value = "org.postgresql.Driver"
      }
      env {
        name  = "KESTRA_SERVER_BASE_URL"
        value = "https://kestra-${var.env}-${var.project_id}.run.app"
      }
      env {
        name  = "KESTRA_REPOSITORY_TYPE"
        value = "postgres"
      }
      env {
        name  = "KESTRA_QUEUE_TYPE"
        value = "postgres"
      }
      env {
        name  = "KESTRA_STORAGE_TYPE"
        value = "local"
      }
      env {
        name  = "KESTRA_WEBSERVER_ENABLED"
        value = "true"
      }
      env {
        name  = "MICRONAUT_SERVER_PORT"
        value = "8080"
      }
      env {
        name  = "KESTRA_LOGGING_LEVEL"
        value = "INFO"
      }
      env {
        name  = "JAVA_OPTS"
        value = "-Xmx1536m -XX:+UseG1GC -Dmicronaut.server.port=8080"
      }
      env {
        name  = "ENDPOINTS_ALL_PORT"
        value = "8080"
      }

      # Secret environment variables
      env {
        name = "DATASOURCES_POSTGRES_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = "kestra-db-password-test"
            version = "latest"
          }
        }
      }
      env {
        name = "KESTRA_ENCRYPTION_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = "kestra-encryption-key-test"
            version = "latest"
          }
        }
      }
      env {
        name = "KESTRA_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = "kestra-secret-key-test"
            version = "latest"
          }
        }
      }

      # Ports
      ports {
        name           = "http1"
        container_port = 8080
      }

      # Startup probe - Kestra needs more time to start
      startup_probe {
        initial_delay_seconds = 1
        timeout_seconds       = 3
        period_seconds        = 1
        failure_threshold     = 120

        http_get {
          path = "/health"
          port = 8080
        }
      }

      # Liveness probe
      liveness_probe {
        initial_delay_seconds = 0
        timeout_seconds       = 3
        period_seconds        = 5
        failure_threshold     = 3

        http_get {
          path = "/health/liveness"
          port = 8080
        }
      }
    }

    # Cloud SQL Auth Proxy sidecar container
    containers {
      name  = "cloud-sql-proxy"
      image = "gcr.io/cloud-sql-connectors/cloud-sql-proxy:latest"

      args = [
        "--port=5432",
        "--address=0.0.0.0",
        module.postgres_kestra.instance_connection_name
      ]

      # Resource limits for proxy
      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
        cpu_idle = false
      }

      # Startup probe for proxy
      startup_probe {
        initial_delay_seconds = 0
        timeout_seconds       = 1
        period_seconds        = 1
        failure_threshold     = 10

        tcp_socket {
          port = 5432
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# IAM policy to allow unauthenticated access (for now, will add authentication later)
resource "google_cloud_run_v2_service_iam_member" "kestra_noauth" {
  project  = google_cloud_run_v2_service.kestra.project
  location = google_cloud_run_v2_service.kestra.location
  name     = google_cloud_run_v2_service.kestra.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
