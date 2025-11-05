# Input variables for web-test infrastructure
# Per TF-LAW §8 and PHỤ LỤC D

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "asia-southeast1"
}

variable "env" {
  description = "Environment (test/production)"
  type        = string
  default     = "test"
}
