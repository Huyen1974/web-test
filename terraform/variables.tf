variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-east4"
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

variable "qdrant_cluster_id" {
  description = "Qdrant cluster ID"
  type        = string
}


variable "qdrant_api_key" {
  description = "Qdrant API key"
  type        = string
  sensitive   = true
}

variable "billing_account_id" {
  description = "GCP Billing Account ID (e.g., 000000-000000-000000)"
  type        = string
  default     = ""
}

variable "alert_email" {
  description = "Email address to receive alert notifications"
  type        = string
  default     = "ad-alerts@example.com"
}

variable "run_service_name" {
  description = "Cloud Run service name to monitor"
  type        = string
  default     = "agent-data-test"
}
