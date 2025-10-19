# Artifact Registry for agent-data-test
resource "google_artifact_registry_repository" "agent_data_test" {
  project       = "github-chatgpt-ggcloud"
  location      = "asia-southeast1"
  repository_id = "agent-data-test"
  description   = "Docker repository for agent-data-test"
  format        = "DOCKER"
}

# Service account for Cloud Run
data "google_compute_default_service_account" "default" {
  project = "github-chatgpt-ggcloud"
}

# Cloud Run service using standard_cloud_run module from platform-infra
module "agent_data_service_test" {
  source = "github.com/Huyen1974/platform-infra//terraform/modules/standard_cloud_run?ref=v1.0.0"

  project_id            = "github-chatgpt-ggcloud"
  region                = "asia-southeast1"
  service_name          = "agent-data-test"
  image                 = "asia-southeast1-docker.pkg.dev/github-chatgpt-ggcloud/agent-data-test/agent-data-test:latest"
  service_account_email = data.google_compute_default_service_account.default.email

  # Secret environment variables
  secret_env_vars = {
    API_KEY = {
      secret  = google_secret_manager_secret.agent_data_api_key.secret_id
      version = google_secret_manager_secret_version.agent_data_api_key.version
    }
  }

  # Resource limits
  cpu_limit    = "1000m"
  memory_limit = "512Mi"

  # Auto-scaling
  min_instances = 0
  max_instances = 10
  concurrency   = 80

  # Health check
  health_check_path = "/"

  # Network configuration
  vpc_connector_name    = ""
  vpc_egress_mode       = "PRIVATE_RANGES_ONLY"
  allow_unauthenticated = true
}
