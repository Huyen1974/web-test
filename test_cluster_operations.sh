#!/usr/bin/env bash
set -euo pipefail

MGMT_KEY=$(gcloud secrets versions access latest --secret=Qdrant_cloud_management_key --project=github-chatgpt-ggcloud)
A="b7093834-20e9-4206-8ea0-025b6994b319"
C="529a17a6-01b8-4304-bc5c-b936aec8fca9"
BASE="https://api.cloud.qdrant.io/api/cluster/v1"

echo "Testing PATCH request to change cluster state to resume:"
curl -s -X PATCH -H "Authorization: apikey $MGMT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"state": {"phase": "CLUSTER_PHASE_HEALTHY"}}' \
  "$BASE/accounts/$A/clusters/$C"
echo

echo "Testing PATCH with operation field:"
curl -s -X PATCH -H "Authorization: apikey $MGMT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "resume"}' \
  "$BASE/accounts/$A/clusters/$C"
echo

echo "Checking current cluster status:"
curl -s -H "Authorization: apikey $MGMT_KEY" "$BASE/accounts/$A/clusters/$C" | python -c "
import sys, json
data = json.load(sys.stdin)
print('Phase:', data['cluster']['state']['phase'])
print('Last modified:', data['cluster']['configuration']['lastModifiedAt'])
"
