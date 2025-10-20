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

output "gcs_buckets" {
  description = "Map of GCS bucket purposes to their names"
  value = {
    artifacts        = module.bucket_artifacts.bucket_name
    knowledge        = module.bucket_knowledge.bucket_name
    logs             = module.bucket_logs.bucket_name
    qdrant_snapshots = module.bucket_qdrant_snapshots.bucket_name
    source           = module.bucket_source.bucket_name
    tfstate          = module.bucket_tfstate.bucket_name
  }
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository details"
  value = {
    name     = google_artifact_registry_repository.agent_data_docker_repo.name
    location = google_artifact_registry_repository.agent_data_docker_repo.location
    id       = google_artifact_registry_repository.agent_data_docker_repo.repository_id
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
