# Artifact Registry for web-test
resource "google_artifact_registry_repository" "web_test_docker_repo" {
  project       = var.project_id
  location      = "asia-southeast1"
  repository_id = "web-test"
  description   = "Docker repository for the web-test project"
  format        = "DOCKER"

  labels = {
    environment = var.env
    project     = "web-test"
    managed_by  = "terraform"
  }
}

# Service account for Cloud Run
data "google_compute_default_service_account" "default" {
  project = var.project_id
}

# Cloud Run service for Directus CMS using standard_cloud_run module from platform-infra
module "directus_service" {
  source = "github.com/Huyen1974/platform-infra//terraform/modules/standard_cloud_run?ref=v1.0.0"

  project_id            = var.project_id
  region                = var.region
  service_name          = "directus-${var.env}"
  image                 = "directus/directus:11.2.2" # Pinned stable version, not :latest
  service_account_email = data.google_compute_default_service_account.default.email

  # Environment variables for Directus
  env_vars = {
    DB_CLIENT          = "mysql"
    DB_HOST            = module.mysql_directus.instance_connection_name
    DB_PORT            = "3306"
    DB_DATABASE        = "directus"
    DB_USER            = "directus"
    ADMIN_EMAIL        = var.directus_admin_email
    PUBLIC_URL         = "https://directus-${var.env}-${var.project_id}.run.app"
    WEBSOCKETS_ENABLED = "true"
  }

  # Secret environment variables for Directus
  secret_env_vars = {
    DB_PASSWORD = {
      secret  = google_secret_manager_secret.directus_db_password.secret_id
      version = google_secret_manager_secret_version.directus_db_password.version
    }
    KEY = {
      secret  = google_secret_manager_secret.directus_key.secret_id
      version = google_secret_manager_secret_version.directus_key.version
    }
    SECRET = {
      secret  = google_secret_manager_secret.directus_secret.secret_id
      version = google_secret_manager_secret_version.directus_secret.version
    }
  }

  # Resource limits
  cpu_limit    = "1000m"
  memory_limit = "512Mi"

  # Auto-scaling
  min_instances = 0
  max_instances = 5
  concurrency   = 80

  # Health check
  health_check_path = "/server/health"

  # Probe configuration - optimized for Directus startup
  startup_probe_initial_delay     = 10
  startup_probe_timeout           = 3
  startup_probe_period            = 10
  startup_probe_failure_threshold = 10

  liveness_probe_initial_delay     = 10
  liveness_probe_timeout           = 3
  liveness_probe_period            = 10
  liveness_probe_failure_threshold = 3

  # Network configuration
  vpc_connector_name    = ""
  vpc_egress_mode       = "PRIVATE_RANGES_ONLY"
  allow_unauthenticated = true
}
