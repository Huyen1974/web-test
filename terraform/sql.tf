locals {
  # MySQL instance for Directus (web-test requirement)
  # Note: Using standard name for production deployment
  mysql_directus_instance_name = "mysql-directus-web-test"
}

resource "google_project_service" "sqladmin" {
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

# Cloud Scheduler and related IAM removed - manual start/stop via tools/manage_sql.sh

# MySQL instance for Directus using minimum_cost_sql module
module "mysql_directus" {
  source = "github.com/Huyen1974/platform-infra//terraform/modules/minimum_cost_sql?ref=v1.1.0"

  project_id       = var.project_id
  region           = var.sql_region
  instance_name    = local.mysql_directus_instance_name
  database_version = "MYSQL_8_0"
  database_name    = "directus"

  # Cost optimization settings
  disk_type             = "PD_HDD"
  disk_size             = 10
  disk_autoresize       = true
  disk_autoresize_limit = 50

  # Activation policy: NEVER for cost optimization (manual start/stop via tools/manage_sql.sh)
  activation_policy = "NEVER"

  # Backup configuration
  backup_start_time              = var.sql_backup_start_time
  backup_retained_backups        = 7
  transaction_log_retention_days = 7

  # Network configuration
  ipv4_enabled = true

  # Database flags
  max_connections = "100"

  # Maintenance window
  maintenance_window_day          = 7
  maintenance_window_hour         = 3
  maintenance_window_update_track = "stable"

  # Create database user
  create_user   = true
  user_name     = "directus"
  user_password = random_password.directus_db_password.result
}

# Cloud Scheduler jobs removed - MySQL instance managed manually via tools/manage_sql.sh
