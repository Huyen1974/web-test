terraform {
  required_version = ">= 1.5.7" # Note: CI uses >= 1.8.5
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.84"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5.1"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4.0"
    }
    github = {
      source  = "integrations/github"
      version = ">= 5.40.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = "us-east4"
}

# Data source for project information
data "google_project" "current" {
  project_id = var.project_id
}
