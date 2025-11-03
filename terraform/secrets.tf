# Secret Manager resources for web-test

# Qdrant API key secret
resource "google_secret_manager_secret" "qdrant_api" {
  secret_id = "Qdrant_${var.project_id}_${var.qdrant_cluster_id}"
  project   = var.project_id

  replication {
    user_managed {
      replicas {
        location = "asia-southeast1"
      }
    }
  }

  labels = {
    environment = var.env
    project     = "web-test"
    managed_by  = "terraform"
  }
}

# Note: qdrant_api_v1 secret version is defined in qdrant.tf

# Directus KEY secret (for signing tokens)
# Fix for Report #0327 CRITICAL-002: Prevent accidental password rotation
resource "random_password" "directus_key" {
  length  = 64
  special = false

  lifecycle {
    ignore_changes = [result]
  }
}

resource "google_secret_manager_secret" "directus_key" {
  secret_id = "DIRECTUS_KEY_${var.env}"
  project   = var.project_id

  replication {
    user_managed {
      replicas {
        location = "asia-southeast1"
      }
    }
  }

  labels = {
    environment = var.env
    project     = "web-test"
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret_version" "directus_key" {
  secret      = google_secret_manager_secret.directus_key.id
  secret_data = random_password.directus_key.result
}

# Directus SECRET secret (for signing sessions)
# Fix for Report #0327 CRITICAL-002: Prevent accidental password rotation
resource "random_password" "directus_secret" {
  length  = 64
  special = false

  lifecycle {
    ignore_changes = [result]
  }
}

resource "google_secret_manager_secret" "directus_secret" {
  secret_id = "DIRECTUS_SECRET_${var.env}"
  project   = var.project_id

  replication {
    user_managed {
      replicas {
        location = "asia-southeast1"
      }
    }
  }

  labels = {
    environment = var.env
    project     = "web-test"
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret_version" "directus_secret" {
  secret      = google_secret_manager_secret.directus_secret.id
  secret_data = random_password.directus_secret.result
}

# Directus database password
# Fix for Report #0327 CRITICAL-002: Prevent accidental password rotation
resource "random_password" "directus_db_password" {
  length  = 32
  special = true

  lifecycle {
    ignore_changes = [result]
  }
}

resource "google_secret_manager_secret" "directus_db_password" {
  secret_id = "DIRECTUS_DB_PASSWORD_${var.env}"
  project   = var.project_id

  replication {
    user_managed {
      replicas {
        location = "asia-southeast1"
      }
    }
  }

  labels = {
    environment = var.env
    project     = "web-test"
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret_version" "directus_db_password" {
  secret      = google_secret_manager_secret.directus_db_password.id
  secret_data = random_password.directus_db_password.result
}

# IAM bindings for chatgpt-deployer SA to access Directus secrets
resource "google_secret_manager_secret_iam_member" "directus_key_accessor" {
  secret_id = google_secret_manager_secret.directus_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com"
  project   = var.project_id
}

resource "google_secret_manager_secret_iam_member" "directus_secret_accessor" {
  secret_id = google_secret_manager_secret.directus_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com"
  project   = var.project_id
}

resource "google_secret_manager_secret_iam_member" "directus_db_password_accessor" {
  secret_id = google_secret_manager_secret.directus_db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com"
  project   = var.project_id
}
