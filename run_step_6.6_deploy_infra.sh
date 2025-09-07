#!/usr/bin/env bash
# Step 6.6: Deploy Infrastructure (IaC) with Terraform
# Usage: bash ./run_step_6.6_deploy_infra.sh

set -Eeuo pipefail

# --- Configuration ---
TERRAFORM_DIR="${TERRAFORM_DIR:-./terraform}"
TF_BACKEND_BUCKET="${TF_BACKEND_BUCKET:-huyen1974-agent-data-tfstate-test}"
TF_BACKEND_PREFIX="${TF_BACKEND_PREFIX:-terraform/state}"

echo "[LOG] Starting Step 6.6: Deploy Infrastructure (IaC)"
echo "--------------------------------------------------"

cd "$TERRAFORM_DIR"
echo "[LOG] Changed directory to $(pwd)"

echo "[LOG] Phase 1: Initializing and Validating Terraform..."
terraform init -reconfigure \
  -backend-config="bucket=${TF_BACKEND_BUCKET}" \
  -backend-config="prefix=${TF_BACKEND_PREFIX}" \
  -upgrade
terraform fmt -check
tflint
terraform validate
echo "[PASS] Phase 1 Complete. Code quality and syntax are valid."

echo "[LOG] Phase 2: Planning infrastructure changes..."
terraform plan -out=tfplan
echo "[PASS] Phase 2 Complete. Plan created successfully."

echo "[LOG] Phase 3: Applying infrastructure changes..."
terraform apply -auto-approve "tfplan"
echo "[PASS] Phase 3 Complete. Infrastructure has been deployed."
echo "--------------------------------------------------"
echo "[LOG] Script finished. Step 6.6 executed successfully."

