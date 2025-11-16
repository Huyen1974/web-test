# MySQL Cloud SQL Instance Module - Variables
# Optimized for Appendix F: MySQL First (db-g1-small, SSD, ALWAYS ON)

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for the SQL instance"
  type        = string
}

variable "instance_name" {
  description = "Name of the Cloud SQL instance"
  type        = string
}

variable "database_version" {
  description = "MySQL database version"
  type        = string
  default     = "MYSQL_8_0"
}

variable "database_name" {
  description = "Name of the default database to create"
  type        = string
}

variable "tier" {
  description = "Machine type tier (Appendix F: db-g1-small)"
  type        = string
  default     = "db-g1-small"
}

variable "disk_type" {
  description = "Disk type (Appendix F: PD_SSD for fast startup)"
  type        = string
  default     = "PD_SSD"
}

variable "disk_size" {
  description = "Disk size in GB (Appendix F: 10GB)"
  type        = number
  default     = 10
}

variable "disk_autoresize" {
  description = "Enable disk autoresize"
  type        = bool
  default     = true
}

variable "disk_autoresize_limit" {
  description = "Maximum disk size in GB"
  type        = number
  default     = 50
}

variable "activation_policy" {
  description = "Activation policy (Appendix F: ALWAYS for ALWAYS ON)"
  type        = string
  default     = "ALWAYS"
}

variable "backup_start_time" {
  description = "Backup start time in HH:MM format"
  type        = string
  default     = "01:00"
}

variable "backup_retained_backups" {
  description = "Number of backups to retain"
  type        = number
  default     = 7
}

variable "transaction_log_retention_days" {
  description = "Transaction log retention in days"
  type        = number
  default     = 7
}

variable "ipv4_enabled" {
  description = "Enable IPv4 for public access"
  type        = bool
  default     = true
}

variable "private_network" {
  description = "VPC network for private IP (optional)"
  type        = string
  default     = ""
}

variable "authorized_networks" {
  description = "Authorized networks for access"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "max_connections" {
  description = "Maximum number of connections"
  type        = string
  default     = "100"
}

variable "maintenance_window_day" {
  description = "Maintenance window day (1=Mon, 7=Sun)"
  type        = number
  default     = 7
}

variable "maintenance_window_hour" {
  description = "Maintenance window hour (0-23)"
  type        = number
  default     = 3
}

variable "maintenance_window_update_track" {
  description = "Maintenance update track"
  type        = string
  default     = "stable"
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

variable "create_user" {
  description = "Whether to create database user"
  type        = bool
  default     = true
}

variable "user_name" {
  description = "Database user name"
  type        = string
  default     = "app_user"
}

variable "user_password" {
  description = "Database user password"
  type        = string
  sensitive   = true
  default     = ""
}
