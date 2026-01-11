#!/bin/bash
set -e

# 1. PLAN & APPLY
echo "🔹 APPLYING PHASE 3..."
terraform apply -var="project_id=github-chatgpt-ggcloud" -var="env=test" -auto-approve

# 2. VERIFICATION LOOP
echo "🔹 VERIFYING PRODUCTION BUCKETS..."
BUCKETS=(
  "huyen1974-web-production-tfstate"
  "huyen1974-web-uploads-production"
  "huyen1974-kestra-storage-production"
  "huyen1974-chatwoot-storage-production"
  "huyen1974-affiliate-data-production"
)
PUBLIC_BUCKETS=("huyen1974-web-uploads-production" "huyen1974-chatwoot-storage-production")

PASS_COUNT=0
for bucket in "${BUCKETS[@]}"; do
  if gsutil ls -b "gs://$bucket" >/dev/null 2>&1; then
    echo "✅ [EXIST] $bucket found."
    ((PASS_COUNT++))
  else
    echo "❌ [FAIL] $bucket NOT found!"
  fi
done

# 3. VERIFY PUBLIC ACCESS
echo "🔹 VERIFYING PUBLIC ACCESS (W2-P, W4-P)..."
for bucket in "${PUBLIC_BUCKETS[@]}"; do
  if gsutil iam get "gs://$bucket" | grep "allUsers" >/dev/null; then
    echo "✅ [PUBLIC] $bucket has allUsers access."
  else
    echo "❌ [FAIL] $bucket is missing public access!"
    PASS_COUNT=$((PASS_COUNT-100)) # Force fail
  fi
done

# 4. FINAL VERDICT
if [ "$PASS_COUNT" -eq 5 ]; then
  echo "🏆 RESULT: PHASE 3 SUCCESS. ALL 5 BUCKETS VALID."
else
  echo "⚠️ RESULT: FAILED."
  exit 1
fi