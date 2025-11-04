# SQL Instances per PHỤ LỤC D, Điều 3
# Configuration per Task #0347 (ALWAYS ON Strategy)

# MySQL instance for Directus, Chatwoot, and other applications
resource "google_sql_database_instance" "mysql_directus" {
  name             = "mysql-directus-web-test"
  database_version = "MYSQL_8_0"
  region           = var.region

  settings {
    tier              = "db-g1-small"
    disk_type         = "PD_SSD"
    disk_size         = 10
    activation_policy = "ALWAYS"

    backup_configuration {
      enabled            = true
      binary_log_enabled = true
    }
  }

  deletion_protection = false
}

# Postgres instance for Kestra workflow engine
resource "google_sql_database_instance" "postgres_kestra" {
  name             = "postgres-kestra-web-test"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = "db-f1-micro"
    disk_type         = "PD_SSD"
    disk_size         = 10
    activation_policy = "ALWAYS"

    backup_configuration {
      enabled = true
    }
  }

  deletion_protection = false
}
