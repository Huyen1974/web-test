# === GROUP 4: STATE MANAGEMENT (W1-T) ===
resource "google_storage_bucket" "tf_state" {
  name          = "huyen1974-web-test-tfstate"
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"
  uniform_bucket_level_access = true
  versioning {
    enabled = true
  }
  lifecycle {
    prevent_destroy = true
  }
}

# === GROUP 1: ORPHAN/LEGACY BUCKETS (S3, S4, S5) ===
# Rule: Import & Lock (ignore_changes = [all]) to prevent accidental modification.

resource "google_storage_bucket" "artifact_storage" {
  name          = "huyen1974-artifact-storage" # S3
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"
  lifecycle {
    prevent_destroy = true
    ignore_changes  = all
  }
}

resource "google_storage_bucket" "log_storage" {
  name          = "huyen1974-log-storage" # S4
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"
  lifecycle {
    prevent_destroy = true
    ignore_changes  = all
  }
}

resource "google_storage_bucket" "chatgpt_functions" {
  name          = "huyen1974-chatgpt-functions" # S5
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"
  lifecycle {
    prevent_destroy = true
    ignore_changes  = all
  }
}

# === GROUP 1: SYSTEM SHARED ===
resource "google_storage_bucket" "system_backups" {
  name          = "huyen1974-system-backups-shared" # S1
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"
  uniform_bucket_level_access = true
  versioning { enabled = true }
  lifecycle_rule {
    condition { age = 90 }
    action { type = "Delete" }
  }
}

resource "google_storage_bucket" "system_temp" {
  name          = "huyen1974-system-temp-shared" # S2
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"
  uniform_bucket_level_access = true
  lifecycle_rule {
    condition { age = 3 }
    action { type = "Delete" }
  }
}

# === GROUP 4: WEB TEST (NEW) ===
resource "google_storage_bucket" "kestra_test" {
  name          = "huyen1974-kestra-storage-test" # W3-T
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"
  uniform_bucket_level_access = true
  lifecycle_rule {
    condition { age = 90 }
    action { type = "Delete" }
  }
}

resource "google_storage_bucket" "chatwoot_test" {
  name          = "huyen1974-chatwoot-storage-test" # W4-T
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"
  uniform_bucket_level_access = true
  lifecycle { prevent_destroy = true } # Permanent
}

resource "google_storage_bucket" "affiliate_test" {
  name          = "huyen1974-affiliate-data-test" # W5-T
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"
  uniform_bucket_level_access = true
  lifecycle { prevent_destroy = true } # Permanent
}

# === GROUP 4: WEB TEST (UPLOADS) ===
resource "google_storage_bucket" "web_uploads_test" {
  name          = "huyen1974-web-uploads-test" # W2-T
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"

  uniform_bucket_level_access = true
  public_access_prevention    = "inherited" # Allow public access

  # Permanent Storage (No lifecycle rule)
  lifecycle {
    prevent_destroy = true
  }
}

# Grant Public Read Access
resource "google_storage_bucket_iam_member" "web_uploads_test_public" {
  bucket = google_storage_bucket.web_uploads_test.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# === GROUP 5: WEB PRODUCTION (RESERVED) ===

# W1-P: Terraform State (Prod)
resource "google_storage_bucket" "prod_tf_state" {
  name          = "huyen1974-web-production-tfstate"
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"
  uniform_bucket_level_access = true
  versioning { enabled = true }
  lifecycle { prevent_destroy = true }
}

# W2-P: Directus Uploads (Prod) - PUBLIC
resource "google_storage_bucket" "prod_web_uploads" {
  name          = "huyen1974-web-uploads-production"
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "inherited"
  lifecycle { prevent_destroy = true }
}
resource "google_storage_bucket_iam_member" "prod_web_uploads_public" {
  bucket = google_storage_bucket.prod_web_uploads.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# W3-P: Kestra Storage (Prod) - 90 Days Retention
resource "google_storage_bucket" "prod_kestra" {
  name          = "huyen1974-kestra-storage-production"
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"
  uniform_bucket_level_access = true
  lifecycle_rule {
    condition { age = 90 }
    action { type = "Delete" }
  }
}

# W4-P: Chatwoot Storage (Prod) - PUBLIC
resource "google_storage_bucket" "prod_chatwoot" {
  name          = "huyen1974-chatwoot-storage-production"
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "inherited"
  lifecycle { prevent_destroy = true }
}
resource "google_storage_bucket_iam_member" "prod_chatwoot_public" {
  bucket = google_storage_bucket.prod_chatwoot.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# W5-P: Affiliate Data (Prod)
resource "google_storage_bucket" "prod_affiliate" {
  name          = "huyen1974-affiliate-data-production"
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"
  uniform_bucket_level_access = true
  lifecycle { prevent_destroy = true }
}