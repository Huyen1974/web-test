# Chatwoot Service Configuration for Sprint 3
# Chatwoot is an open-source customer engagement platform

# Read existing Chatwoot SECRET_KEY_BASE from Secret Manager
# Secret will be created manually via gcloud in Task #239
data "google_secret_manager_secret_version" "chatwoot_secret_key_base" {
  project = var.project_id
  secret  = "CHATWOOT_SECRET_KEY_BASE_test"
  version = "latest"
}

# Read existing Chatwoot Redis password from Secret Manager
# Secret will be created manually via gcloud in Task #239
data "google_secret_manager_secret_version" "chatwoot_redis_password" {
  project = var.project_id
  secret  = "CHATWOOT_REDIS_PASSWORD_test"
  version = "latest"
}

# Read existing Chatwoot Active Record Encryption keys from Secret Manager
# Secrets will be created manually via gcloud in Task #239
data "google_secret_manager_secret_version" "chatwoot_encryption_primary_key" {
  project = var.project_id
  secret  = "CHATWOOT_ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY_test"
  version = "latest"
}

data "google_secret_manager_secret_version" "chatwoot_encryption_deterministic_key" {
  project = var.project_id
  secret  = "CHATWOOT_ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY_test"
  version = "latest"
}

data "google_secret_manager_secret_version" "chatwoot_encryption_key_derivation_salt" {
  project = var.project_id
  secret  = "CHATWOOT_ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT_test"
  version = "latest"
}

# Create REDIS_URL secret with full connection string
# This is needed because Chatwoot requires REDIS_URL format, not individual REDIS_HOST/PORT
resource "google_secret_manager_secret" "chatwoot_redis_url" {
  project   = var.project_id
  secret_id = "CHATWOOT_REDIS_URL_test"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "chatwoot_redis_url" {
  secret      = google_secret_manager_secret.chatwoot_redis_url.id
  secret_data = format("redis://:%s@127.0.0.1:6379", urlencode(data.google_secret_manager_secret_version.chatwoot_redis_password.secret_data))
}

# Create DATABASE_URL secret with full connection string
# MySQL connection string format for Chatwoot (mysql2 adapter)
resource "google_secret_manager_secret" "chatwoot_database_url" {
  project   = var.project_id
  secret_id = "CHATWOOT_DATABASE_URL_test"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "chatwoot_database_url" {
  secret      = google_secret_manager_secret.chatwoot_database_url.id
  secret_data = format("mysql2://chatwoot:%s@127.0.0.1:3306/chatwoot_production", urlencode(random_password.chatwoot_mysql_password.result))
}

# Note: chatwoot_mysql_password resource is defined in chatwoot_internal_db.tf

# Grant Secret Manager access for Chatwoot secrets
resource "google_secret_manager_secret_iam_member" "chatwoot_secret_key_base_accessor" {
  project   = var.project_id
  secret_id = "CHATWOOT_SECRET_KEY_BASE_test"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.chatgpt_deployer_sa}"
}

resource "google_secret_manager_secret_iam_member" "chatwoot_redis_password_accessor" {
  project   = var.project_id
  secret_id = "CHATWOOT_REDIS_PASSWORD_test"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.chatgpt_deployer_sa}"
}

resource "google_secret_manager_secret_iam_member" "chatwoot_encryption_primary_key_accessor" {
  project   = var.project_id
  secret_id = "CHATWOOT_ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY_test"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.chatgpt_deployer_sa}"
}

resource "google_secret_manager_secret_iam_member" "chatwoot_encryption_deterministic_key_accessor" {
  project   = var.project_id
  secret_id = "CHATWOOT_ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY_test"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.chatgpt_deployer_sa}"
}

resource "google_secret_manager_secret_iam_member" "chatwoot_encryption_key_derivation_salt_accessor" {
  project   = var.project_id
  secret_id = "CHATWOOT_ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT_test"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.chatgpt_deployer_sa}"
}

resource "google_secret_manager_secret_iam_member" "chatwoot_redis_url_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.chatwoot_redis_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.chatgpt_deployer_sa}"
}

resource "google_secret_manager_secret_iam_member" "chatwoot_database_url_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.chatwoot_database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.chatgpt_deployer_sa}"
}

