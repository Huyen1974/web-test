#!/usr/bin/env bash
set -euo pipefail

FN=$(gcloud functions describe manage_qdrant --region=us-east4 --format='value(serviceConfig.uri)')
echo "Function URL: $FN"

echo "🔍 1. Testing status endpoint..."
curl -s "$FN?action=status" | python -c 'import sys, json; d=json.load(sys.stdin); print(json.dumps(d, indent=2))'

echo -e "\n📊 2. Checking current status..."
STATUS=$(curl -s "$FN?action=status" | python -c 'import sys, json; d=json.load(sys.stdin); print(d["cluster"]["phase"])')
echo "Current cluster phase: $STATUS"

if [[ "$STATUS" == "SUSPENDED" ]]; then
    echo "🔄 Cluster is suspended, resuming first..."
    curl -s "$FN?action=resume" | python -c 'import sys, json; d=json.load(sys.stdin); print(json.dumps(d, indent=2))'
    echo "⏳ Waiting 90 seconds for resume..."
    sleep 90
    curl -s "$FN?action=status" | python -c 'import sys, json; d=json.load(sys.stdin); print("Resumed status:", d["cluster"]["phase"])'
fi

echo -e "\n🔄 3. Testing suspend..."
curl -s "$FN?action=suspend" | python -c 'import sys, json; d=json.load(sys.stdin); print(json.dumps(d, indent=2))'

echo "⏳ 4. Waiting 90 seconds for suspension..."
sleep 90

echo "🔍 5. Checking status after suspend..."
curl -s "$FN?action=status" | python -c 'import sys, json; d=json.load(sys.stdin); print(json.dumps(d, indent=2))'

echo -e "\n🔄 6. Testing resume..."
curl -s "$FN?action=resume" | python -c 'import sys, json; d=json.load(sys.stdin); print(json.dumps(d, indent=2))'

echo "⏳ 7. Waiting 90 seconds for resume..."
sleep 90

echo "🔍 8. Checking final status..."
curl -s "$FN?action=status" | python -c 'import sys, json; d=json.load(sys.stdin); print(json.dumps(d, indent=2))'

echo -e "\n🔄 9. Testing touch endpoint..."
curl -s "$FN?action=touch" | python -c 'import sys, json; d=json.load(sys.stdin); print(json.dumps(d, indent=2))'
