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
  password = random_password.chatwoot_mysql_password.result
  project  = var.project_id
}

# IAM permissions for Chatwoot to access the database
resource "google_project_iam_member" "chatwoot_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com"
}

# Generate Chatwoot MySQL password
# Fix for Report #0321: Create secret via Terraform instead of manual creation
# Fix for Report #0323 VULN-004: Prevent accidental password rotation
resource "random_password" "chatwoot_mysql_password" {
  length  = 32
  special = true

  lifecycle {
    ignore_changes = [result]
  }
}

# Create Chatwoot MySQL password secret
resource "google_secret_manager_secret" "chatwoot_mysql_password" {
  secret_id = "CHATWOOT_MYSQL_PASSWORD_${var.env}"
  project   = var.project_id

  replication {
    user_managed {
      replicas {
        location = "asia-southeast1"
      }
    }
  }

  labels = {
    environment = var.env
    project     = "web-test"
    managed_by  = "terraform"
  }
}

# Store Chatwoot MySQL password in secret
resource "google_secret_manager_secret_version" "chatwoot_mysql_password" {
  secret      = google_secret_manager_secret.chatwoot_mysql_password.id
  secret_data = random_password.chatwoot_mysql_password.result
}

# Grant Secret Manager access to the deployer service account
resource "google_secret_manager_secret_iam_member" "chatwoot_db_password_accessor" {
  project    = var.project_id
  secret_id  = google_secret_manager_secret.chatwoot_mysql_password.secret_id
  role       = "roles/secretmanager.secretAccessor"
  member     = "serviceAccount:${local.chatgpt_deployer_sa}"
  depends_on = [google_project_iam_member.deployer_secret_admin]
}
