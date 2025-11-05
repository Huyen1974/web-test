# GCS Buckets for web-test infrastructure
# Per PHỤ LỤC D (Quy hoạch Hạ tầng Web-Test)
#
# Note: State bucket (huyen1974-web-test-tfstate) is managed by CI
# See .github/workflows/deploy.yml "Ensure GCS State Bucket Exists" step

# Backup bucket - stores application backups
resource "google_storage_bucket" "backup" {
  name          = "huyen1974-web-test-backup"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }
}
