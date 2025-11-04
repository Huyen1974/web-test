# Cloud Run Services per PHỤ LỤC D, Điều 3
# Placeholder resources - actual configuration will be added later

# Directus CMS service (uses MySQL)
resource "google_cloud_run_service" "directus" {
  name     = "directus-test"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/cloudrun/placeholder"
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
      template[0].metadata[0].annotations,
    ]
  }
}

# Kestra workflow engine service (uses Postgres)
resource "google_cloud_run_service" "kestra" {
  name     = "kestra-test"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/cloudrun/placeholder"
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
      template[0].metadata[0].annotations,
    ]
  }
}

# Chatwoot chat service (uses MySQL)
resource "google_cloud_run_service" "chatwoot" {
  name     = "chatwoot-test"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/cloudrun/placeholder"
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
      template[0].metadata[0].annotations,
    ]
  }
}
