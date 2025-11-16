# =============================================================================
# Terraform Variables - web-test MySQL-only Infrastructure
# Follows: HP-02, Appendix D (naming), Appendix F (MySQL-first)
# =============================================================================

# -----------------------------------------------------------------------------
# Project Configuration
# -----------------------------------------------------------------------------

variable "project_id" {
  description = "GCP Project ID (github-chatgpt-ggcloud)"
  type        = string
  default     = "github-chatgpt-ggcloud"
}

variable "region" {
  description = "Primary GCP region for resources"
  type        = string
  default     = "asia-southeast1"
}

variable "environment" {
  description = "Environment (test/production)"
  type        = string
  default     = "test"

  validation {
    condition     = contains(["test", "production"], var.environment)
    error_message = "Environment must be either 'test' or 'production'."
  }
}

# -----------------------------------------------------------------------------
# Cloud SQL MySQL Configuration - Appendix F (MySQL-first)
# -----------------------------------------------------------------------------

variable "mysql_instance_name" {
  description = "Cloud SQL MySQL instance name (Appendix D naming)"
  type        = string
  default     = "mysql-directus-web-test"
}

variable "mysql_tier" {
  description = "Cloud SQL machine type tier"
  type        = string
  default     = "db-g1-small"
  # TODO: verify exact tier requirement in Constitution for test environment
  # Currently using db-g1-small as cost-effective option
}

variable "mysql_disk_size_gb" {
  description = "MySQL disk size in GB"
  type        = number
  default     = 10
}

variable "mysql_disk_type" {
  description = "MySQL disk type (PD_SSD or PD_HDD)"
  type        = string
  default     = "PD_SSD"
}

variable "mysql_backup_start_time" {
  description = "Backup start time in HH:MM format (UTC)"
  type        = string
  default     = "02:00"
}

variable "mysql_database_name" {
  description = "Database name for Directus"
  type        = string
  default     = "directus_db"
}

variable "mysql_user_name" {
  description = "Database user name for Directus"
  type        = string
  default     = "directus_user"
}

# -----------------------------------------------------------------------------
# Storage Configuration - Appendix D (naming)
# -----------------------------------------------------------------------------

variable "tfstate_bucket_name" {
  description = "GCS bucket for Terraform state"
  type        = string
  default     = "huyen1974-web-test-tfstate"
}

variable "backup_bucket_name" {
  description = "GCS bucket for backups (Directus/MySQL exports)"
  type        = string
  default     = "huyen1974-web-test-backup"
}

# -----------------------------------------------------------------------------
# Artifact Registry Configuration - Appendix D (naming)
# -----------------------------------------------------------------------------

variable "artifact_registry_name" {
  description = "Artifact Registry repository name for web-test Docker images"
  type        = string
  default     = "huyen1974-web-test-artifacts"
}

# -----------------------------------------------------------------------------
# Security & Compliance Flags
# -----------------------------------------------------------------------------

variable "enable_deletion_protection" {
  description = "Enable deletion protection for critical resources (TF-LAW §4.2)"
  type        = bool
  default     = true
}

variable "enable_audit_logs" {
  description = "Enable Cloud Audit Logs (HP-SEC-03)"
  type        = bool
  default     = true
}

variable "enable_monitoring_dashboard" {
  description = "Create monitoring dashboard (HP-OBS-01)"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Labels for Resource Organization
# -----------------------------------------------------------------------------

variable "common_labels" {
  description = "Common labels applied to all resources"
  type        = map(string)
  default = {
    project     = "web-test"
    environment = "test"
    managed_by  = "terraform"
    application = "directus-cms"
  }
}
