# =============================================================================
# Artifact Registry for web-test Docker Images
# Follows: Appendix D (naming), TF-LAW §4.2 (prevent_destroy), HP-SEC-01
# =============================================================================

# Enable Artifact Registry API
resource "google_project_service" "artifactregistry" {
  project = var.project_id
  service = "artifactregistry.googleapis.com"

  disable_on_destroy = false
}

# -----------------------------------------------------------------------------
# Artifact Registry Repository for web-test
# Appendix D naming: huyen1974-web-test-artifacts
# Purpose: Store Docker images for Directus CMS and related services
# -----------------------------------------------------------------------------

resource "google_artifact_registry_repository" "web_test_artifacts" {
  repository_id = var.artifact_registry_name
  project       = var.project_id
  location      = var.region
  format        = "DOCKER"

  description = "Docker repository for web-test project (Directus CMS and related services)"

  # Cleanup policy to remove old images (optional, can be adjusted)
  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "delete-old-images"
    action = "DELETE"

    condition {
      # Keep images from last 30 days
      older_than = "2592000s" # 30 days in seconds

      # Keep at least 5 versions
      # TODO: verify exact retention requirements in Constitution
    }
  }

  # TF-LAW §4.2: Prevent accidental deletion of artifact repository
  lifecycle {
    prevent_destroy = true
  }

  # Labels for resource organization
  labels = merge(
    var.common_labels,
    {
      purpose    = "docker-images"
      repository = "web-test"
    }
  )

  depends_on = [google_project_service.artifactregistry]
}

# -----------------------------------------------------------------------------
# IAM Bindings for Service Account Access
# HP-SEC-01: Least Privilege - grant only necessary permissions
# -----------------------------------------------------------------------------

# Grant chatgpt-deployer push/pull access to artifact repository
# Using roles/artifactregistry.writer for CI/CD deployments
resource "google_artifact_registry_repository_iam_member" "deployer_writer" {
  repository = google_artifact_registry_repository.web_test_artifacts.name
  project    = var.project_id
  location   = var.region
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:chatgpt-deployer@${var.project_id}.iam.gserviceaccount.com"
}

# Grant Cloud Run service account read access for pulling images
# This allows Cloud Run services to pull images from the repository
# TODO: verify exact service account name for Cloud Run services
resource "google_artifact_registry_repository_iam_member" "cloudrun_reader" {
  repository = google_artifact_registry_repository.web_test_artifacts.name
  project    = var.project_id
  location   = var.region
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:chatgpt-deployer@${var.project_id}.iam.gserviceaccount.com"
}

# -----------------------------------------------------------------------------
# IMPORTANT NOTES
# -----------------------------------------------------------------------------
# 1. Repository dedicated to web-test project only
#    - NOT shared with Agent Data or other projects
#    - Separate repositories for security and organization
#
# 2. Image retention policy
#    - Current: keep images from last 30 days
#    - TODO: verify exact retention requirements in Constitution
#
# 3. Access control
#    - chatgpt-deployer: write access for CI/CD
#    - Cloud Run SA: read access for pulling images
#    - HP-SEC-01: Least Privilege principle applied
