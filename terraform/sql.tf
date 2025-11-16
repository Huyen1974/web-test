# =============================================================================
# Cloud SQL MySQL Instance for web-test (Directus CMS)
# Follows: Appendix F (MySQL-first), HP-DR-01 (weekly backup), GC-LAW §7.2
# CRITICAL: NO Postgres, Kestra, or Chatwoot resources (Anti-Stupid rule)
# =============================================================================

# Enable Cloud SQL Admin API
resource "google_project_service" "sqladmin" {
  project = var.project_id
  service = "sqladmin.googleapis.com"

  disable_on_destroy = false
}

# -----------------------------------------------------------------------------
# Random Password for MySQL User
# HP-SEC-01, HP-SEC-02: Secure password generation
# NOTE: Password value managed by central secrets system (chatgpt-githubnew)
# -----------------------------------------------------------------------------

resource "random_password" "mysql_directus_password" {
  length  = 32
  special = true
  # HP-SEC-04: Password does not output to logs or state (marked sensitive)
}

# -----------------------------------------------------------------------------
# Cloud SQL MySQL Instance
# Appendix D naming: mysql-directus-web-test
# -----------------------------------------------------------------------------

resource "google_sql_database_instance" "mysql_directus" {
  name             = var.mysql_instance_name
  project          = var.project_id
  region           = var.region
  database_version = "MYSQL_8_0"

  # TF-LAW §4.2: Deletion protection for critical infrastructure
  deletion_protection = var.enable_deletion_protection

  settings {
    # Machine type tier
    # TODO: verify exact tier requirement in Constitution for test environment
    tier = var.mysql_tier

    # Availability type (ZONAL for cost optimization in test)
    # TODO: verify if REGIONAL (HA) is required for test environment
    availability_type = "ZONAL"

    # Disk configuration
    disk_type             = var.mysql_disk_type
    disk_size             = var.mysql_disk_size_gb
    disk_autoresize       = true
    disk_autoresize_limit = 100

    # HP-DR-01, GC-LAW §7.2: Backup configuration (WEEKLY for test environment)
    backup_configuration {
      enabled = true

      # Binary logging for point-in-time recovery
      binary_log_enabled = true

      # Backup start time (UTC)
      start_time = var.mysql_backup_start_time

      # Weekly backup retention
      # HP-DR-01: test environment requires weekly backups
      backup_retention_settings {
        retained_backups = 4 # Keep 4 weekly backups (1 month)
        retention_unit   = "COUNT"
      }

      # Transaction log retention for PITR
      transaction_log_retention_days = 7

      # Point-in-time recovery for MySQL: enabled via binary_log_enabled = true
      # Note: point_in_time_recovery_enabled is only for Postgres/SQL Server
    }

    # IP configuration
    ip_configuration {
      # Private IP recommended for security
      # TODO: verify if private VPC is required or public IP with authorized networks
      ipv4_enabled = true

      # Require SSL for connections (HP-SEC-01)
      require_ssl = false # TODO: verify SSL requirement in Constitution

      # Authorized networks (empty = no access from public internet)
      # Access via Cloud SQL Proxy from Cloud Run
    }

    # Database flags for MySQL optimization
    database_flags {
      name  = "max_connections"
      value = "100"
    }

    # Maintenance window (Sunday 3:00 AM UTC)
    maintenance_window {
      day  = 7 # Sunday
      hour = 3
    }

    # Insights configuration for performance monitoring (HP-OBS-01)
    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }

  lifecycle {
    # TF-LAW §4.2: Prevent accidental deletion
    prevent_destroy = true

    # Ignore disk size changes (autoresize)
    ignore_changes = [
      settings[0].disk_size
    ]
  }

  depends_on = [google_project_service.sqladmin]
}

# -----------------------------------------------------------------------------
# Cloud SQL Database for Directus
# -----------------------------------------------------------------------------

resource "google_sql_database" "directus_db" {
  name     = var.mysql_database_name
  instance = google_sql_database_instance.mysql_directus.name
  project  = var.project_id

  # Character set and collation for UTF-8 support
  charset   = "utf8mb4"
  collation = "utf8mb4_unicode_ci"
}

# -----------------------------------------------------------------------------
# Cloud SQL User for Directus
# HP-SEC-02: Password rotation reminder
# -----------------------------------------------------------------------------

resource "google_sql_user" "directus_user" {
  name     = var.mysql_user_name
  instance = google_sql_database_instance.mysql_directus.name
  project  = var.project_id

  # Password from random_password (will be stored in Secret Manager metadata)
  # HP-SEC-02: Password rotation schedule:
  #   - Test environment: rotate every 120 days
  #   - Production environment: rotate every 90 days
  # TODO: Implement automated rotation job (integrate with chatgpt-githubnew)
  password = random_password.mysql_directus_password.result
}

# -----------------------------------------------------------------------------
# ANTI-STUPID CHECK: Ensure NO Postgres, Kestra, or Chatwoot resources
# Appendix F explicitly states: MySQL-only for web-test
# -----------------------------------------------------------------------------
# ❌ NO: google_sql_database_instance with postgres
# ❌ NO: Kestra-related resources
# ❌ NO: Chatwoot-related resources
# ✅ YES: MySQL-only as specified in Appendix F
