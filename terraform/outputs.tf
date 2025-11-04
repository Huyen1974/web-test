# Outputs for web-test infrastructure

# SQL instances
output "mysql_instance_name" {
  description = "MySQL instance name"
  value       = google_sql_database_instance.mysql_directus.name
}

output "postgres_instance_name" {
  description = "Postgres instance name"
  value       = google_sql_database_instance.postgres_kestra.name
}

output "mysql_connection_name" {
  description = "MySQL instance connection name"
  value       = google_sql_database_instance.mysql_directus.connection_name
}

output "postgres_connection_name" {
  description = "Postgres instance connection name"
  value       = google_sql_database_instance.postgres_kestra.connection_name
}

# GCS buckets
output "tfstate_bucket" {
  description = "Terraform state bucket"
  value       = google_storage_bucket.tfstate.name
}

output "backup_bucket" {
  description = "Backup bucket"
  value       = google_storage_bucket.backup.name
}

# Artifact Registry
output "artifact_registry_id" {
  description = "Artifact Registry repository ID"
  value       = google_artifact_registry_repository.web_test.repository_id
}

# Cloud Run services
output "directus_url" {
  description = "Directus service URL"
  value       = google_cloud_run_v2_service.directus.uri
}

output "kestra_url" {
  description = "Kestra service URL"
  value       = google_cloud_run_v2_service.kestra.uri
}

output "chatwoot_url" {
  description = "Chatwoot service URL"
  value       = google_cloud_run_v2_service.chatwoot.uri
}
