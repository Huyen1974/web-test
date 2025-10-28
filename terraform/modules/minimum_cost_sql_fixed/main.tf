resource "google_sql_database_instance" "instance" {
  name             = var.instance_name
  database_version = var.database_version
  region           = var.region
  project          = var.project_id

  # REQUIRED: Deletion protection to prevent accidental deletion
  deletion_protection = true

  settings {
    # REQUIRED: Minimum cost tier db-f1-micro
    tier = "db-f1-micro"

    # REQUIRED: ZONAL availability for cost optimization
    availability_type = "ZONAL"

    # Activation policy: ALWAYS for new instances (GCP API requirement), NEVER for cost optimization
    activation_policy = var.activation_policy

    disk_type = var.disk_type
    disk_size = var.disk_size

    disk_autoresize       = var.disk_autoresize
    disk_autoresize_limit = var.disk_autoresize_limit

    backup_configuration {
      # REQUIRED: Backup enabled
      enabled = true

      # REQUIRED: Binary logging enabled (for point-in-time recovery)
      binary_log_enabled = var.database_version == "MYSQL_8_0" || var.database_version == "MYSQL_5_7" ? true : false

      start_time = var.backup_start_time

      backup_retention_settings {
        retained_backups = var.backup_retained_backups
        retention_unit   = "COUNT"
      }

      transaction_log_retention_days = var.transaction_log_retention_days
    }

    ip_configuration {
      ipv4_enabled    = var.ipv4_enabled
      private_network = var.private_network

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
  count    = var.manage_database ? 1 : 0
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

  # Prevent errors when instance is stopped (activation_policy = NEVER)
  # Google Cloud SQL API returns 400 error when trying to read user from stopped instance
  lifecycle {
    ignore_changes = [
      # Ignore all changes to prevent refresh errors when instance is not running
      name,
      instance,
      password,
    ]
  }
}
