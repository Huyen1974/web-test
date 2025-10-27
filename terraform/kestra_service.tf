# Kestra Service Configuration for Sprint 2
# Kestra is a workflow orchestration platform running on Cloud Run

# Generate random secrets for Kestra encryption
resource "random_password" "kestra_encryption_key" {
  length  = 32
  special = false # Alphanumeric only for encryption keys
}

resource "random_password" "kestra_secret_key" {
  length  = 64
  special = true
}

# Store Kestra encryption key in Secret Manager
resource "google_secret_manager_secret" "kestra_encryption_key" {
  project   = var.project_id
  secret_id = "KESTRA_ENCRYPTION_KEY_${var.env}"

  replication {
    auto {}
  }

  labels = {
    app         = "kestra"
    environment = var.env
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret_version" "kestra_encryption_key" {
  secret      = google_secret_manager_secret.kestra_encryption_key.id
  secret_data = random_password.kestra_encryption_key.result
}

# Store Kestra secret key in Secret Manager
resource "google_secret_manager_secret" "kestra_secret_key" {
  project   = var.project_id
  secret_id = "KESTRA_SECRET_KEY_${var.env}"

  replication {
    auto {}
  }

  labels = {
    app         = "kestra"
    environment = var.env
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret_version" "kestra_secret_key" {
  secret      = google_secret_manager_secret.kestra_secret_key.id
  secret_data = random_password.kestra_secret_key.result
}

# Grant Secret Manager access for Kestra secrets
resource "google_secret_manager_secret_iam_member" "kestra_encryption_key_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.kestra_encryption_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.chatgpt_deployer_sa}"
}

resource "google_secret_manager_secret_iam_member" "kestra_secret_key_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.kestra_secret_key.secret_id
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
    KESTRA_DATASOURCE_URL      = "jdbc:postgresql://localhost:5432/kestra?socketFactory=com.google.cloud.sql.postgres.SocketFactory&cloudSqlInstance=${module.postgres_kestra.instance_connection_name}"
    KESTRA_DATASOURCE_USERNAME = "kestra"
    KESTRA_DATASOURCE_DRIVER   = "org.postgresql.Driver"

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
    KESTRA_DATASOURCE_PASSWORD = {
      secret  = google_secret_manager_secret.kestra_db_password.secret_id
      version = google_secret_manager_secret_version.kestra_db_password.version
    }
    KESTRA_ENCRYPTION_SECRET_KEY = {
      secret  = google_secret_manager_secret.kestra_encryption_key.secret_id
      version = google_secret_manager_secret_version.kestra_encryption_key.version
    }
    KESTRA_SECRET_KEY = {
      secret  = google_secret_manager_secret.kestra_secret_key.secret_id
      version = google_secret_manager_secret_version.kestra_secret_key.version
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
