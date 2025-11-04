# Main Terraform configuration for web-test
# Resources are organized in separate files for clarity:
# - sql.tf: SQL instances (MySQL and Postgres)
# - gcs_buckets.tf: GCS buckets (tfstate and backup)
# - artifact_registry.tf: Artifact Registry
# - cloud_run.tf: Cloud Run services

# Project-level configuration
locals {
  project_id = var.project_id
  region     = var.region
  env        = var.env
}
