terraform {
  required_version = ">= 1.5.7"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.84"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5.1"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_project" "current" {
  project_id = var.project_id
}

locals {
  function_name       = "generate-lark-token"
  service_account     = var.function_service_account
  scheduler_job_name  = "lark-token-refresh-110m"
  scheduler_time_zone = var.scheduler_time_zone
}

resource "random_id" "bucket_suffix" {
  byte_length = 2
}

resource "google_storage_bucket" "function_source" {
  name                        = "${var.project_id}-lark-infra-${random_id.bucket_suffix.hex}"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true
  project                     = var.project_id
}

data "archive_file" "function_source" {
  type        = "zip"
  source_dir  = abspath("${path.module}/../src")
  output_path = "${path.module}/.terraform-build/${local.function_name}.zip"
}

resource "google_storage_bucket_object" "function_source" {
  name         = "functions/${local.function_name}.zip"
  bucket       = google_storage_bucket.function_source.name
  content_type = "application/zip"
  source       = data.archive_file.function_source.output_path
}

resource "google_cloudfunctions2_function" "generate_lark_token" {
  name        = local.function_name
  location    = var.region
  description = "Generate and store Lark access tokens"

  build_config {
    runtime     = "python311"
    entry_point = "generate_lark_token"

    source {
      storage_source {
        bucket = google_storage_bucket_object.function_source.bucket
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    service_account_email = local.service_account
    ingress_settings      = "ALLOW_ALL"
    max_instance_count    = 1
    available_memory      = "256M"
    timeout_seconds       = 60

    environment_variables = {
      GCP_PROJECT         = var.project_id
      APP_SECRET_ID       = var.lark_app_secret_id
      LARK_APP_ID         = var.lark_app_id
      NEW_TOKEN_SECRET_ID = var.lark_access_token_secret_id
      LARK_TOKEN_URL      = "https://open.larksuite.com/open-apis/auth/v3/app_access_token/internal/"
      REQUEST_TIMEOUT     = "10"
    }
  }
}

resource "google_cloud_run_service_iam_member" "invoker" {
  location = google_cloudfunctions2_function.generate_lark_token.location
  project  = var.project_id
  service  = google_cloudfunctions2_function.generate_lark_token.service_config[0].service
  role     = "roles/run.invoker"
  member   = "serviceAccount:${local.service_account}"
}
resource "google_cloud_run_service_iam_member" "public_invoker" {
  location = google_cloudfunctions2_function.generate_lark_token.location
  project  = var.project_id
  service  = google_cloudfunctions2_function.generate_lark_token.service_config[0].service
  role     = "roles/run.invoker"
  member   = "allUsers"
}


resource "google_cloud_scheduler_job" "lark_token_refresh" {
  name        = local.scheduler_job_name
  description = "Trigger Lark token refresh Cloud Function"
  schedule    = var.scheduler_cron == "*/110 * * * *" ? "every 110 minutes" : var.scheduler_cron
  time_zone   = local.scheduler_time_zone
  region      = var.region

  http_target {
    http_method = "POST"
    uri         = google_cloudfunctions2_function.generate_lark_token.service_config[0].uri

    oidc_token {
      service_account_email = local.service_account
      audience              = google_cloudfunctions2_function.generate_lark_token.service_config[0].uri
    }
  }

  depends_on = [google_cloud_run_service_iam_member.invoker]
}


resource "google_secret_manager_secret_iam_member" "app_secret_accessor" {
  project   = var.project_id
  secret_id = var.lark_app_secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.service_account}"
}

resource "google_secret_manager_secret_iam_member" "token_secret_accessor" {
  project   = var.project_id
  secret_id = var.lark_access_token_secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.service_account}"
}

resource "google_secret_manager_secret_iam_member" "token_secret_version_adder" {
  project   = var.project_id
  secret_id = var.lark_access_token_secret_id
  role      = "roles/secretmanager.secretVersionAdder"
  member    = "serviceAccount:${local.service_account}"
}

resource "google_secret_manager_secret_iam_member" "token_secret_version_manager" {
  project   = var.project_id
  secret_id = var.lark_access_token_secret_id
  role      = "roles/secretmanager.secretVersionManager"
  member    = "serviceAccount:${local.service_account}"
}
