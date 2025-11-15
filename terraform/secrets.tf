# ==============================================================================
# Secret Manager Resources for web-test (Appendix F: Minimal Secrets)
# ==============================================================================

# Enable Secret Manager API
resource "google_project_service" "secretmanager" {
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# ------------------------------------------------------------------------------
# Directus Secrets
# ------------------------------------------------------------------------------

# Directus KEY secret (for signing tokens)
resource "random_password" "directus_key" {
  length  = 64
  special = false
}

resource "google_secret_manager_secret" "directus_key" {
  secret_id = "DIRECTUS_KEY_${var.env}"
  project   = var.project_id

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  labels = {
    environment = var.env
    project     = "web-test"
    managed_by  = "terraform"
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "directus_key" {
  secret      = google_secret_manager_secret.directus_key.id
  secret_data = random_password.directus_key.result
}

# Directus SECRET secret (for signing sessions)
resource "random_password" "directus_secret" {
  length  = 64
  special = false
}

resource "google_secret_manager_secret" "directus_secret" {
  secret_id = "DIRECTUS_SECRET_${var.env}"
  project   = var.project_id

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  labels = {
    environment = var.env
    project     = "web-test"
    managed_by  = "terraform"
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "directus_secret" {
  secret      = google_secret_manager_secret.directus_secret.id
  secret_data = random_password.directus_secret.result
}

# Directus database password
resource "random_password" "directus_db_password" {
  length  = 32
  special = true
}

resource "google_secret_manager_secret" "directus_db_password" {
  secret_id = "DIRECTUS_DB_PASSWORD_${var.env}"
  project   = var.project_id

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  labels = {
    environment = var.env
    project     = "web-test"
    managed_by  = "terraform"
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "directus_db_password" {
  secret      = google_secret_manager_secret.directus_db_password.id
  secret_data = random_password.directus_db_password.result
}

# ------------------------------------------------------------------------------
# IAM Bindings for chatgpt-deployer Service Account
# ------------------------------------------------------------------------------

locals {
  chatgpt_deployer_sa = "serviceAccount:chatgpt-deployer@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_secret_manager_secret_iam_member" "directus_key_accessor" {
  secret_id = google_secret_manager_secret.directus_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = local.chatgpt_deployer_sa
  project   = var.project_id
}

resource "google_secret_manager_secret_iam_member" "directus_secret_accessor" {
  secret_id = google_secret_manager_secret.directus_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = local.chatgpt_deployer_sa
  project   = var.project_id
}

resource "google_secret_manager_secret_iam_member" "directus_db_password_accessor" {
  secret_id = google_secret_manager_secret.directus_db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = local.chatgpt_deployer_sa
  project   = var.project_id
}

# ------------------------------------------------------------------------------
# Chatwoot Secrets (Postponed - Phase 2)
# ------------------------------------------------------------------------------

# TODO: Uncomment when ready for Chatwoot deployment
# resource "random_password" "chatwoot_secret_key_base" {
#   length  = 64
#   special = false
# }
#
# resource "google_secret_manager_secret" "chatwoot_secret_key_base" {
#   secret_id = "CHATWOOT_SECRET_KEY_BASE_${var.env}"
#   project   = var.project_id
#   ...
# }
