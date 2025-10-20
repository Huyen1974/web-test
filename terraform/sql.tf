locals {
  managed_sql_instance_name = var.sql_instance_name != "" ? var.sql_instance_name : "agent-data-managed-sql"
}

resource "google_project_service" "sqladmin" {
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudscheduler" {
  service            = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
}

resource "google_service_account" "sql_scheduler" {
  account_id   = "sql-scheduler"
  display_name = "SQL Scheduler Service Account"
}

resource "google_service_account_iam_member" "scheduler_token_creator" {
  service_account_id = google_service_account.sql_scheduler.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "sql_scheduler_admin" {
  project = var.project_id
  role    = "roles/cloudsql.admin"
  member  = "serviceAccount:${google_service_account.sql_scheduler.email}"
}

# Use minimum_cost_sql module from platform-infra
module "managed_sql" {
  source = "github.com/Huyen1974/platform-infra//terraform/modules/minimum_cost_sql?ref=v1.0.0"

  project_id       = var.project_id
  region           = var.sql_region
  instance_name    = local.managed_sql_instance_name
  database_version = var.sql_database_version
  database_name    = "directus"

  # Override defaults to match current configuration
  disk_type                        = "PD_SSD"
  disk_size                        = 10
  disk_autoresize                  = true
  disk_autoresize_limit            = 50
  backup_start_time                = var.sql_backup_start_time
  backup_retained_backups          = 7
  transaction_log_retention_days   = 7
  ipv4_enabled                     = true
  authorized_networks              = []
  max_connections                  = "100"
  maintenance_window_day           = 7
  maintenance_window_hour          = 3
  maintenance_window_update_track  = "stable"
  create_user                      = false
}

resource "google_cloud_scheduler_job" "sql_start" {
  name      = "${local.managed_sql_instance_name}-start"
  schedule  = var.sql_start_schedule
  time_zone = var.sql_schedule_timezone
  region    = var.sql_scheduler_region

  http_target {
    http_method = "PATCH"
    uri         = "https://sqladmin.googleapis.com/v1/projects/${var.project_id}/instances/${local.managed_sql_instance_name}?updateMask=settings.activationPolicy"
    body        = base64encode(jsonencode({ settings = { activationPolicy = "ALWAYS" } }))

    headers = {
      "Content-Type" = "application/json"
    }

    oidc_token {
      service_account_email = google_service_account.sql_scheduler.email
    }
  }

  depends_on = [
    google_project_service.sqladmin,
    google_project_service.cloudscheduler,
    google_service_account_iam_member.scheduler_token_creator,
    google_project_iam_member.sql_scheduler_admin,
    module.managed_sql
  ]
}

resource "google_cloud_scheduler_job" "sql_stop" {
  name      = "${local.managed_sql_instance_name}-stop"
  schedule  = var.sql_stop_schedule
  time_zone = var.sql_schedule_timezone
  region    = var.sql_scheduler_region

  http_target {
    http_method = "PATCH"
    uri         = "https://sqladmin.googleapis.com/v1/projects/${var.project_id}/instances/${local.managed_sql_instance_name}?updateMask=settings.activationPolicy"
    body        = base64encode(jsonencode({ settings = { activationPolicy = "NEVER" } }))

    headers = {
      "Content-Type" = "application/json"
    }

    oidc_token {
      service_account_email = google_service_account.sql_scheduler.email
    }
  }

  depends_on = [
    google_cloud_scheduler_job.sql_start,
    google_project_service.sqladmin,
    google_project_service.cloudscheduler,
    google_service_account_iam_member.scheduler_token_creator,
    google_project_iam_member.sql_scheduler_admin
  ]
}
