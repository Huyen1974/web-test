terraform {
  required_version = ">= 1.5.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5.1"
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
