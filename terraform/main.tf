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

# Service account for Cloud Run - using chatgpt-deployer as per constitution
locals {
  chatgpt_deployer_sa = "chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com"
}

# Cloud Run service for Directus CMS using standard_cloud_run module
module "directus_service" {
  source = "github.com/Huyen1974/platform-infra//terraform/modules/standard_cloud_run?ref=v1.1.0"

  project_id            = var.project_id
  region                = var.region
  service_name          = "directus-${var.env}"
  image                 = "directus/directus:11.2.2" # Pinned stable version, not :latest
  service_account_email = local.chatgpt_deployer_sa

  # Cloud SQL connection configuration
  cloud_sql_instances = [module.mysql_directus.instance_connection_name]

  # Environment variables for Directus
  env_vars = {
    DB_CLIENT          = "mysql"
    DB_HOST            = "localhost"
    DB_PORT            = "3306"
    DB_SOCKET_PATH     = "/cloudsql/${module.mysql_directus.instance_connection_name}"
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

  # Probe configuration - extended for MySQL STOPPED -> RUNNING transition
  # IMPORTANT: MySQL instance uses activation_policy=NEVER for cost savings
  # When deploying/updating Directus:
  # 1. Manually start MySQL: gcloud sql instances patch mysql-directus-web-test --activation-policy=ALWAYS
  # 2. Wait ~2-3 min for MySQL to be fully ready (PD_SSD)
  # 3. Deploy Directus (or wait for existing revision to pass health check)
  # 4. Optionally stop MySQL after successful deployment
  #
  # Startup probe gives 20+ minutes for this manual process:
  # Total time = 10s + (30s × 40) = 1210s ≈ 20 minutes
  startup_probe_initial_delay     = 10
  startup_probe_timeout           = 3
  startup_probe_period            = 30
  startup_probe_failure_threshold = 40

  liveness_probe_initial_delay     = 10
  liveness_probe_timeout           = 3
  liveness_probe_period            = 10
  liveness_probe_failure_threshold = 3

  # Network configuration
  vpc_connector_name    = ""
  vpc_egress_mode       = "PRIVATE_RANGES_ONLY"
  allow_unauthenticated = true
}
