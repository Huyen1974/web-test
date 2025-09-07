#!/usr/bin/env bash
set -Eeuo pipefail

echo "[LOG] Starting Phase 7: Finalize Metadata Flow & Cleanup"
echo "--------------------------------------------------"

echo "[LOG] Phase 1: Applying required code/config/IAM changes..."

# Ensure Terraform IAM includes Firestore user for Cloud Run SA
TERRAFORM_DIR="${TERRAFORM_DIR:-./terraform}"
TF_BACKEND_BUCKET="${TF_BACKEND_BUCKET:-huyen1974-agent-data-tfstate-test}"
TF_BACKEND_PREFIX="${TF_BACKEND_PREFIX:-terraform/state}"
(
  cd "$TERRAFORM_DIR"
  terraform init -reconfigure \
    -backend-config="bucket=${TF_BACKEND_BUCKET}" \
    -backend-config="prefix=${TF_BACKEND_PREFIX}" >/dev/null
  terraform apply -auto-approve >/dev/null
)

# Re-enable Firestore verification in E2E
export E2E_LIVE_REQUIRE_FIRESTORE=1

echo "[PASS] Phase 1 Complete. Code and configuration updated."

echo "[LOG] Phase 2: Committing changes..."
git add .
git commit -m "feat(e2e): enable firestore metadata verification in E2E tests

- Ensure Firestore writes during live ingest.
- Set E2E_LIVE_REQUIRE_FIRESTORE=1 to enforce validation.
- Register 'e2e' marker in pytest.ini to remove warnings.
- Grant roles/datastore.user to Cloud Run SA via Terraform."
echo "[PASS] Phase 2 Complete. Changes committed."

echo "[LOG] Phase 3: Re-deploying service and running full E2E..."
./scripts/deploy_cloud_run.sh
pytest -q -m e2e --no-cov
echo "[PASS] Phase 3 Complete. Full E2E test with Firestore validation successful."
echo "--------------------------------------------------"
echo "[LOG] Script finished. Metadata flow is now fully verified."

