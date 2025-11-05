# GCS Buckets for web-test infrastructure
# Per PHỤ LỤC D and HP-02 (uniform_bucket_level_access)
#
# NOTE: tfstate bucket (huyen1974-web-test-tfstate) is managed by CI
# Only backup bucket is created by Terraform to avoid conflicts

resource "google_storage_bucket" "backup" {
  name                        = "huyen1974-web-test-backup"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 30
    }
  }
}
