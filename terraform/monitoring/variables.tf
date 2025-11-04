variable "alert_email" {
  description = "Email address to receive alert notifications"
  type        = string
  default     = "ad-alerts@example.com"
}

variable "run_service_name" {
  description = "Cloud Run service name to monitor"
  type        = string
  default     = "agent-data-test"
}
