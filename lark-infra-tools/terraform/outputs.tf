output "cloud_function_uri" {
  description = "HTTPS endpoint for the Lark token generator"
  value       = google_cloudfunctions2_function.generate_lark_token.service_config[0].uri
}

output "scheduler_job_name" {
  description = "Name of the Cloud Scheduler job"
  value       = google_cloud_scheduler_job.lark_token_refresh.name
}

output "artifact_bucket" {
  description = "GCS bucket storing the Cloud Function source archive"
  value       = google_storage_bucket.function_source.name
}
