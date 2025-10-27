variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for the database instance"
  type        = string
  default     = "asia-southeast1"
}

variable "instance_name" {
  description = "Name of the Cloud SQL instance"
  type        = string
}

variable "database_version" {
  description = "Database version (e.g., MYSQL_8_0, POSTGRES_15)"
  type        = string
  default     = "MYSQL_8_0"
  validation {
    condition     = can(regex("^(MYSQL|POSTGRES)_", var.database_version))
    error_message = "Database version must start with MYSQL_ or POSTGRES_."
  }
}

variable "database_name" {
  description = "Name of the default database to create"
  type        = string
}

variable "disk_type" {
  description = "Disk type for the instance"
  type        = string
  default     = "PD_SSD"
}

variable "disk_size" {
  description = "Disk size in GB"
  type        = number
  default     = 10
}

variable "disk_autoresize" {
  description = "Enable automatic disk resize"
  type        = bool
  default     = true
}

variable "disk_autoresize_limit" {
  description = "Maximum disk size in GB for autoresize"
  type        = number
  default     = 50
}

variable "backup_start_time" {
  description = "Start time for backups in HH:MM format"
  type        = string
  default     = "03:00"
}

variable "backup_retained_backups" {
  description = "Number of backups to retain"
  type        = number
  default     = 7
}

variable "transaction_log_retention_days" {
  description = "Number of days to retain transaction logs"
  type        = number
  default     = 7
}

variable "ipv4_enabled" {
  description = "Enable IPv4 for the instance"
  type        = bool
  default     = true
}

variable "private_network" {
  description = "VPC network for private IP (optional)"
  type        = string
  default     = ""
}

variable "authorized_networks" {
  description = "List of authorized networks"
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
  description = "Day of week for maintenance (1-7, 1=Monday)"
  type        = number
  default     = 7
}

variable "maintenance_window_hour" {
  description = "Hour of day for maintenance (0-23)"
  type        = number
  default     = 3
}

variable "maintenance_window_update_track" {
  description = "Update track for maintenance"
  type        = string
  default     = "stable"
}

variable "create_user" {
  description = "Create a database user"
  type        = bool
  default     = false
}

variable "user_name" {
  description = "Database user name"
  type        = string
  default     = ""
}

variable "user_password" {
  description = "Database user password"
  type        = string
  default     = ""
  sensitive   = true
}

variable "activation_policy" {
  description = "Activation policy for the instance (ALWAYS or NEVER). Use ALWAYS for new instances, NEVER for cost optimization on existing instances."
  type        = string
  default     = "ALWAYS"
  validation {
    condition     = contains(["ALWAYS", "NEVER"], var.activation_policy)
    error_message = "Activation policy must be either ALWAYS or NEVER."
  }
}
