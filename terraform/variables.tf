# Variables for web-test infrastructure
# Per PHỤ LỤC D and Task #0347

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "asia-southeast1"
}

variable "env" {
  description = "Environment (test or production)"
  type        = string
  default     = "test"
}
