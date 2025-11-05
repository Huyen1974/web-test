# Minimal variables for Terraform configuration
# Required by deploy.yml workflow

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "asia-southeast1"
}

variable "env" {
  description = "Environment (test/production)"
  type        = string
  default     = "test"
}
