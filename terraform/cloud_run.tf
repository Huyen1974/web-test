# Cloud Run Services for web-test infrastructure
# Per PHỤ LỤC D (Quy hoạch Hạ tầng Web-Test)

# ============================================
# Directus CMS - Headless CMS using MySQL
# ============================================

resource "google_cloud_run_v2_service" "directus" {
  name     = "directus-test"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "directus/directus:latest"

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
        value = "admin@example.com"
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
        value = google_sql_database_instance.mysql_directus.ip_address.0.ip_address
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
}

resource "google_cloud_run_v2_service_iam_member" "directus_noauth" {
  name     = google_cloud_run_v2_service.directus.name
  location = google_cloud_run_v2_service.directus.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ============================================
# Kestra Workflow Engine - Orchestration using PostgreSQL
# ============================================

resource "google_cloud_run_v2_service" "kestra" {
  name     = "kestra-test"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "kestra/kestra:latest"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "KESTRA_CONFIGURATION"
        value = <<-EOT
          datasources:
            postgres:
              url: jdbc:postgresql://${google_sql_database_instance.postgres_kestra.ip_address.0.ip_address}:5432/${google_sql_database.kestra.name}
              driverClassName: org.postgresql.Driver
              username: ${google_sql_user.kestra.name}
              password: ${random_password.kestra_db_password.result}
          kestra:
            server:
              basic-auth:
                enabled: false
            repository:
              type: postgres
            queue:
              type: postgres
            encryption:
              secret-key: ${random_password.kestra_encryption_key.result}
        EOT
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
}

resource "google_cloud_run_v2_service_iam_member" "kestra_noauth" {
  name     = google_cloud_run_v2_service.kestra.name
  location = google_cloud_run_v2_service.kestra.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ============================================
# Chatwoot - Customer engagement platform using MySQL
# ============================================

resource "google_cloud_run_v2_service" "chatwoot" {
  name     = "chatwoot-test"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "chatwoot/chatwoot:latest"

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

      env {
        name  = "POSTGRES_HOST"
        value = google_sql_database_instance.mysql_directus.ip_address.0.ip_address
      }

      env {
        name  = "POSTGRES_PORT"
        value = "3306"
      }

      env {
        name  = "POSTGRES_DATABASE"
        value = google_sql_database.chatwoot.name
      }

      env {
        name  = "POSTGRES_USERNAME"
        value = google_sql_user.chatwoot.name
      }

      env {
        name = "POSTGRES_PASSWORD"
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
}

resource "google_cloud_run_v2_service_iam_member" "chatwoot_noauth" {
  name     = google_cloud_run_v2_service.chatwoot.name
  location = google_cloud_run_v2_service.chatwoot.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
