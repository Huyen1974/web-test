# Kestra Service Configuration for Sprint 2
# Kestra is a workflow orchestration platform running on Cloud Run

# Read existing Kestra encryption key from Secret Manager
# Secret was created manually via gcloud in Task #199
data "google_secret_manager_secret_version" "kestra_encryption_key" {
  project = var.project_id
  secret  = "kestra-encryption-key-test"
  version = "latest"
}

# Read existing Kestra secret key from Secret Manager
# Secret was created manually via gcloud in Task #199
data "google_secret_manager_secret_version" "kestra_secret_key" {
  project = var.project_id
  secret  = "kestra-secret-key-test"
  version = "latest"
}

# Grant Secret Manager access for Kestra secrets
resource "google_secret_manager_secret_iam_member" "kestra_encryption_key_accessor" {
  project   = var.project_id
  secret_id = "kestra-encryption-key-test"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.chatgpt_deployer_sa}"
}

resource "google_secret_manager_secret_iam_member" "kestra_secret_key_accessor" {
  project   = var.project_id
  secret_id = "kestra-secret-key-test"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.chatgpt_deployer_sa}"
}

# Cloud Run service for Kestra using standard_cloud_run module
module "kestra_service" {
  source = "github.com/Huyen1974/platform-infra//terraform/modules/standard_cloud_run?ref=v1.1.0"

  project_id            = var.project_id
  region                = var.region
  service_name          = "kestra-${var.env}"
  image                 = "kestra/kestra:latest" # Using official Kestra image
  service_account_email = local.chatgpt_deployer_sa

  # Cloud SQL connection configuration for PostgreSQL
  cloud_sql_instances = [module.postgres_kestra.instance_connection_name]

  # Environment variables for Kestra
  env_vars = {
    # Database configuration
    DATASOURCES_POSTGRES_URL               = "jdbc:postgresql://localhost:5432/kestra?socketFactory=com.google.cloud.sql.postgres.SocketFactory&cloudSqlInstance=${module.postgres_kestra.instance_connection_name}"
    DATASOURCES_POSTGRES_USERNAME          = "kestra"
    DATASOURCES_POSTGRES_DRIVER_CLASS_NAME = "org.postgresql.Driver"

    # Kestra configuration
    KESTRA_SERVER_BASE_URL = "https://kestra-${var.env}-${var.project_id}.run.app"

    # Repository configuration (using database storage)
    KESTRA_REPOSITORY_TYPE = "postgres"

    # Queue configuration (using database)
    KESTRA_QUEUE_TYPE = "postgres"

    # Storage configuration (using local storage for now)
    KESTRA_STORAGE_TYPE = "local"

    # Webserver configuration
    KESTRA_WEBSERVER_ENABLED = "true"
    MICRONAUT_SERVER_PORT    = "8080"

    # Logging
    KESTRA_LOGGING_LEVEL = "INFO"
  }

  # Secret environment variables for Kestra
  secret_env_vars = {
    DATASOURCES_POSTGRES_PASSWORD = {
      secret  = "kestra-db-password-test"
      version = "latest"
    }
    KESTRA_ENCRYPTION_SECRET_KEY = {
      secret  = "kestra-encryption-key-test"
      version = "latest"
    }
    KESTRA_SECRET_KEY = {
      secret  = "kestra-secret-key-test"
      version = "latest"
    }
  }

  # Resource limits - increased for workflow orchestration
  cpu_limit    = "2000m"
  memory_limit = "1Gi"

  # Auto-scaling configuration
  min_instances = 0 # Cost optimization: scale to zero when not in use
  max_instances = 3
  concurrency   = 40

  # Health check
  health_check_path = "/api/v1/ping"

  # Probe configuration - Kestra needs more time to start
  startup_probe_initial_delay     = 30
  startup_probe_timeout           = 5
  startup_probe_period            = 10
  startup_probe_failure_threshold = 12

  liveness_probe_initial_delay     = 30
  liveness_probe_timeout           = 5
  liveness_probe_period            = 15
  liveness_probe_failure_threshold = 3

  # Network configuration
  vpc_connector_name    = ""
  vpc_egress_mode       = "PRIVATE_RANGES_ONLY"
  allow_unauthenticated = true # For now, will add authentication later
}
