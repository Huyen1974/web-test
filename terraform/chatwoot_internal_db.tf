# Chatwoot database and user within postgres-kestra-web-test instance
# Part of CMD-007 SQL consolidation - migrating Chatwoot from dedicated instance to shared Kestra instance

resource "google_sql_database" "chatwoot_on_kestra" {
  name     = "chatwoot_production"
  instance = module.postgres_kestra.instance_name
  project  = var.project_id
}

# Note: User creation disabled to avoid conflicts with existing user
# User 'chatwoot' should be created manually or via Cloud Console when instance is running
# resource "google_sql_user" "chatwoot_user_on_kestra" {
#   name     = "chatwoot"
#   instance = module.postgres_kestra.instance_name
#   password = data.google_secret_manager_secret_version.chatwoot_db_password.secret_data
#   project  = var.project_id
# }

# IAM permissions for Chatwoot to access the database
resource "google_project_iam_member" "chatwoot_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com"
}

# Read existing Chatwoot DB password from Secret Manager
# Secret will be created manually via gcloud in Task #239
data "google_secret_manager_secret_version" "chatwoot_db_password" {
  project = var.project_id
  secret  = "CHATWOOT_POSTGRES_PASSWORD_test"
  version = "latest"
}

# Grant Secret Manager access to the deployer service account
resource "google_secret_manager_secret_iam_member" "chatwoot_db_password_accessor" {
  project   = var.project_id
  secret_id = "CHATWOOT_POSTGRES_PASSWORD_test"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.chatgpt_deployer_sa}"
}
