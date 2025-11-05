# Main Terraform configuration for web-test infrastructure
# Per PHỤ LỤC D (Quy hoạch Hạ tầng Web-Test) and Task #0347 (Cấu hình Chuẩn)
#
# This is a clean install with organized file structure:
# - provider.tf: Provider and version constraints
# - backend.tf: GCS backend configuration
# - variables.tf: All input variables
# - gcs_buckets.tf: GCS buckets (state + backup)
# - sql_instances.tf: Cloud SQL instances (MySQL + PostgreSQL)
# - artifact_registry.tf: Artifact Registry for Docker images
# - cloud_run.tf: Cloud Run services (Directus, Kestra, Chatwoot)
#
# All resources follow:
# - Strategy: ALWAYS ON (activation_policy = "ALWAYS")
# - MySQL: db-g1-small, 10GB PD_SSD, MYSQL_8_0
# - PostgreSQL: db-f1-micro, 10GB PD_SSD, POSTGRES_15
# - Region: asia-southeast1
# - TF-LAW §8: Version pinning (Terraform ~>1.8, Google ~>4.57.0)
# - HP-02: uniform_bucket_level_access for all buckets
