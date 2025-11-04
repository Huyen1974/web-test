# Minimal Terraform configuration to satisfy CI checks
# This configuration is intentionally empty after infrastructure wipe (Task #0355)
# No resources are defined - infrastructure has been completely cleaned

terraform {
  required_version = "~> 1.8"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.57.0"
    }
  }
  backend "gcs" {}
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = ""
}

variable "env" {
  description = "Environment"
  type        = string
  default     = "test"
}

variable "qdrant_cluster_id" {
  description = "Qdrant Cluster ID"
  type        = string
  default     = ""
}

variable "qdrant_api_key" {
  description = "Qdrant API Key"
  type        = string
  default     = ""
  sensitive   = true
}

provider "google" {
  project = var.project_id
}

# No resources defined - clean state after infrastructure wipe
