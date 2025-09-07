#!/usr/bin/env bash
set -Eeuo pipefail

echo "[LOG] Starting Step 6.8: E2E Smoke Test"
echo "--------------------------------------------------"

echo "[LOG] Phase 1: Building and deploying latest image to Cloud Run..."
./scripts/deploy_cloud_run.sh
echo "[PASS] Phase 1 Complete. Latest version deployed to Cloud Run."

echo "[LOG] Phase 2: Running E2E smoke test..."

# Export environment for tests
export E2E_LIVE_ENABLE=1
export GCP_PROJECT_ID=${GCP_PROJECT_ID:-github-chatgpt-ggcloud}
export GCP_REGION=${GCP_REGION:-asia-southeast1}
export GCP_RUN_SERVICE=${GCP_RUN_SERVICE:-agent-data-test}
export E2E_LIVE_REQUIRE_FIRESTORE=${E2E_LIVE_REQUIRE_FIRESTORE:-0}

# Best-effort: provide Qdrant envs for cleanup helper in tests
if gcloud secrets describe Qdrant_agent_data_N1D8R2vC0_5 --project=github-chatgpt-ggcloud >/dev/null 2>&1; then
  export QDRANT_API_KEY=$(gcloud secrets versions access latest --secret=Qdrant_agent_data_N1D8R2vC0_5 --project=github-chatgpt-ggcloud || true)
fi
if gcloud secrets describe Qdrant_cloud_management_key --project=github-chatgpt-ggcloud >/dev/null 2>&1; then
  ACC="b7093834-20e9-4206-8ea0-025b6994b319"
  BASE="https://api.cloud.qdrant.io/api/cluster/v1"
  MGMT_KEY=$(gcloud secrets versions access latest --secret=Qdrant_cloud_management_key --project=github-chatgpt-ggcloud || true)
  CLUS=$(curl -s -H "Authorization: apikey $MGMT_KEY" "$BASE/accounts/$ACC/clusters" | jq -r '.items[0].id' || true)
  if [ -n "${CLUS:-}" ] && [ "${CLUS}" != "null" ]; then
    export QDRANT_URL="https://${CLUS}.qdrant.tech"
  fi
fi

pytest -q -m e2e --no-cov
echo "[PASS] Phase 2 Complete. E2E test successful."

echo "--------------------------------------------------"
echo "[LOG] Script finished. MVP validation complete."
