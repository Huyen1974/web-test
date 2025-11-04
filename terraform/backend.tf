# Backend configuration for Terraform state
# State bucket name per PHỤ LỤC D, Điều 3
terraform {
  backend "gcs" {
    bucket = "huyen1974-web-test-tfstate"
    prefix = "terraform/state"
  }
}
