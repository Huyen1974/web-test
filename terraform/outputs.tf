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
    name            = google_sql_database_instance.mysql_directus.name
    connection_name = google_sql_database_instance.mysql_directus.connection_name
    region          = var.sql_region
    database_name   = "directus"
    tier            = google_sql_database_instance.mysql_directus.settings[0].tier
  }
  sensitive = false
}

output "directus_service_url" {
  description = "Cloud Run service URL for Directus"
  value       = google_cloud_run_v2_service.directus.uri
}

output "cloud_scheduler_jobs" {
  description = "Cloud Scheduler jobs for MySQL start/stop"
  value = {
    start_job = google_cloud_scheduler_job.mysql_directus_start.name
    stop_job  = google_cloud_scheduler_job.mysql_directus_stop.name
  }
}

output "qdrant_endpoint" {
  description = "Qdrant cluster endpoint"
  value       = "https://${var.qdrant_cluster_id}.qdrant.tech"
}

output "qdrant_secret_name" {
  description = "Qdrant API key secret name"
  value       = google_secret_manager_secret.qdrant_api.secret_id
}
