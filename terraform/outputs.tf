# Outputs for web-test infrastructure

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

output "artifact_registry_repository" {
  description = "Artifact Registry repository for web-test"
  value = {
    id       = google_artifact_registry_repository.web_test_docker_repo.repository_id
    name     = google_artifact_registry_repository.web_test_docker_repo.name
    location = google_artifact_registry_repository.web_test_docker_repo.location
  }
}

output "mysql_instance" {
  description = "MySQL instance details for Directus"
  value = {
    name            = module.mysql_directus.instance_name
    connection_name = module.mysql_directus.instance_connection_name
    region          = var.sql_region
    database_name   = module.mysql_directus.database_name
    tier            = "db-f1-micro"
  }
  sensitive = false
}

output "directus_service_url" {
  description = "Cloud Run service URL for Directus"
  value       = module.directus_service.service_url
}

output "qdrant_endpoint" {
  description = "Qdrant cluster endpoint"
  value       = "https://${var.qdrant_cluster_id}.qdrant.tech"
}

output "qdrant_secret_name" {
  description = "Qdrant API key secret name"
  value       = google_secret_manager_secret.qdrant_api.secret_id
}

# Sprint 2: Kestra outputs
output "postgres_kestra_instance" {
  description = "PostgreSQL instance details for Kestra"
  value = {
    name            = module.postgres_kestra.instance_name
    connection_name = module.postgres_kestra.instance_connection_name
    region          = var.sql_region
    database_name   = module.postgres_kestra.database_name
    tier            = "db-f1-micro"
  }
  sensitive = false
}

output "kestra_service_url" {
  description = "Cloud Run service URL for Kestra"
  value       = module.kestra_service.service_url
}

output "kestra_db_password_secret" {
  description = "Secret name for Kestra database password"
  value       = "kestra-db-password-test"
  sensitive   = false
}
