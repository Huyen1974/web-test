#!/usr/bin/env bash
set -euo pipefail

FN="https://asia-southeast1-github-chatgpt-ggcloud.cloudfunctions.net/manage_qdrant"
echo "Function URL: $FN"

echo "🔍 1. Testing status endpoint..."
curl -s "$FN?action=status" | python -c 'import sys, json; d=json.load(sys.stdin); print(json.dumps(d, indent=2))'

echo -e "\n🔄 2. Testing suspend endpoint..."
curl -s "$FN?action=suspend" | python -c 'import sys, json; d=json.load(sys.stdin); print(json.dumps(d, indent=2))'

echo -e "\n🔄 3. Testing resume endpoint..."
curl -s "$FN?action=resume" | python -c 'import sys, json; d=json.load(sys.stdin); print(json.dumps(d, indent=2))'

echo -e "\n🔄 4. Testing touch endpoint..."
curl -s "$FN?action=touch" | python -c 'import sys, json; d=json.load(sys.stdin); print(json.dumps(d, indent=2))'

echo -e "\n📊 5. Checking secret version update..."
gcloud secrets versions access latest --secret="qdrant_idle_marker" --project=github-chatgpt-ggcloud | od -c | head -2
echo "Expected timestamp around: $(date +%s)"
