# =============================================================================
# Terraform Provider Configuration - HP-02 (Absolute IaC)
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# Main Google provider for stable resources
provider "google" {
  project = var.project_id
  region  = var.region
}

# Google Beta provider for beta/preview features
provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Data source for project information
data "google_project" "current" {
  project_id = var.project_id
}
