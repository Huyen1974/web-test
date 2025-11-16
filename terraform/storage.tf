# =============================================================================
# GCS Buckets for web-test Infrastructure
# Follows: TF-LAW §4.2 (prevent_destroy), §4.3 (UBLA), Appendix D (naming)
# =============================================================================

# Enable Cloud Storage API
resource "google_project_service" "storage" {
  project = var.project_id
  service = "storage.googleapis.com"

  disable_on_destroy = false
}

# -----------------------------------------------------------------------------
# GCS Bucket for Terraform State
# Appendix D naming: huyen1974-web-test-tfstate
# -----------------------------------------------------------------------------

resource "google_storage_bucket" "tfstate" {
  name     = var.tfstate_bucket_name
  project  = var.project_id
  location = var.region

  # TF-LAW §4.3: Uniform Bucket-Level Access (UBLA) required
  uniform_bucket_level_access = true

  # Versioning for state file history and rollback capability
  versioning {
    enabled = true
  }

  # TF-LAW §4.2: Prevent accidental deletion of state
  lifecycle {
    prevent_destroy = true
  }

  # Soft delete policy for recovery (7 days retention)
  soft_delete_policy {
    retention_duration_seconds = 604800 # 7 days
  }

  # Labels for resource organization
  labels = merge(
    var.common_labels,
    {
      purpose = "terraform-state"
    }
  )

  depends_on = [google_project_service.storage]
}

# -----------------------------------------------------------------------------
# GCS Bucket for Backups (Directus/MySQL exports)
# Appendix D naming: huyen1974-web-test-backup
# -----------------------------------------------------------------------------

resource "google_storage_bucket" "backup" {
  name     = var.backup_bucket_name
  project  = var.project_id
  location = var.region

  # TF-LAW §4.3: Uniform Bucket-Level Access (UBLA) required
  uniform_bucket_level_access = true

  # Versioning for backup history
  versioning {
    enabled = true
  }

  # TF-LAW §4.2: Prevent accidental deletion of backups
  lifecycle {
    prevent_destroy = true
  }

  # Lifecycle rule for backup retention (example: keep for 90 days)
  # TODO: verify exact retention requirements in Constitution/GC-LAW
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  # Soft delete policy for recovery
  soft_delete_policy {
    retention_duration_seconds = 604800 # 7 days
  }

  # Labels for resource organization
  labels = merge(
    var.common_labels,
    {
      purpose = "backup-storage"
    }
  )

  depends_on = [google_project_service.storage]
}

# -----------------------------------------------------------------------------
# IAM Bindings for Service Account Access
# HP-SEC-01: Least Privilege - grant only necessary permissions
# -----------------------------------------------------------------------------

# Grant tfstate bucket access to chatgpt-deployer service account
# Using roles/storage.objectAdmin for state file management
resource "google_storage_bucket_iam_member" "tfstate_admin" {
  bucket = google_storage_bucket.tfstate.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:chatgpt-deployer@${var.project_id}.iam.gserviceaccount.com"
}

# Grant backup bucket access to chatgpt-deployer service account
# Using roles/storage.objectCreator for backup writes
resource "google_storage_bucket_iam_member" "backup_creator" {
  bucket = google_storage_bucket.backup.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:chatgpt-deployer@${var.project_id}.iam.gserviceaccount.com"
}

# Grant backup bucket read access for restore operations
resource "google_storage_bucket_iam_member" "backup_viewer" {
  bucket = google_storage_bucket.backup.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:chatgpt-deployer@${var.project_id}.iam.gserviceaccount.com"
}