# Cloud Run service for Chatwoot with Cloud SQL Auth Proxy sidecar
# Using direct resource definition instead of module to enable sidecar pattern
resource "google_cloud_run_v2_service" "chatwoot" {
  name     = "chatwoot-${var.env}"
  location = var.region
  project  = var.project_id

  template {
    # Service account for Chatwoot
    service_account = local.chatgpt_deployer_sa

    # Scaling configuration
    scaling {
      min_instance_count = 0 # Cost optimization: scale to zero when not in use
      max_instance_count = 3
    }

    # Maximum concurrent requests per instance
    max_instance_request_concurrency = 80

    # Main Chatwoot Rails container
    containers {
      name  = "chatwoot-rails"
      image = "chatwoot/chatwoot:latest"

      # Run database migrations before starting server
      # db:chatwoot_prepare is idempotent and safe to run on every startup
      # CRITICAL FIX: Bypass rails.sh entrypoint to avoid pg_isready check (Report #0319)
      # rails.sh expects PostgreSQL but we're using MySQL - direct execution prevents startup failure
      command = ["sh", "-c"]
      args    = ["bundle exec rails db:chatwoot_prepare && bundle exec rails s -p 8080 -b 0.0.0.0"]

      # Resource limits
      resources {
        limits = {
          cpu    = "2000m"
          memory = "2Gi"
        }
        cpu_idle = true
      }

      # Database environment variables for MySQL
      env {
        name  = "DB_ADAPTER"
        value = "mysql2"
      }
      env {
        name  = "DB_HOST"
        value = "127.0.0.1"
      }
      env {
        name  = "DB_PORT"
        value = "3306"
      }
      env {
        name  = "DB_USERNAME"
        value = "chatwoot"
      }
      env {
        name  = "DB_NAME"
        value = "chatwoot_production"
      }

      # Database URL - Full MySQL connection string (preferred by Chatwoot)
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.chatwoot_database_url.secret_id
            version = "latest"
          }
        }
      }

      # Redis URL - Full connection string (required by Chatwoot, not REDIS_HOST/PORT)
      env {
        name = "REDIS_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.chatwoot_redis_url.secret_id
            version = "latest"
          }
        }
      }

      # Application environment variables
      env {
        name  = "RAILS_ENV"
        value = "production"
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "FRONTEND_URL"
        value = "https://chatwoot-${var.env}-${var.project_id}.run.app"
      }
      env {
        name  = "FORCE_SSL"
        value = "true"
      }
      env {
        name  = "ENABLE_ACCOUNT_SIGNUP"
        value = "false"
      }
      env {
        name  = "RAILS_LOG_TO_STDOUT"
        value = "true"
      }
      env {
        name  = "RAILS_MAX_THREADS"
        value = "5"
      }
      env {
        name  = "INSTALLATION_NAME"
        value = "Chatwoot ${var.env}"
      }
      env {
        name  = "MAILER_SENDER_EMAIL"
        value = "noreply@chatwoot-${var.env}.local"
      }

      # Secret environment variables
      env {
        name = "SECRET_KEY_BASE"
        value_source {
          secret_key_ref {
            secret  = "CHATWOOT_SECRET_KEY_BASE_test"
            version = "latest"
          }
        }
      }
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.chatwoot_mysql_password.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "REDIS_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = "CHATWOOT_REDIS_PASSWORD_test"
            version = "latest"
          }
        }
      }
      env {
        name = "ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY"
        value_source {
          secret_key_ref {
            secret  = "CHATWOOT_ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY_test"
            version = "latest"
          }
        }
      }
      env {
        name = "ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY"
        value_source {
          secret_key_ref {
            secret  = "CHATWOOT_ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY_test"
            version = "latest"
          }
        }
      }
      env {
        name = "ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT"
        value_source {
          secret_key_ref {
            secret  = "CHATWOOT_ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT_test"
            version = "latest"
          }
        }
      }

      # Ports
      ports {
        name           = "http1"
        container_port = 8080
      }

      # Startup probe - Chatwoot needs time to start (including migrations)
      # Using root path / instead of /api which may require authentication
      # Lesson #3 from Report #0313: Increase timeout for first-time migration
      startup_probe {
        initial_delay_seconds = 10
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 180 # 30 minutes for database migration (10s × 180 = 1800s)

        http_get {
          path = "/"
          port = 8080
        }
      }

      # Liveness probe
      liveness_probe {
        initial_delay_seconds = 0
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 3

        http_get {
          path = "/"
          port = 8080
        }
      }
    }

    # Cloud SQL Auth Proxy sidecar container for MySQL
    # Part of 2-SQL Constitution: Chatwoot uses mysql-directus instance
    containers {
      name  = "cloud-sql-proxy"
      image = "gcr.io/cloud-sql-connectors/cloud-sql-proxy:latest"

      args = [
        "--port=3306",
        "--address=0.0.0.0",
        module.mysql_directus.instance_connection_name
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
          port = 3306
        }
      }
    }

    # Redis sidecar container
    containers {
      name  = "redis"
      image = "redis:7-alpine"

      command = ["/bin/sh", "-c"]
      args    = ["redis-server --requirepass \"$REDIS_PASSWORD\""]

      # Resource limits for Redis
      resources {
        limits = {
          cpu    = "500m"
          memory = "256Mi"
        }
        cpu_idle = false
      }

      # Redis password from secret
      env {
        name = "REDIS_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = "CHATWOOT_REDIS_PASSWORD_test"
            version = "latest"
          }
        }
      }

      # Startup probe for Redis
      startup_probe {
        initial_delay_seconds = 0
        timeout_seconds       = 1
        period_seconds        = 1
        failure_threshold     = 10

        tcp_socket {
          port = 6379
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# IAM policy to allow unauthenticated access (for widget embedding)
resource "google_cloud_run_v2_service_iam_member" "chatwoot_noauth" {
  project  = google_cloud_run_v2_service.chatwoot.project
  location = google_cloud_run_v2_service.chatwoot.location
  name     = google_cloud_run_v2_service.chatwoot.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
