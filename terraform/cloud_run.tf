# Cloud Run Services per PHỤ LỤC D, Điều 3
# Full configuration for Directus, Kestra, and Chatwoot

# ============================================================================
# DIRECTUS CMS SERVICE (uses MySQL)
# ============================================================================

resource "google_cloud_run_v2_service" "directus" {
  name     = "directus-test"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "directus/directus:latest"

      env {
        name  = "DB_CLIENT"
        value = "mysql"
      }

      env {
        name  = "DB_HOST"
        value = "/cloudsql/${google_sql_database_instance.mysql_directus.connection_name}"
      }

      env {
        name  = "DB_PORT"
        value = "3306"
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
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.directus_mysql_password.secret_id
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
        name  = "PUBLIC_URL"
        value = "https://directus-test-${data.google_project.current.number}.${var.region}.run.app"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    # Cloud SQL Proxy sidecar
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.mysql_directus.connection_name]
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# ============================================================================
# KESTRA WORKFLOW SERVICE (uses Postgres)
# ============================================================================

resource "google_cloud_run_v2_service" "kestra" {
  name     = "kestra-test"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "kestra/kestra:latest"

      env {
        name  = "KESTRA_CONFIGURATION"
        value = "datasources.postgres.url=jdbc:postgresql:///kestra?cloudSqlInstance=${google_sql_database_instance.postgres_kestra.connection_name}&socketFactory=com.google.cloud.sql.postgres.SocketFactory"
      }

      env {
        name  = "KESTRA_DATASOURCES_POSTGRES_USERNAME"
        value = "kestra"
      }

      env {
        name = "KESTRA_DATASOURCES_POSTGRES_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.kestra_postgres_password.secret_id
            version = "latest"
          }
        }
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
        name  = "KESTRA_SERVER_BASE_URL"
        value = "https://kestra-test-${data.google_project.current.number}.${var.region}.run.app"
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    # Cloud SQL Proxy sidecar
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres_kestra.connection_name]
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# ============================================================================
# CHATWOOT CHAT SERVICE (uses MySQL)
# ============================================================================

resource "google_cloud_run_v2_service" "chatwoot" {
  name     = "chatwoot-test"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "chatwoot/chatwoot:latest"

      env {
        name  = "POSTGRES_DATABASE"
        value = "chatwoot"
      }

      env {
        name  = "POSTGRES_HOST"
        value = "/cloudsql/${google_sql_database_instance.mysql_directus.connection_name}"
      }

      env {
        name  = "POSTGRES_USERNAME"
        value = "chatwoot"
      }

      env {
        name = "POSTGRES_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.chatwoot_mysql_password.secret_id
            version = "latest"
          }
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
        name  = "FRONTEND_URL"
        value = "https://chatwoot-test-${data.google_project.current.number}.${var.region}.run.app"
      }

      env {
        name  = "RAILS_ENV"
        value = "production"
      }

      env {
        name  = "INSTALLATION_NAME"
        value = "chatwoot-test"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    # Cloud SQL Proxy sidecar
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.mysql_directus.connection_name]
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# ============================================================================
# IAM BINDINGS FOR CLOUD RUN SERVICES
# ============================================================================

# Allow public access to Directus
resource "google_cloud_run_v2_service_iam_member" "directus_public" {
  name     = google_cloud_run_v2_service.directus.name
  location = google_cloud_run_v2_service.directus.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Allow public access to Kestra
resource "google_cloud_run_v2_service_iam_member" "kestra_public" {
  name     = google_cloud_run_v2_service.kestra.name
  location = google_cloud_run_v2_service.kestra.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Allow public access to Chatwoot
resource "google_cloud_run_v2_service_iam_member" "chatwoot_public" {
  name     = google_cloud_run_v2_service.chatwoot.name
  location = google_cloud_run_v2_service.chatwoot.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
