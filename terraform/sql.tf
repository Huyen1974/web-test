locals {
  # MySQL instance for Directus (web-test requirement)
  # Note: Using standard name for production deployment
  mysql_directus_instance_name = "mysql-directus-web-test"
}

resource "google_project_service" "sqladmin" {
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}


# MySQL instance for Directus using minimum_cost_sql module (local fixed version)
# Fixed version handles stopped instances (activation_policy = NEVER) without refresh errors
module "mysql_directus" {
  source = "./modules/minimum_cost_sql_fixed"

  project_id       = var.project_id
  region           = var.sql_region
  instance_name    = local.mysql_directus_instance_name
  database_version = "MYSQL_8_0"
  database_name    = "directus"

  # Cost optimization settings - upgraded to SSD for faster startup (13+ min → ~2-3 min)
  disk_type             = "PD_SSD"
  disk_size             = 10
  disk_autoresize       = true
  disk_autoresize_limit = 50

  # Activation policy: NEVER for cost optimization (manual start/stop by admin)
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
  # NOTE: User already created. Disabled to avoid "instance not running" errors during terraform plan
  # The user exists and is managed manually or via Cloud Console when instance is running
  create_user   = false
  user_name     = "directus"
  user_password = random_password.directus_db_password.result
}
