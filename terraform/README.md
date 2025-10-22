# Terraform Infrastructure for agent-data-langroid

## Scope

This Terraform configuration manages the following GCP infrastructure:

- **GCS Buckets**: Storage buckets for different purposes (logs, data, artifacts)
- **Artifact Registry**: Docker repository for container images
- **Qdrant Integration**: Secret Manager for Qdrant API key storage

## Prerequisites

1. GCP project with appropriate APIs enabled:
   - Cloud Storage API
   - Artifact Registry API
   - Secret Manager API
2. Terraform >= 1.8.x
3. GCP credentials configured (`gcloud auth application-default login`)
4. GitHub repository secrets configured for CI (`GCP_PROJECT_ID`, `GCP_SERVICE_ACCOUNT`, `GCP_WIF_PROVIDER`, optional `GCP_REGION`)

## Usage

### 1. Initialize and Plan

```bash
# Initialize Terraform
terraform init

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your actual values

# Plan the infrastructure
terraform plan
```

### 2. Apply Infrastructure

```bash
# Apply changes
terraform apply
```

### 3. Import Existing Qdrant Secret (if needed)

If the Qdrant secret already exists in your project, import it before applying:

```bash
terraform import google_secret_manager_secret.qdrant_api projects/$PROJECT/secrets/Qdrant_agent_data_N1D8R2vC0_5
```

## Configuration

Key variables in `terraform.tfvars`:

- `project_id`: Your GCP project ID
- `region`: GCP region for resources
- `environment`: Environment type (test/production)
- `qdrant_cluster_id`: Qdrant cluster identifier
- `qdrant_region`: Qdrant deployment region
- `qdrant_api_key`: Qdrant API key (store securely)

## Outputs

- `qdrant_endpoint`: Generated Qdrant cluster endpoint URL
- `qdrant_secret_name`: Secret Manager secret name for Qdrant API key
- `gcs_buckets`: Map of created GCS buckets
- `artifact_registry_repository`: Artifact Registry details
