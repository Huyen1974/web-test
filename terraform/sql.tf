locals {
  # MySQL instance for Directus (web-test requirement)
  # Note: Using standard name for production deployment
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
# Note: Using db-f1-micro with ALWAYS policy for initial creation
# GCP API requires ALWAYS for new instances; can change to NEVER after creation
resource "google_sql_database_instance" "mysql_directus" {
  name             = local.mysql_directus_instance_name
  database_version = "MYSQL_8_0"
  region           = var.sql_region
  project          = var.project_id

  # REQUIRED: Deletion protection to prevent accidental deletion
  deletion_protection = true

  settings {
    # Cost-optimized tier for Directus
    tier = "db-f1-micro"

    # REQUIRED: ZONAL availability for cost optimization
    availability_type = "ZONAL"

    # REQUIRED: ALWAYS for initial creation (GCP API requirement)
    # Can be changed to NEVER via Cloud Scheduler after instance is created
    activation_policy = "ALWAYS"

    disk_type = "PD_HDD"
    disk_size = 10

    disk_autoresize       = true
    disk_autoresize_limit = 50

    backup_configuration {
      # REQUIRED: Backup enabled
      enabled = true

      # REQUIRED: Binary logging enabled (for point-in-time recovery)
      binary_log_enabled = true

      start_time = var.sql_backup_start_time

      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }

      transaction_log_retention_days = 7
    }

    ip_configuration {
      ipv4_enabled = true
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }

    maintenance_window {
      day          = 7
      hour         = 3
      update_track = "stable"
    }
  }

  lifecycle {
    prevent_destroy = false
    ignore_changes = [
      settings[0].disk_size,
    ]
  }
}

# Directus database
resource "google_sql_database" "directus" {
  name     = "directus"
  instance = google_sql_database_instance.mysql_directus.name
  project  = var.project_id
}

# Directus database user
resource "google_sql_user" "directus" {
  name     = "directus"
  instance = google_sql_database_instance.mysql_directus.name
  password = random_password.directus_db_password.result
  project  = var.project_id
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
    google_sql_database_instance.mysql_directus
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
