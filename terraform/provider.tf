# Terraform and Provider Configuration
# Per TF-LAW §8 (Version pinning requirements)

terraform {
  required_version = "~> 1.8"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.57.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
