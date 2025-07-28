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

#### Plan Timeout & Cache

- **Timeout**: Job auto-cancels after 25 minutes to prevent hanging
- **Plugin Cache**: Terraform providers are cached to speed up initialization
- **Skip Import**: Import steps are skipped by default (`SKIP_IMPORT=true`)
- **Performance**: Target completion under 10 minutes with timing logs
- **Plan optimised**: provider cache, no refresh, timeout 25 min, ≤ 10 min target.

### Pre-commit Hooks

The following Terraform-related pre-commit hooks are configured:

- `terraform_fmt` - Format Terraform files
- `terraform_validate` - Validate Terraform configuration
- `terraform-docs` - Generate documentation
- `tflint` - Lint Terraform files with Google provider rules

## GCP Authentication Secrets for CI/CD

To enable Terraform operations in GitHub Actions, configure one of the following authentication methods:

### Option 1: Workload Identity Federation (Recommended)

Set up the `GCP_WIF_PROVIDER` secret with the full resource name:

```bash
# Secret value format:
projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID

# Example:
projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

### Option 2: Service Account Key JSON

Set up the `GCP_SA_KEY_JSON` secret with base64 encoded service account key:

```bash
# Generate and encode the key:
gcloud iam service-accounts keys create key.json --iam-account=SERVICE_ACCOUNT_EMAIL
base64 -i key.json | pbcopy  # macOS
base64 -w 0 key.json         # Linux

# Add the base64 output as the secret value
```

### Required Service Account Permissions

The service account (`chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com`) needs:
- `roles/storage.admin` (for Terraform state in GCS)
- `roles/editor` or specific resource permissions
- Access to the target GCP project

### CI Behavior

- If both secrets are missing: Terraform plan job will skip with warning "skipped-auth"
- If `GCP_WIF_PROVIDER` exists: Use Workload Identity Federation
- If only `GCP_SA_KEY_JSON` exists: Use service account key authentication

### Secrets Matrix Table

| Secret Name | Required | Format | Description |
|-------------|----------|--------|-------------|
| `GCP_WIF_PROVIDER` | Recommended | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID` | Full resource name for Workload Identity Federation |
| `GCP_SERVICE_ACCOUNT` | Required with WIF | `SERVICE_ACCOUNT_EMAIL` | Service account email for WIF authentication |
| `GCP_SA_KEY_JSON` | Alternative | Base64 encoded JSON | Service account key for direct authentication |

Example values:
- `GCP_WIF_PROVIDER`: `projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider`
- `GCP_SERVICE_ACCOUNT`: `chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com`

## Resource Naming Convention

All resources follow the pattern: `huyen1974-agent-data-{purpose}-{env}`

- **Buckets**: `huyen1974-agent-data-{artifacts,knowledge,logs,qdrant-snapshots,source,tfstate}-{test,production}`
