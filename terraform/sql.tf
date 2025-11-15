# ==============================================================================
# Cloud SQL MySQL Instance for Directus (Appendix F: MySQL First)
# ==============================================================================

# Enable Cloud SQL Admin API
resource "google_project_service" "sqladmin" {
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

# MySQL instance using minimum_cost_sql module
# Appendix F specs: db-g1-small, 10GB SSD, ALWAYS ON
module "mysql_directus" {
  source = "./modules/minimum_cost_sql"

  project_id       = var.project_id
  region           = var.region
  instance_name    = var.sql_instance_name
  database_version = "MYSQL_8_0"
  database_name    = "directus"

  # Appendix F: db-g1-small tier (cost-optimized production)
  tier = var.sql_tier

  # Appendix F: PD_SSD for fast startup (2-3 min vs 13+ min)
  disk_type = "PD_SSD"
  disk_size = var.sql_disk_size

  disk_autoresize       = true
  disk_autoresize_limit = 50

  # Appendix F: ALWAYS ON for production availability
  activation_policy = "ALWAYS"

  # Backup configuration
  backup_start_time              = var.sql_backup_start_time
  backup_retained_backups        = 7
  transaction_log_retention_days = 7

  # Network configuration
  ipv4_enabled = true

  # Database flags
  max_connections = "100"

  # Maintenance window (Sunday 3 AM)
  maintenance_window_day          = 7
  maintenance_window_hour         = 3
  maintenance_window_update_track = "stable"

  # Deletion protection
  deletion_protection = true

  # Create database user
  create_user   = true
  user_name     = "directus"
  user_password = random_password.directus_db_password.result
}
