# =============================================================================
# Terraform Outputs for web-test Infrastructure
# Provides essential information for subsequent deployment steps
# =============================================================================

# -----------------------------------------------------------------------------
# Project Information
# -----------------------------------------------------------------------------

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "Primary GCP region"
  value       = var.region
}

output "environment" {
  description = "Environment (test/production)"
  value       = var.environment
}

# -----------------------------------------------------------------------------
# Cloud SQL MySQL Outputs
# -----------------------------------------------------------------------------

output "mysql_instance_name" {
  description = "Cloud SQL MySQL instance name"
  value       = google_sql_database_instance.mysql_directus.name
}

output "mysql_instance_connection_name" {
  description = "Cloud SQL instance connection name (for Cloud SQL Proxy)"
  value       = google_sql_database_instance.mysql_directus.connection_name
}

output "mysql_instance_self_link" {
  description = "Cloud SQL instance self link (full GCP resource path)"
  value       = google_sql_database_instance.mysql_directus.self_link
}

output "mysql_instance_ip_address" {
  description = "Cloud SQL instance IP address (first IP)"
  value       = length(google_sql_database_instance.mysql_directus.ip_address) > 0 ? google_sql_database_instance.mysql_directus.ip_address[0].ip_address : null
}

output "mysql_database_name" {
  description = "MySQL database name for Directus"
  value       = google_sql_database.directus_db.name
}

output "mysql_user_name" {
  description = "MySQL user name for Directus"
  value       = google_sql_user.directus_user.name
  sensitive   = false # Username is not sensitive
}

# -----------------------------------------------------------------------------
# GCS Buckets Outputs
# -----------------------------------------------------------------------------

output "tfstate_bucket_name" {
  description = "GCS bucket name for Terraform state"
  value       = google_storage_bucket.tfstate.name
}

output "tfstate_bucket_url" {
  description = "GCS bucket URL for Terraform state"
  value       = google_storage_bucket.tfstate.url
}

output "backup_bucket_name" {
  description = "GCS bucket name for backups"
  value       = google_storage_bucket.backup.name
}

output "backup_bucket_url" {
  description = "GCS bucket URL for backups"
  value       = google_storage_bucket.backup.url
}

# -----------------------------------------------------------------------------
# Artifact Registry Outputs
# -----------------------------------------------------------------------------

output "artifact_registry_repository_id" {
  description = "Artifact Registry repository ID"
  value       = google_artifact_registry_repository.web_test_artifacts.repository_id
}

output "artifact_registry_repository_name" {
  description = "Artifact Registry repository full name"
  value       = google_artifact_registry_repository.web_test_artifacts.name
}

output "artifact_registry_repository_location" {
  description = "Artifact Registry repository location"
  value       = google_artifact_registry_repository.web_test_artifacts.location
}

# Formatted Docker image path for convenience
output "artifact_registry_docker_path" {
  description = "Docker image path prefix for pushing/pulling images"
  value       = "${google_artifact_registry_repository.web_test_artifacts.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.web_test_artifacts.repository_id}"
}

# -----------------------------------------------------------------------------
# Secret Manager Outputs (Metadata Only)
# HP-05: Secret values are NOT exposed in outputs
# -----------------------------------------------------------------------------

output "secret_mysql_password_name" {
  description = "Secret Manager secret name for MySQL password (metadata only)"
  value       = google_secret_manager_secret.directus_mysql_password.secret_id
}

output "secret_admin_key_name" {
  description = "Secret Manager secret name for Directus admin key (metadata only)"
  value       = google_secret_manager_secret.directus_admin_key.secret_id
}

output "secret_secret_key_name" {
  description = "Secret Manager secret name for Directus secret key (metadata only)"
  value       = google_secret_manager_secret.directus_secret_key.secret_id
}

# -----------------------------------------------------------------------------
# Monitoring Dashboard Output
# -----------------------------------------------------------------------------

output "monitoring_dashboard_name" {
  description = "Monitoring dashboard name (if created)"
  value       = var.enable_monitoring_dashboard ? google_monitoring_dashboard.web_test_dashboard[0].id : null
}

# -----------------------------------------------------------------------------
# Service Account Information
# -----------------------------------------------------------------------------

output "service_account_email" {
  description = "Service account email for deployments (reference only)"
  value       = "chatgpt-deployer@${var.project_id}.iam.gserviceaccount.com"
}

# -----------------------------------------------------------------------------
# IMPORTANT NOTES FOR OUTPUTS
# -----------------------------------------------------------------------------
# 1. Security Considerations:
#    - NO secret values are exposed in outputs
#    - Only metadata (secret names, IDs) are provided
#    - Actual secret values obtained via Secret Manager API
#
# 2. Connection Information:
#    - MySQL connection via Cloud SQL Proxy using connection_name
#    - Docker images pushed to artifact_registry_docker_path
#    - Backups stored in backup_bucket_name
#
# 3. Next Steps Integration:
#    - Use mysql_instance_connection_name for Cloud Run services
#    - Use artifact_registry_docker_path for image push/pull
#    - Reference secret names for Cloud Run environment variables
#
# 4. HP-05 Compliance:
#    - Secret values managed by chatgpt-githubnew
#    - Terraform outputs contain NO sensitive data
#    - All passwords marked as sensitive in resources
