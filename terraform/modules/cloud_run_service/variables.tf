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
