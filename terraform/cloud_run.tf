# Cloud Run Services for web-test infrastructure
# Per PHỤ LỤC D (Quy hoạch Hạ tầng Web-Test)

# Directus CMS - Headless CMS using MySQL
resource "google_cloud_run_service" "directus" {
  name     = "directus-test"
  location = var.region

  template {
    spec {
      containers {
        image = "directus/directus:latest"

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  lifecycle {
    ignore_changes = [
      template[0].spec[0].containers[0].image,
      template[0].metadata
    ]
  }
}

# Kestra Workflow Engine - Orchestration using PostgreSQL
resource "google_cloud_run_service" "kestra" {
  name     = "kestra-test"
  location = var.region

  template {
    spec {
      containers {
        image = "kestra/kestra:latest"

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  lifecycle {
    ignore_changes = [
      template[0].spec[0].containers[0].image,
      template[0].metadata
    ]
  }
}

# Chatwoot - Customer engagement platform using MySQL
resource "google_cloud_run_service" "chatwoot" {
  name     = "chatwoot-test"
  location = var.region

  template {
    spec {
      containers {
        image = "chatwoot/chatwoot:latest"

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  lifecycle {
    ignore_changes = [
      template[0].spec[0].containers[0].image,
      template[0].metadata
    ]
  }
}

# IAM bindings for public access (can be restricted later)
resource "google_cloud_run_service_iam_member" "directus_noauth" {
  service  = google_cloud_run_service.directus.name
  location = google_cloud_run_service.directus.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "kestra_noauth" {
  service  = google_cloud_run_service.kestra.name
  location = google_cloud_run_service.kestra.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "chatwoot_noauth" {
  service  = google_cloud_run_service.chatwoot.name
  location = google_cloud_run_service.chatwoot.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
