# MySQL Cloud SQL Instance Module - Outputs

output "instance_name" {
  description = "The name of the Cloud SQL instance"
  value       = google_sql_database_instance.instance.name
}

output "instance_connection_name" {
  description = "The connection name for Cloud SQL Proxy"
  value       = google_sql_database_instance.instance.connection_name
}

output "database_name" {
  description = "The name of the default database"
  value       = google_sql_database.database.name
}

output "instance_self_link" {
  description = "The URI of the instance"
  value       = google_sql_database_instance.instance.self_link
}

output "instance_ip_address" {
  description = "The IPv4 address of the instance"
  value       = google_sql_database_instance.instance.ip_address
}

output "instance_first_ip_address" {
  description = "The first IPv4 address of the instance"
  value       = google_sql_database_instance.instance.first_ip_address
}
