#!/usr/bin/env bash
set -euo pipefail

# --- ❶ Pull management key ---
MGMT_KEY=$(gcloud secrets versions access latest \
  --secret=Qdrant_cloud_management_key \
  --project=github-chatgpt-ggcloud)

ACC="b7093834-20e9-4206-8ea0-025b6994b319"
BASE="https://api.cloud.qdrant.io/api/cluster/v1"

# --- ❂ Check new management endpoint ---
CODE=$(curl -s -o /tmp/cluster.json -w '%{http_code}' \
  -H "Authorization: apikey $MGMT_KEY" \
  "$BASE/accounts/$ACC/clusters")

[[ "$CODE" == "200" ]] || { echo "❌ Pre-flight failed – HTTP $CODE"; exit 1; }

# --- ❸ Export envs for deploy step ---
export QDRANT_API_BASE="$BASE"
export QDRANT_AUTH_HEADER="Authorization"
echo "✅ Pre-flight OK – cluster list fetched"
echo "QDRANT_API_BASE=$QDRANT_API_BASE"
echo "QDRANT_AUTH_HEADER=$QDRANT_AUTH_HEADER"
