# MySQL Cloud SQL Instance Module - Main
# Optimized for Appendix F: MySQL First (db-g1-small, 10GB SSD, ALWAYS ON)

resource "google_sql_database_instance" "instance" {
  name             = var.instance_name
  database_version = var.database_version
  region           = var.region
  project          = var.project_id

  # Deletion protection to prevent accidental deletion
  deletion_protection = var.deletion_protection

  settings {
    # Appendix F: db-g1-small tier for cost-optimized production
    tier = var.tier

    # ZONAL availability for cost optimization
    availability_type = "ZONAL"

    # Appendix F: ALWAYS ON for production availability
    activation_policy = var.activation_policy

    # Appendix F: PD_SSD for fast startup (~2-3 min vs 13+ min with PD)
    disk_type = var.disk_type
    disk_size = var.disk_size

    disk_autoresize       = var.disk_autoresize
    disk_autoresize_limit = var.disk_autoresize_limit

    backup_configuration {
      enabled            = true
      binary_log_enabled = true
      start_time         = var.backup_start_time

      backup_retention_settings {
        retained_backups = var.backup_retained_backups
        retention_unit   = "COUNT"
      }

      transaction_log_retention_days = var.transaction_log_retention_days
    }

    ip_configuration {
      ipv4_enabled    = var.ipv4_enabled
      private_network = var.private_network != "" ? var.private_network : null

      dynamic "authorized_networks" {
        for_each = var.authorized_networks
        content {
          name  = authorized_networks.value.name
          value = authorized_networks.value.value
        }
      }
    }

    database_flags {
      name  = "max_connections"
      value = var.max_connections
    }

    maintenance_window {
      day          = var.maintenance_window_day
      hour         = var.maintenance_window_hour
      update_track = var.maintenance_window_update_track
    }
  }

  lifecycle {
    prevent_destroy = false
    ignore_changes = [
      settings[0].disk_size,
    ]
  }
}

resource "google_sql_database" "database" {
  name     = var.database_name
  instance = google_sql_database_instance.instance.name
  project  = var.project_id
}

resource "google_sql_user" "user" {
  count = var.create_user ? 1 : 0

  name     = var.user_name
  instance = google_sql_database_instance.instance.name
  password = var.user_password
  project  = var.project_id
}
