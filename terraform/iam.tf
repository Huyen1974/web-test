# IAM Configuration for web-test services
# Adapted from agent-data-test for Directus, Kestra, and Chatwoot services
# Note: data.google_project.current is already defined in provider.tf

# Default compute service account for Cloud Run services
locals {
  default_compute_sa = "${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

# Grant Cloud Run services access to Secret Manager
resource "google_project_iam_member" "run_sa_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${local.default_compute_sa}"
}

# Grant Cloud Run services access to Cloud SQL (for Directus and Chatwoot)
resource "google_project_iam_member" "run_sa_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${local.default_compute_sa}"
}

# Grant Cloud Run services access to Storage (for Directus file uploads)
resource "google_project_iam_member" "run_sa_storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${local.default_compute_sa}"
}

# Grant Kestra service access to invoke Cloud Run services (for workflow orchestration)
resource "google_project_iam_member" "run_sa_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${local.default_compute_sa}"
}

# Grant services access to Cloud Logging
resource "google_project_iam_member" "run_sa_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${local.default_compute_sa}"
}

# Grant services access to Cloud Monitoring (for metrics)
resource "google_project_iam_member" "run_sa_monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${local.default_compute_sa}"
}
