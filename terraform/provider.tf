# Terraform and Provider Configuration
# Per TF-LAW §8 (Version pinning requirements)

terraform {
  required_version = "~> 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.57.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 4.57.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}
