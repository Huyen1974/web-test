# ==============================================================================
# Outputs for web-test Infrastructure - Phase 1
# ==============================================================================

# ------------------------------------------------------------------------------
# Project Information
# ------------------------------------------------------------------------------

output "project_id" {
  description = "The GCP project ID"
  value       = var.project_id
}

output "region" {
  description = "The GCP region"
  value       = var.region
}

output "environment" {
  description = "The environment"
  value       = var.env
}

# ------------------------------------------------------------------------------
# MySQL Database
# ------------------------------------------------------------------------------

output "mysql_instance" {
  description = "MySQL instance details for Directus (Appendix F: db-g1-small, SSD, ALWAYS ON)"
  value = {
    name            = module.mysql_directus.instance_name
    connection_name = module.mysql_directus.instance_connection_name
    region          = var.region
    database_name   = module.mysql_directus.database_name
    tier            = var.sql_tier
    disk_type       = "PD_SSD"
    disk_size       = var.sql_disk_size
    activation      = "ALWAYS"
  }
  sensitive = false
}

# ------------------------------------------------------------------------------
# Artifact Registry
# ------------------------------------------------------------------------------

output "artifact_registry_repository" {
  description = "Artifact Registry repository for web-test"
  value = {
    id       = google_artifact_registry_repository.web_test_docker_repo.repository_id
    name     = google_artifact_registry_repository.web_test_docker_repo.name
    location = google_artifact_registry_repository.web_test_docker_repo.location
    format   = google_artifact_registry_repository.web_test_docker_repo.format
  }
}

# ------------------------------------------------------------------------------
# Cloud Run Services
# ------------------------------------------------------------------------------

output "directus_service" {
  description = "Cloud Run service details for Directus CMS"
  value = {
    name = google_cloud_run_v2_service.directus.name
    url  = google_cloud_run_v2_service.directus.uri
  }
}

# ------------------------------------------------------------------------------
# Secrets (Metadata Only - HP-05 Compliance)
# ------------------------------------------------------------------------------

output "secrets" {
  description = "Secret Manager secret IDs (metadata only per HP-05)"
  value = {
    directus_key         = google_secret_manager_secret.directus_key.secret_id
    directus_secret      = google_secret_manager_secret.directus_secret.secret_id
    directus_db_password = google_secret_manager_secret.directus_db_password.secret_id
  }
  sensitive = false
}

# HP-05 COMPLIANCE: Secret values for external injection
# These outputs allow external systems to inject secret values after terraform apply
output "directus_key_value" {
  description = "Directus KEY value for external injection into Secret Manager"
  value       = random_password.directus_key.result
  sensitive   = true
}

output "directus_secret_value" {
  description = "Directus SECRET value for external injection into Secret Manager"
  value       = random_password.directus_secret.result
  sensitive   = true
}

output "directus_db_password_value" {
  description = "Directus DB password value for external injection into Secret Manager"
  value       = random_password.directus_db_password.result
  sensitive   = true
}
