locals {
  # MySQL instance for Directus (web-test requirement)
  mysql_directus_instance_name = "mysql-directus-web-test"
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

# MySQL instance for Directus (web-test requirement)
module "mysql_directus" {
  source = "github.com/Huyen1974/platform-infra//terraform/modules/minimum_cost_sql?ref=v1.0.0"

  project_id       = var.project_id
  region           = var.sql_region
  instance_name    = local.mysql_directus_instance_name
  database_version = "MYSQL_8_0"
  database_name    = "directus"

  # Cost-optimized configuration for Directus
  disk_type                       = "PD_HDD"
  disk_size                       = 10
  disk_autoresize                 = true
  disk_autoresize_limit           = 50
  backup_start_time               = var.sql_backup_start_time
  backup_retained_backups         = 7
  transaction_log_retention_days  = 7
  ipv4_enabled                    = true
  authorized_networks             = []
  max_connections                 = "100"
  maintenance_window_day          = 7
  maintenance_window_hour         = 3
  maintenance_window_update_track = "stable"

  # Create Directus database user
  create_user   = true
  user_name     = "directus"
  user_password = random_password.directus_db_password.result
}

# Cloud Scheduler for MySQL Directus instance
resource "google_cloud_scheduler_job" "mysql_directus_start" {
  name      = "${local.mysql_directus_instance_name}-start"
  schedule  = var.sql_start_schedule
  time_zone = var.sql_schedule_timezone
  region    = var.sql_scheduler_region

  http_target {
    http_method = "PATCH"
    uri         = "https://sqladmin.googleapis.com/v1/projects/${var.project_id}/instances/${local.mysql_directus_instance_name}?updateMask=settings.activationPolicy"
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
    module.mysql_directus
  ]
}

resource "google_cloud_scheduler_job" "mysql_directus_stop" {
  name      = "${local.mysql_directus_instance_name}-stop"
  schedule  = var.sql_stop_schedule
  time_zone = var.sql_schedule_timezone
  region    = var.sql_scheduler_region

  http_target {
    http_method = "PATCH"
    uri         = "https://sqladmin.googleapis.com/v1/projects/${var.project_id}/instances/${local.mysql_directus_instance_name}?updateMask=settings.activationPolicy"
    body        = base64encode(jsonencode({ settings = { activationPolicy = "NEVER" } }))

    headers = {
      "Content-Type" = "application/json"
    }

    oidc_token {
      service_account_email = google_service_account.sql_scheduler.email
    }
  }

  depends_on = [
    google_cloud_scheduler_job.mysql_directus_start,
    google_project_service.sqladmin,
    google_project_service.cloudscheduler,
    google_service_account_iam_member.scheduler_token_creator,
    google_project_iam_member.sql_scheduler_admin
  ]
}
