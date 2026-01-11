#!/bin/bash
set -e # Stop on error

echo "🔹 1. INITIALIZING TERRAFORM..."
# Init with backend config (Partial Config Strategy)
echo "yes" | terraform init -migrate-state -backend-config="bucket=huyen1974-web-test-tfstate"

echo "🔹 2. IMPORTING RESOURCES..."
# Function to import safely (skip if already exists in state)
safe_import() {
  addr=$1
  id=$2
  if terraform state show "$addr" >/dev/null 2>&1; then
    echo "✅ $addr already imported."
  else
    echo "🚀 Importing $id to $addr..."
    terraform import -var="project_id=github-chatgpt-ggcloud" -var="env=test" "$addr" "$id"
  fi
}

safe_import "google_storage_bucket.tf_state" "huyen1974-web-test-tfstate"
safe_import "google_storage_bucket.artifact_storage" "huyen1974-artifact-storage"
safe_import "google_storage_bucket.log_storage" "huyen1974-log-storage"
safe_import "google_storage_bucket.chatgpt_functions" "huyen1974-chatgpt-functions"

echo "🔹 3. VERIFYING (PLAN)..."
terraform plan -var="project_id=github-chatgpt-ggcloud" -var="env=test" -out=phase1.tfplan