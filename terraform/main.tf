# Main Terraform configuration for web-test infrastructure
# Per PHỤ LỤC D (Quy hoạch Hạ tầng Web-Test) and Task #0377 (Clean Install All-in-One)
#
# This is a comprehensive clean install with organized file structure:
# - provider.tf: Terraform and provider version constraints
# - backend.tf: GCS backend configuration
# - variables.tf: Input variables
# - sql_instances.tf: Cloud SQL instances (MySQL + PostgreSQL, ALWAYS ON)
# - sql_databases.tf: Databases and users
# - gcs_buckets.tf: GCS backup bucket (tfstate managed by CI)
# - artifact_registry.tf: Docker image repository
# - secrets.tf: Secret Manager secrets (8 secrets with replication)
# - cloud_run.tf: Cloud Run services + Service Account + IAM
#
# All resources follow:
# - Strategy: ALWAYS ON (activation_policy = "ALWAYS")
# - MySQL: db-g1-small, 10GB PD_SSD, MYSQL_8_0
# - PostgreSQL: db-f1-micro, 10GB PD_SSD, POSTGRES_15
# - Region: asia-southeast1
# - TF-LAW §8: Version pinning (Terraform ~>1.8, Google ~>4.57.0)
# - HP-02: uniform_bucket_level_access for all buckets
#
# Security fixes applied (from Hội chẩn #0374):
# - Fix #1: NO public access (allUsers IAM bindings removed)
# - Fix #2: NO plain text passwords (using Secret Manager)
# - Fix #3: Chatwoot uses DB_* variables (not POSTGRES_*)
# - Fix #4: Cloud SQL Proxy via annotations
# - Fix #5: CI manages tfstate bucket (not in Terraform)
# - Fix #6: Removed deployer_secret_admin from CI (in deploy.yml)
