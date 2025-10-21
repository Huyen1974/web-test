#!/bin/bash
set -e

PROJECT_ID="github-chatgpt-ggcloud"
QDRANT_CLUSTER_ID="N1D8R2vC0"

# Fetch variables securely from Secret Manager (no echo)
QDRANT_API_KEY=$(gcloud secrets versions access latest --secret="Qdrant_${PROJECT_ID}_${QDRANT_CLUSTER_ID}" --project="$PROJECT_ID" 2>/dev/null)
DIRECTUS_ADMIN_EMAIL=$(gcloud secrets versions access latest --secret="directus-admin-email" --project="$PROJECT_ID" 2>/dev/null || echo "admin@example.com")

# Write to terraform.tfvars (no echo to log)
cat > terraform.tfvars << EOF
project_id = "$PROJECT_ID"
env = "test"
region = "asia-southeast1"
sql_region = "asia-southeast1"
qdrant_cluster_id = "$QDRANT_CLUSTER_ID"
qdrant_api_key = "$QDRANT_API_KEY"
directus_admin_email = "$DIRECTUS_ADMIN_EMAIL"
EOF

echo "terraform.tfvars created successfully ($(wc -l < terraform.tfvars) lines)"
