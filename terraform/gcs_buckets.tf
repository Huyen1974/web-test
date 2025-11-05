# GCS Buckets for web-test infrastructure
# Per PHỤ LỤC D (Quy hoạch Hạ tầng Web-Test)

# State bucket - stores Terraform state
resource "google_storage_bucket" "tfstate" {
  name          = "huyen1974-web-test-tfstate"
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
