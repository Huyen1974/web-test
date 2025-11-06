# Cloud SQL Instances for web-test infrastructure
# Per PHỤ LỤC D and Task #0347 (Cấu hình Chuẩn)
# Strategy: ALWAYS ON (activation_policy = "ALWAYS")

# MySQL instance for Directus CMS and Chatwoot
resource "google_sql_database_instance" "mysql_directus" {
  name                = "mysql-directus-web-test"
  database_version    = "MYSQL_8_0"
  region              = var.region
  deletion_protection = false

  settings {
    tier              = "db-g1-small"
    disk_type         = "PD_SSD"
    disk_size         = 10
    activation_policy = "ALWAYS"

    backup_configuration {
      enabled            = true
      binary_log_enabled = true
    }

    ip_configuration {
      ipv4_enabled = true
    }
  }
}

# PostgreSQL instance for Kestra workflow engine
resource "google_sql_database_instance" "postgres_kestra" {
  name                = "postgres-kestra-web-test"
  database_version    = "POSTGRES_15"
  region              = var.region
  deletion_protection = false

  settings {
    tier              = "db-f1-micro"
    disk_type         = "PD_SSD"
    disk_size         = 10
    activation_policy = "ALWAYS"

    backup_configuration {
      enabled = true
    }

    ip_configuration {
      ipv4_enabled = true
    }
  }
}
