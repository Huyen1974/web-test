# GCS Buckets for agent-data-langroid
# Using secure_gcs_bucket module from platform-infra

locals {
  bucket_types = {
    artifacts        = "artifacts"
    knowledge        = "knowledge"
    logs             = "logs"
    qdrant_snapshots = "qdrant-snapshots"
    source           = "source"
    tfstate          = "tfstate"
  }
}

module "bucket_artifacts" {
  source = "github.com/Huyen1974/platform-infra//terraform/modules/secure_gcs_bucket?ref=v1.0.0"

  project_id    = var.project_id
  bucket_name   = "huyen1974-agent-data-artifacts-${var.env}"
  location      = "asia-southeast1"
  storage_class = "STANDARD"
  force_destroy = false

  versioning_enabled = true

  labels = {
    environment = var.env
    project     = "agent-data-langroid"
    managed_by  = "terraform"
    bucket_type = local.bucket_types.artifacts
  }
}

module "bucket_knowledge" {
  source = "github.com/Huyen1974/platform-infra//terraform/modules/secure_gcs_bucket?ref=v1.0.0"

  project_id    = var.project_id
  bucket_name   = "huyen1974-agent-data-knowledge-${var.env}"
  location      = "asia-southeast1"
  storage_class = "STANDARD"
  force_destroy = false

  versioning_enabled = true

  labels = {
    environment = var.env
    project     = "agent-data-langroid"
    managed_by  = "terraform"
    bucket_type = local.bucket_types.knowledge
  }
}

module "bucket_logs" {
  source = "github.com/Huyen1974/platform-infra//terraform/modules/secure_gcs_bucket?ref=v1.0.0"

  project_id    = var.project_id
  bucket_name   = "huyen1974-agent-data-logs-${var.env}"
  location      = "asia-southeast1"
  storage_class = "STANDARD"
  force_destroy = false

  versioning_enabled = true

  labels = {
    environment = var.env
    project     = "agent-data-langroid"
    managed_by  = "terraform"
    bucket_type = local.bucket_types.logs
  }
}

module "bucket_qdrant_snapshots" {
  source = "github.com/Huyen1974/platform-infra//terraform/modules/secure_gcs_bucket?ref=v1.0.0"

  project_id    = var.project_id
  bucket_name   = "huyen1974-agent-data-qdrant-snapshots-${var.env}"
  location      = "asia-southeast1"
  storage_class = "STANDARD"
  force_destroy = false

  versioning_enabled = true

  labels = {
    environment = var.env
    project     = "agent-data-langroid"
    managed_by  = "terraform"
    bucket_type = local.bucket_types.qdrant_snapshots
  }
}

module "bucket_source" {
  source = "github.com/Huyen1974/platform-infra//terraform/modules/secure_gcs_bucket?ref=v1.0.0"

  project_id    = var.project_id
  bucket_name   = "huyen1974-agent-data-source-${var.env}"
  location      = "asia-southeast1"
  storage_class = "STANDARD"
  force_destroy = false

  versioning_enabled = true

  labels = {
    environment = var.env
    project     = "agent-data-langroid"
    managed_by  = "terraform"
    bucket_type = local.bucket_types.source
  }
}

module "bucket_tfstate" {
  source = "github.com/Huyen1974/platform-infra//terraform/modules/secure_gcs_bucket?ref=v1.0.0"

  project_id    = var.project_id
  bucket_name   = "huyen1974-agent-data-tfstate-${var.env}"
  location      = "asia-southeast1"
  storage_class = "STANDARD"
  force_destroy = false

  versioning_enabled = true

  labels = {
    environment = var.env
    project     = "agent-data-langroid"
    managed_by  = "terraform"
    bucket_type = local.bucket_types.tfstate
  }
}
