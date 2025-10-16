terraform {
  backend "gcs" {
    # bucket and prefix will be specified via -backend-config during init
    # Example: terraform init -backend-config="bucket=huyen1974-web-test-tfstate" -backend-config="prefix=terraform/state"
  }
}
