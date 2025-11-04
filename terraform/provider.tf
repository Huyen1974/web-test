# Provider configuration per TF-LAW §8
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

# Data source for project information
data "google_project" "current" {
  project_id = var.project_id
}
