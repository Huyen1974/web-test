locals {
  # PostgreSQL instance for Kestra (Sprint 2 requirement)
  # Note: Using cost-optimized configuration
  postgres_kestra_instance_name = "postgres-kestra-web-test"
}

# PostgreSQL instance for Kestra using minimum_cost_sql_fixed module
# Configured for cost optimization with manual start/stop capability
module "postgres_kestra" {
  source = "./modules/minimum_cost_sql_fixed"

  project_id       = var.project_id
  region           = var.sql_region
  instance_name    = local.postgres_kestra_instance_name
  database_version = "POSTGRES_15"
  database_name    = "kestra"

  # Cost optimization settings - small SSD for Kestra workflow metadata
  disk_type             = "PD_SSD"
  disk_size             = 10
  disk_autoresize       = true
  disk_autoresize_limit = 30

  # Activation policy: NEVER for cost optimization (manual start/stop)
  # Kestra can be started on-demand when workflow execution is needed
  activation_policy = "NEVER"

  # Backup configuration
  backup_start_time              = var.sql_backup_start_time
  backup_retained_backups        = 7
  transaction_log_retention_days = 7

  # Network configuration
  ipv4_enabled = true

  # Database flags for PostgreSQL
  max_connections = "100"

  # Maintenance window
  maintenance_window_day          = 7
  maintenance_window_hour         = 3
  maintenance_window_update_track = "stable"

  # Create database user for Kestra
  # NOTE: Disabled initially to avoid "instance not running" errors
  # User will be created manually when instance is started
  create_user   = false
  user_name     = "kestra"
  user_password = random_password.kestra_db_password.result
}

# Generate random password for Kestra database user
resource "random_password" "kestra_db_password" {
  length  = 32
  special = true
}

# Store Kestra DB password in Secret Manager
resource "google_secret_manager_secret" "kestra_db_password" {
  project   = var.project_id
  secret_id = "KESTRA_DB_PASSWORD_${var.env}"

  replication {
    auto {}
  }

  labels = {
    app         = "kestra"
    environment = var.env
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret_version" "kestra_db_password" {
  secret      = google_secret_manager_secret.kestra_db_password.id
  secret_data = random_password.kestra_db_password.result
}

# Grant Secret Manager access to the deployer service account
resource "google_secret_manager_secret_iam_member" "kestra_db_password_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.kestra_db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.chatgpt_deployer_sa}"
}
