# Terraform Infrastructure Documentation

## Overview

This Terraform configuration manages the Google Cloud infrastructure for the agent-data-langroid project, including:

- **GCS Buckets**: Storage buckets for different purposes (artifacts, knowledge, logs, qdrant-snapshots, source, tfstate)
- **Secret Manager**: Qdrant API key storage
- **Artifact Registry**: Docker repository for container images

## Prerequisites

### Required IAM Roles

The service account used for Terraform operations requires the following roles:

- `roles/storage.admin` - For managing GCS buckets
- `roles/secretmanager.admin` - For managing Secret Manager secrets
- `roles/artifactregistry.admin` - For managing Artifact Registry repositories

### Required Tools

- Terraform >= 1.5.7 (CI uses >= 1.8.5)
- Google Cloud CLI configured with appropriate credentials
- Pre-commit hooks (optional but recommended)

## Configuration

### Environment Variables

Create a `terraform.tfvars` file with the following variables:

```hcl
env = "test"
project_id = "github-chatgpt-ggcloud"
region = "asia-southeast1"
qdrant_cluster_id = "your-cluster-id"
qdrant_region = "asia-southeast1"
qdrant_api_key = "your-api-key"
```

### Backend Configuration

The Terraform state is stored in a GCS bucket. The backend is configured during initialization:

```bash
terraform init \
  -backend-config="bucket=huyen1974-agent-data-tfstate-test" \
  -backend-config="prefix=terraform/state"
```

## Usage Workflow

### 1. Initialize Terraform

```bash
cd terraform
terraform init \
  -backend-config="bucket=huyen1974-agent-data-tfstate-test" \
  -backend-config="prefix=terraform/state"
```

### 2. Plan Changes

```bash
terraform plan -var-file=terraform.tfvars
```

### 3. Apply Changes

**⚠️ WARNING: NEVER run `terraform apply` in CI/CD environments. This is for local development only.**

```bash
terraform apply -var-file=terraform.tfvars
```

## Initial Import

If you need to import existing resources into Terraform state:

### GCS Buckets

```bash
terraform import -var-file=terraform.tfvars \
  google_storage_bucket.huyen1974_agent_data_artifacts_test \
  huyen1974-agent-data-artifacts-test

terraform import -var-file=terraform.tfvars \
  google_storage_bucket.huyen1974_agent_data_knowledge_test \
  huyen1974-agent-data-knowledge-test

terraform import -var-file=terraform.tfvars \
  google_storage_bucket.huyen1974_agent_data_logs_test \
  huyen1974-agent-data-logs-test

terraform import -var-file=terraform.tfvars \
  google_storage_bucket.huyen1974_agent_data_qdrant_snapshots_test \
  huyen1974-agent-data-qdrant-snapshots-test

terraform import -var-file=terraform.tfvars \
  google_storage_bucket.huyen1974_agent_data_source_test \
  huyen1974-agent-data-source-test

terraform import -var-file=terraform.tfvars \
  google_storage_bucket.huyen1974_agent_data_tfstate_test \
  huyen1974-agent-data-tfstate-test
```

### Secret Manager Secret

```bash
terraform import -var-file=terraform.tfvars \
  google_secret_manager_secret.qdrant_api \
  projects/github-chatgpt-ggcloud/secrets/Qdrant_agent_data_N1D8R2vC0_5
```

## CI/CD Integration

### GitHub Actions

The CI pipeline includes a `terraform-plan` job that:

1. Authenticates using Workload Identity Federation
2. Formats and validates Terraform code
3. Runs `terraform plan` to detect configuration drift
4. Fails if exit code ≠ 0 and ≠ 2
5. Shows warnings for drift (exit code 2) but doesn't block merge

### Pre-commit Hooks

The following Terraform-related pre-commit hooks are configured:

- `terraform_fmt` - Format Terraform files
- `terraform_validate` - Validate Terraform configuration
- `terraform-docs` - Generate documentation
- `tflint` - Lint Terraform files with Google provider rules

## Resource Naming Convention

- **Buckets**: `huyen1974-agent-data-{purpose}-{environment}`
- **Resources**: `huyen1974_agent_data_{purpose}_{environment}` (Terraform resource names)
- **Environment**: `test` or `production`

## Security Notes

- All GCS buckets have `prevent_destroy = true` lifecycle rule
- Bucket contents are versioned for data protection
- Secrets are managed through Google Secret Manager
- Public access prevention is enabled on buckets

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure GCP credentials are properly configured
2. **State Lock Issues**: Use `-lock=false` for plan operations in CI
3. **Import Conflicts**: Remove duplicate resource blocks before import
4. **Version Conflicts**: Ensure Terraform version compatibility

### Support

For issues related to this infrastructure, check:

1. GitHub Actions logs for CI failures
2. Terraform state in GCS bucket
3. Google Cloud Console for resource status
