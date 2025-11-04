# Backend configuration for Terraform state
# State bucket name per PHỤ LỤC D, Điều 3
#
# NOTE: Temporarily commented out for bootstrap phase.
# The GCS bucket needs to be created first before we can use it as backend.
# After first apply creates the bucket, we'll migrate to GCS backend.
#
# terraform {
#   backend "gcs" {
#     bucket = "huyen1974-web-test-tfstate"
#     prefix = "terraform/state"
#   }
# }
