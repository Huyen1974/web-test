# Terraform backend configuration
# Stores state in GCS bucket: huyen1974-web-test-tfstate
# Per TF-LAW §8 (Infrastructure as Code Standards)

terraform {
  backend "gcs" {
    bucket = "huyen1974-web-test-tfstate"
    prefix = "terraform/state"
  }
}
