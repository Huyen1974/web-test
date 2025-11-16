# =============================================================================
# Secret Manager Resources for web-test
# Follows: HP-05, HP-CS-05 (metadata only, NO values), HP-SEC-02 (rotation)
# CRITICAL: Terraform manages metadata ONLY, values from chatgpt-githubnew
# =============================================================================

# Enable Secret Manager API
resource "google_project_service" "secretmanager" {
  project = var.project_id
  service = "secretmanager.googleapis.com"

  disable_on_destroy = false
}

# -----------------------------------------------------------------------------
# Secret Metadata for Directus MySQL Password
# HP-SEC-02: Rotation schedule - test: 120 days, prod: 90 days
# HP-CS-05: Values managed by central secrets system (chatgpt-githubnew)
# -----------------------------------------------------------------------------

resource "google_secret_manager_secret" "directus_mysql_password" {
  secret_id = "web-test-directus-mysql-password"
  project   = var.project_id

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  labels = merge(
    var.common_labels,
    {
      purpose          = "database-password"
      rotation_days    = var.environment == "production" ? "90" : "120"
      managed_by_saas  = "chatgpt-githubnew"
      secret_type      = "mysql-password"
    }
  )

  # HP-SEC-02: Rotation reminder
  # Test environment: rotate every 120 days
  # Production environment: rotate every 90 days
  # TODO: Integrate with automated rotation job from chatgpt-githubnew (HP-05)

  depends_on = [google_project_service.secretmanager]
}

# -----------------------------------------------------------------------------
# Secret Metadata for Directus Admin Key
# HP-SEC-02: Rotation schedule - test: 120 days, prod: 90 days
# -----------------------------------------------------------------------------

resource "google_secret_manager_secret" "directus_admin_key" {
  secret_id = "web-test-directus-admin-key"
  project   = var.project_id

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  labels = merge(
    var.common_labels,
    {
      purpose          = "admin-key"
      rotation_days    = var.environment == "production" ? "90" : "120"
      managed_by_saas  = "chatgpt-githubnew"
      secret_type      = "directus-key"
    }
  )

  # HP-SEC-02: Rotation reminder
  # TODO: Integrate with automated rotation job from chatgpt-githubnew

  depends_on = [google_project_service.secretmanager]
}

# -----------------------------------------------------------------------------
# Secret Metadata for Directus Secret Key
# HP-SEC-02: Rotation schedule - test: 120 days, prod: 90 days
# -----------------------------------------------------------------------------

resource "google_secret_manager_secret" "directus_secret_key" {
  secret_id = "web-test-directus-secret-key"
  project   = var.project_id

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  labels = merge(
    var.common_labels,
    {
      purpose          = "secret-key"
      rotation_days    = var.environment == "production" ? "90" : "120"
      managed_by_saas  = "chatgpt-githubnew"
      secret_type      = "directus-secret"
    }
  )

  # HP-SEC-02: Rotation reminder
  # TODO: Integrate with automated rotation job from chatgpt-githubnew

  depends_on = [google_project_service.secretmanager]
}

# -----------------------------------------------------------------------------
# IAM Bindings for Service Account Access
# HP-SEC-01: Least Privilege - secretAccessor role (read-only)
# -----------------------------------------------------------------------------

# Grant chatgpt-deployer read access to MySQL password secret
resource "google_secret_manager_secret_iam_member" "mysql_password_accessor" {
  secret_id = google_secret_manager_secret.directus_mysql_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:chatgpt-deployer@${var.project_id}.iam.gserviceaccount.com"
  project   = var.project_id
}

# Grant chatgpt-deployer read access to Directus admin key
resource "google_secret_manager_secret_iam_member" "admin_key_accessor" {
  secret_id = google_secret_manager_secret.directus_admin_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:chatgpt-deployer@${var.project_id}.iam.gserviceaccount.com"
  project   = var.project_id
}

# Grant chatgpt-deployer read access to Directus secret key
resource "google_secret_manager_secret_iam_member" "secret_key_accessor" {
  secret_id = google_secret_manager_secret.directus_secret_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:chatgpt-deployer@${var.project_id}.iam.gserviceaccount.com"
  project   = var.project_id
}

# -----------------------------------------------------------------------------
# IMPORTANT NOTES FOR SECRET MANAGEMENT
# -----------------------------------------------------------------------------
# 1. HP-05: Secret VALUES are NOT managed by Terraform
#    - Values are provided by central system (chatgpt-githubnew)
#    - Terraform manages metadata (secret_id, labels, replication) ONLY
#
# 2. HP-SEC-02: Secret rotation schedule
#    - Test environment: rotate every 120 days
#    - Production environment: rotate every 90 days
#    - TODO: Automated rotation job integration with chatgpt-githubnew
#
# 3. HP-SEC-04: Secret scanning
#    - This file contains NO actual secret values
#    - Safe for TruffleHog and other secret scanning tools
#    - All values injected at runtime from central secrets system
#
# 4. HP-CS-05: Runner CI/CD permissions
#    - CI/CD runner typically has NO secretmanager.versions.access permission
#    - Secret values populated via separate secure channel
#    - Terraform apply does NOT require secret values access
#
# 5. NO secret version resources
#    - ❌ NO: google_secret_manager_secret_version
#    - ✅ YES: google_secret_manager_secret (metadata only)
