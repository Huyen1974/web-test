variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "location" {
  description = "Region/location for Cloud Run and AR"
  type        = string
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
}

variable "image_path" {
  description = "Container image path in Artifact Registry"
  type        = string
}

variable "api_key_secret" {
  description = "Optional Secret Manager secret name for the API key"
  type        = string
  default     = null
}

variable "api_key_secret_version" {
  description = "Secret Manager version for the API key"
  type        = string
  default     = "latest"
}
