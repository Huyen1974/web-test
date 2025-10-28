output "instance_name" {
  description = "Name of the Cloud SQL instance"
  value       = google_sql_database_instance.instance.name
}

output "instance_connection_name" {
  description = "Connection name for the Cloud SQL instance"
  value       = google_sql_database_instance.instance.connection_name
}

output "instance_self_link" {
  description = "Self link of the Cloud SQL instance"
  value       = google_sql_database_instance.instance.self_link
}

output "instance_first_ip_address" {
  description = "First IP address of the Cloud SQL instance"
  value       = google_sql_database_instance.instance.first_ip_address
}

output "database_name" {
  description = "Name of the database"
  value       = var.manage_database ? google_sql_database.database[0].name : var.database_name
}

output "user_name" {
  description = "Name of the database user"
  value       = var.create_user ? google_sql_user.user[0].name : ""
}
