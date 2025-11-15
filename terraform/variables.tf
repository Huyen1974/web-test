# ==============================================================================
# Project Configuration
# ==============================================================================

variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "github-chatgpt-ggcloud"
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "asia-southeast1"
}

variable "env" {
  description = "Environment (test/production)"
  type        = string
  default     = "test"

  validation {
    condition     = contains(["test", "production"], var.env)
    error_message = "Environment must be either 'test' or 'production'."
  }
}

# ==============================================================================
# MySQL Configuration (Appendix F: MySQL First)
# ==============================================================================

variable "sql_instance_name" {
  description = "Name for the MySQL instance for Directus"
  type        = string
  default     = "mysql-directus-web-test"
}

variable "sql_tier" {
  description = "Machine type tier for Cloud SQL (Appendix F: db-g1-small)"
  type        = string
  default     = "db-g1-small"
}

variable "sql_disk_size" {
  description = "Disk size in GB for Cloud SQL (Appendix F: 10GB SSD)"
  type        = number
  default     = 10
}

variable "sql_backup_start_time" {
  description = "Backup start time in HH:MM (24h format)"
  type        = string
  default     = "01:00"
}

# ==============================================================================
# Directus Configuration
# ==============================================================================

variable "directus_admin_email" {
  description = "Admin email for Directus CMS"
  type        = string
  default     = "admin@example.com"
}

variable "directus_image" {
  description = "Docker image for Directus"
  type        = string
  default     = "directus/directus:11.2.2"
}

# ==============================================================================
# Chatwoot Configuration (Postponed - Phase 2)
# ==============================================================================

# TODO: Uncomment when ready for Chatwoot deployment
# variable "chatwoot_image" {
#   description = "Docker image for Chatwoot"
#   type        = string
#   default     = "chatwoot/chatwoot:latest"
# }
