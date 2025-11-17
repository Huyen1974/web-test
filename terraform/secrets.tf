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
# Note: random_password is kept for reference but value must be injected externally
# HP-05 Compliance: Terraform manages metadata only, not secret values
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

# HP-05 COMPLIANCE: Secret version removed - values must be injected externally
# After terraform apply, run:
# echo -n "$(terraform output -raw directus_key_value)" | \
#   gcloud secrets versions add DIRECTUS_KEY_test --data-file=-

# Directus SECRET secret (for signing sessions)
# Note: random_password is kept for reference but value must be injected externally
# HP-05 Compliance: Terraform manages metadata only, not secret values
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

# HP-05 COMPLIANCE: Secret version removed - values must be injected externally
# After terraform apply, run:
# echo -n "$(terraform output -raw directus_secret_value)" | \
#   gcloud secrets versions add DIRECTUS_SECRET_test --data-file=-

# Directus database password
# Note: random_password is kept because it's used by sql.tf for MySQL user creation
# HP-05 Compliance: Terraform manages metadata only, not secret values
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

# HP-05 COMPLIANCE: Secret version removed - values must be injected externally
# After terraform apply, run:
# echo -n "$(terraform output -raw directus_db_password_value)" | \
#   gcloud secrets versions add DIRECTUS_DB_PASSWORD_test --data-file=-

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
