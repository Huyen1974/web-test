# GCS Buckets per PHỤ LỤC D, Điều 3
# Uniform Bucket-Level Access per HP-02

# Terraform state bucket
resource "google_storage_bucket" "tfstate" {
  name     = "huyen1974-web-test-tfstate"
  location = var.region

  uniform_bucket_level_access = true
  versioning {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Backup bucket for SQL/Qdrant backups
resource "google_storage_bucket" "backup" {
  name     = "huyen1974-web-test-backup"
  location = var.region

  uniform_bucket_level_access = true
  versioning {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }
}
