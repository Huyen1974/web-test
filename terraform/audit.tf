# =============================================================================
# Cloud Audit Logs Configuration for web-test
# Follows: HP-SEC-03 (audit logging), enables compliance and security monitoring
# =============================================================================

# -----------------------------------------------------------------------------
# Project-level Audit Log Configuration
# HP-SEC-03: Enable Cloud Audit Logs with minimum DATA_WRITE coverage
# -----------------------------------------------------------------------------

resource "google_project_iam_audit_config" "project_audit" {
  count   = var.enable_audit_logs ? 1 : 0
  project = var.project_id
  service = "allServices"

  # Admin Read: captures admin/configuration changes
  audit_log_config {
    log_type = "ADMIN_READ"
  }

  # Data Write: captures data modification operations (HP-SEC-03 requirement)
  audit_log_config {
    log_type = "DATA_WRITE"
  }

  # Data Read: captures data access operations
  # Note: Can generate high volume of logs, enable with care
  # TODO: verify if DATA_READ is required in Constitution
  audit_log_config {
    log_type = "DATA_READ"

    # Exemptions for high-volume read operations (optional)
    # Uncomment and adjust as needed
    # exempted_members = [
    #   "serviceAccount:chatgpt-deployer@${var.project_id}.iam.gserviceaccount.com",
    # ]
  }
}

# -----------------------------------------------------------------------------
# Service-specific Audit Log Configuration (Cloud SQL)
# Enhanced logging for database operations
# -----------------------------------------------------------------------------

resource "google_project_iam_audit_config" "cloudsql_audit" {
  count   = var.enable_audit_logs ? 1 : 0
  project = var.project_id
  service = "sqladmin.googleapis.com"

  # Admin Read: database configuration changes
  audit_log_config {
    log_type = "ADMIN_READ"
  }

  # Data Write: database modifications
  audit_log_config {
    log_type = "DATA_WRITE"
  }

  # Data Read: database queries (optional, high volume)
  # TODO: verify if DATA_READ for Cloud SQL is required
  # audit_log_config {
  #   log_type = "DATA_READ"
  # }
}

# -----------------------------------------------------------------------------
# Service-specific Audit Log Configuration (Secret Manager)
# Track secret access and modifications
# -----------------------------------------------------------------------------

resource "google_project_iam_audit_config" "secretmanager_audit" {
  count   = var.enable_audit_logs ? 1 : 0
  project = var.project_id
  service = "secretmanager.googleapis.com"

  # Admin Read: secret metadata changes
  audit_log_config {
    log_type = "ADMIN_READ"
  }

  # Data Write: secret value updates
  audit_log_config {
    log_type = "DATA_WRITE"
  }

  # Data Read: secret access (important for security monitoring)
  audit_log_config {
    log_type = "DATA_READ"
  }
}

# -----------------------------------------------------------------------------
# Service-specific Audit Log Configuration (Cloud Storage)
# Track GCS bucket operations
# -----------------------------------------------------------------------------

resource "google_project_iam_audit_config" "storage_audit" {
  count   = var.enable_audit_logs ? 1 : 0
  project = var.project_id
  service = "storage.googleapis.com"

  # Admin Read: bucket configuration changes
  audit_log_config {
    log_type = "ADMIN_READ"
  }

  # Data Write: object uploads/deletes
  audit_log_config {
    log_type = "DATA_WRITE"
  }

  # Data Read: object downloads (optional, can be high volume)
  # TODO: verify if DATA_READ for GCS is required
  # audit_log_config {
  #   log_type = "DATA_READ"
  # }
}

# -----------------------------------------------------------------------------
# IMPORTANT NOTES FOR AUDIT LOGGING
# -----------------------------------------------------------------------------
# 1. HP-SEC-03 Compliance
#    - Minimum requirement: DATA_WRITE for all services
#    - ADMIN_READ captures configuration changes
#    - DATA_READ optional but recommended for security monitoring
#
# 2. Log Volume and Cost
#    - DATA_READ can generate significant log volume
#    - Consider exempting service accounts for high-volume operations
#    - Monitor Cloud Logging costs in billing reports
#
# 3. Log Retention
#    - Default: 30 days in Cloud Logging
#    - Extended retention: export to GCS bucket or BigQuery
#    - TODO: configure log sink for long-term retention if required
#
# 4. Security Monitoring Integration
#    - Logs available for Security Command Center
#    - Can be integrated with SIEM systems
#    - Enable alerting for suspicious activities
#
# 5. TODO Items
#    - Verify if DATA_READ is required per Constitution
#    - Configure log sinks for long-term retention
#    - Set up alerting policies for critical events
#    - Review exempted_members list for high-volume services
