# =============================================================================
# Terraform Backend Configuration - HP-02 (Absolute IaC)
# =============================================================================
# Backend state stored in GCS bucket: huyen1974-web-test-tfstate
# This bucket is also defined in storage.tf with proper lifecycle protection

terraform {
  backend "gcs" {
    # Bucket and prefix will be specified via -backend-config during init
    # Example:
    #   terraform init \
    #     -backend-config="bucket=huyen1974-web-test-tfstate" \
    #     -backend-config="prefix=terraform/state"
    #
    # The bucket itself is created in storage.tf with:
    #   - versioning enabled
    #   - prevent_destroy = true
    #   - uniform_bucket_level_access = true (TF-LAW §4.3)
  }
}
