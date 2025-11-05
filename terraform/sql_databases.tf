# Cloud SQL Databases and Users
# Per PHỤ LỤC D (Quy hoạch Hạ tầng Web-Test)

# ============================================
# Directus Database (MySQL)
# ============================================

resource "google_sql_database" "directus" {
  name     = "directus"
  instance = google_sql_database_instance.mysql_directus.name
}

resource "google_sql_user" "directus" {
  name     = "directus"
  instance = google_sql_database_instance.mysql_directus.name
  password = random_password.directus_db_password.result
}

# ============================================
# Kestra Database (PostgreSQL)
# ============================================

resource "google_sql_database" "kestra" {
  name     = "kestra"
  instance = google_sql_database_instance.postgres_kestra.name
}

resource "google_sql_user" "kestra" {
  name     = "kestra"
  instance = google_sql_database_instance.postgres_kestra.name
  password = random_password.kestra_db_password.result
}

# ============================================
# Chatwoot Database (MySQL)
# ============================================

resource "google_sql_database" "chatwoot" {
  name     = "chatwoot"
  instance = google_sql_database_instance.mysql_directus.name
}

resource "google_sql_user" "chatwoot" {
  name     = "chatwoot"
  instance = google_sql_database_instance.mysql_directus.name
  password = random_password.chatwoot_db_password.result
}
