# Cloud Run Services for web-test infrastructure
# Per PHỤ LỤC D (Quy hoạch Hạ tầng Web-Test)
#
# Security fixes:
# - Removed public access (allUsers) IAM bindings
# - Using Cloud SQL Proxy via annotations for secure database connections
# - All secrets from Secret Manager (no plain text)

# ============================================
# Directus CMS - Headless CMS using MySQL
# ============================================

resource "google_cloud_run_v2_service" "directus" {
  name     = "directus-test"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run_sa.email

    # Cloud SQL connection annotation
    annotations = {
      "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.mysql_directus.connection_name
    }

    containers {
      image = "directus/directus:10.10"

      ports {
        name           = "http1"
        container_port = 8055
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
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

      env {
        name  = "ADMIN_EMAIL"
        value = "admin@huyen1974.com"
      }

      env {
        name = "ADMIN_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.directus_admin_password.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "DB_CLIENT"
        value = "mysql"
      }

      env {
        name  = "DB_HOST"
        value = "127.0.0.1"
      }

      env {
        name  = "DB_SOCKET_PATH"
        value = "/cloudsql/${google_sql_database_instance.mysql_directus.connection_name}"
      }

      env {
        name  = "DB_PORT"
        value = "3306"
      }

      env {
        name  = "DB_DATABASE"
        value = google_sql_database.directus.name
      }

      env {
        name  = "DB_USER"
        value = google_sql_user.directus.name
      }

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
        name  = "WEBSOCKETS_ENABLED"
        value = "true"
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image
    ]
  }

  depends_on = [
    google_sql_database_instance.mysql_directus,
    google_sql_database.directus,
    google_sql_user.directus
  ]
}

# ============================================
# Kestra Workflow Engine - Orchestration using PostgreSQL
# ============================================

resource "google_cloud_run_v2_service" "kestra" {
  name     = "kestra-test"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run_sa.email

    # Cloud SQL connection annotation for PostgreSQL
    annotations = {
      "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.postgres_kestra.connection_name
    }

    containers {
      image = "kestra/kestra:v0.17.0"

      ports {
        name           = "http1"
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      # Kestra database configuration via env vars (no plain text passwords)
      env {
        name  = "KESTRA_DATASOURCES_POSTGRES_URL"
        value = "jdbc:postgresql://localhost:5432/${google_sql_database.kestra.name}?socketFactory=com.google.cloud.sql.postgres.SocketFactory&cloudSqlInstance=${google_sql_database_instance.postgres_kestra.connection_name}"
      }

      env {
        name  = "KESTRA_DATASOURCES_POSTGRES_USERNAME"
        value = google_sql_user.kestra.name
      }

      env {
        name = "KESTRA_DATASOURCES_POSTGRES_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.kestra_db_password.secret_id
            version = "latest"
          }
        }
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
        name = "KESTRA_ENCRYPTION_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.kestra_encryption_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "KESTRA_SERVER_BASIC_AUTH_ENABLED"
        value = "false"
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image
    ]
  }

  depends_on = [
    google_sql_database_instance.postgres_kestra,
    google_sql_database.kestra,
    google_sql_user.kestra
  ]
}

# ============================================
# Chatwoot - Customer engagement platform using MySQL
# ============================================

resource "google_cloud_run_v2_service" "chatwoot" {
  name     = "chatwoot-test"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run_sa.email

    # Cloud SQL connection annotation for MySQL
    annotations = {
      "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.mysql_directus.connection_name
    }

    containers {
      image = "chatwoot/chatwoot:v3.7.0"

      ports {
        name           = "http1"
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name = "SECRET_KEY_BASE"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.chatwoot_secret_key_base.secret_id
            version = "latest"
          }
        }
      }

      # Fixed: Using DB_* variables instead of POSTGRES_* for MySQL connection
      env {
        name  = "DB_HOST"
        value = "127.0.0.1"
      }

      env {
        name  = "DB_SOCKET"
        value = "/cloudsql/${google_sql_database_instance.mysql_directus.connection_name}"
      }

      env {
        name  = "DB_PORT"
        value = "3306"
      }

      env {
        name  = "DB_NAME"
        value = google_sql_database.chatwoot.name
      }

      env {
        name  = "DB_USERNAME"
        value = google_sql_user.chatwoot.name
      }

      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.chatwoot_db_password.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "RAILS_ENV"
        value = "production"
      }

      env {
        name  = "INSTALLATION_ENV"
        value = "docker"
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image
    ]
  }

  depends_on = [
    google_sql_database_instance.mysql_directus,
    google_sql_database.chatwoot,
    google_sql_user.chatwoot
  ]
}

# ============================================
# Service Account for Cloud Run
# ============================================

resource "google_service_account" "cloud_run_sa" {
  account_id   = "web-test-cloud-run"
  display_name = "Service Account for web-test Cloud Run services"
  description  = "Used by Directus, Kestra, and Chatwoot Cloud Run services for Cloud SQL access"
}

# Grant Cloud SQL Client role to service account
resource "google_project_iam_member" "cloud_run_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Grant Secret Manager accessor role
resource "google_project_iam_member" "cloud_run_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Note: Public access (allUsers) IAM bindings removed for security
# Access control should be managed via IAP or Workload Identity Federation
