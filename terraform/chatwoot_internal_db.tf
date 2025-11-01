# Chatwoot database and user within mysql-directus-web-test instance
# Part of "2-SQL Constitution" - consolidating Chatwoot onto shared MySQL instance

resource "google_sql_database" "chatwoot_on_mysql" {
  name     = "chatwoot_production"
  instance = module.mysql_directus.instance_name
  project  = var.project_id
}

# Create Chatwoot MySQL user
resource "google_sql_user" "chatwoot_mysql_user" {
  name     = "chatwoot"
  instance = module.mysql_directus.instance_name
  password = data.google_secret_manager_secret_version.chatwoot_db_password.secret_data
  project  = var.project_id
}

# IAM permissions for Chatwoot to access the database
resource "google_project_iam_member" "chatwoot_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com"
}

# Read existing Chatwoot DB password from Secret Manager
# NOTE: Temporarily using existing POSTGRES password secret for testing
# TODO: Create CHATWOOT_MYSQL_PASSWORD_test secret before production deployment
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
