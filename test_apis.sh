#!/usr/bin/env bash
set -euo pipefail

MGMT_KEY=$(gcloud secrets versions access latest --secret=Qdrant_cloud_management_key --project=github-chatgpt-ggcloud)
A="b7093834-20e9-4206-8ea0-025b6994b319"
C="529a17a6-01b8-4304-bc5c-b936aec8fca9"
BASE="https://api.cloud.qdrant.io/api/cluster/v1"
OLD_API="https://cloud.qdrant.io/api/v1"

echo "Testing old API suspend with api-key header:"
curl -s -X POST -H "api-key: $MGMT_KEY" "$OLD_API/accounts/$A/clusters/$C:suspend"
echo

echo "Testing old API suspend with Authorization header:"
curl -s -X POST -H "Authorization: apikey $MGMT_KEY" "$OLD_API/accounts/$A/clusters/$C:suspend"
echo

echo "Testing cluster details in new API:"
curl -s -H "Authorization: apikey $MGMT_KEY" "$BASE/accounts/$A/clusters/$C" | head -200
