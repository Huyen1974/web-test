# Variables for web-test infrastructure
# Per PHỤ LỤC D (Quy hoạch Hạ tầng Web-Test)

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = ""
}

variable "region" {
  description = "GCP Region for resources"
  type        = string
  default     = "asia-southeast1"
}

variable "env" {
  description = "Environment (test/staging/prod)"
  type        = string
  default     = "test"
}
