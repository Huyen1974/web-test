locals {
  lark_fn_name      = "lark-token-generator"
  lark_fn_entry     = "generate_lark_token"
  lark_source_dir   = abspath("${path.root}/../lark-token-generator")
  lark_archive_path = "${path.module}/.build/lark-token-generator.zip"
}

data "archive_file" "lark_token_src" {
  type        = "zip"
  source_dir  = local.lark_source_dir
  output_path = local.lark_archive_path
}

resource "google_storage_bucket_object" "lark_token_src" {
  name         = "functions/${local.lark_fn_name}.zip"
  bucket       = google_storage_bucket.huyen1974_agent_data_artifacts_test.name
  content_type = "application/zip"
  source       = data.archive_file.lark_token_src.output_path
}

resource "google_cloudfunctions2_function" "lark_token" {
  name        = local.lark_fn_name
  location    = var.region
  description = "Generate and rotate Lark app access token"

  build_config {
    runtime     = "python311"
    entry_point = local.lark_fn_entry
    source {
      storage_source {
        bucket = google_storage_bucket_object.lark_token_src.bucket
        object = google_storage_bucket_object.lark_token_src.name
      }
    }
  }

  service_config {
    available_memory      = "256M"
    timeout_seconds       = 120
    ingress_settings      = "ALLOW_INTERNAL_AND_GCLB"
    service_account_email = "${data.google_project.cur.project_id}@appspot.gserviceaccount.com"
    environment_variables = {
      GCP_PROJECT = var.project_id
    }
  }
}

resource "google_cloud_run_service_iam_member" "lark_token_invoker" {
  location = google_cloudfunctions2_function.lark_token.location
  project  = var.project_id
  service  = google_cloudfunctions2_function.lark_token.service_config[0].service
  role     = "roles/run.invoker"
  member   = "serviceAccount:${data.google_project.cur.project_id}@appspot.gserviceaccount.com"
}

resource "google_cloud_scheduler_job" "lark_token_refresh" {
  name        = "lark-token-refresh-job"
  region      = var.region
  description = "Refresh Lark token every 110 minutes"
  schedule    = "*/110 * * * *"
  time_zone   = "Etc/UTC"

  http_target {
    http_method = "POST"
    uri         = google_cloudfunctions2_function.lark_token.service_config[0].uri

    oidc_token {
      service_account_email = "${data.google_project.cur.project_id}@appspot.gserviceaccount.com"
    }
  }
}
