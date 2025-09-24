variable "project_id" {
  description = "Target GCP project ID"
  type        = string
  default     = "github-chatgpt-ggcloud"
}

variable "region" {
  description = "Region for Cloud Function and Scheduler"
  type        = string
  default     = "asia-southeast1"
}

variable "function_service_account" {
  description = "Service account email used by the Cloud Function and Cloud Scheduler trigger"
  type        = string
  default     = "chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com"
}

variable "lark_app_secret_id" {
  description = "Secret Manager ID storing the Lark app secret"
  type        = string
  default     = "lark-app-secret-sg"
}

variable "lark_access_token_secret_id" {
  description = "Secret Manager ID where the generated access token is stored"
  type        = string
  default     = "lark-access-token-sg"
}

variable "lark_app_id" {
  description = "Lark App ID"
  type        = string
  default     = "cli_a785d634437a502f"
}

variable "scheduler_cron" {
  description = "Cron schedule for Cloud Scheduler"
  type        = string
  default     = "*/110 * * * *"
}

variable "scheduler_time_zone" {
  description = "Time zone used by the Cloud Scheduler job"
  type        = string
  default     = "Etc/UTC"
}
