#!/bin/bash
set -e

# 1. PLAN
echo "🔹 PLANNING..."
terraform plan -var="project_id=github-chatgpt-ggcloud" -var="env=test" -out=phase2a.tfplan

# 2. APPLY
echo "🔹 APPLYING..."
terraform apply --auto-approve phase2a.tfplan

# 3. SELF-VERIFICATION (MANDATORY)
echo "🔹 VERIFYING REALITY..."
BUCKETS=(
  "huyen1974-system-backups-shared"
  "huyen1974-system-temp-shared"
  "huyen1974-kestra-storage-test"
  "huyen1974-chatwoot-storage-test"
  "huyen1974-affiliate-data-test"
)

PASS_COUNT=0
for bucket in "${BUCKETS[@]}"; do
  if gsutil ls -b "gs://$bucket" >/dev/null 2>&1; then
    echo "✅ [PASS] $bucket created."
    ((PASS_COUNT++))
  else
    echo "❌ [FAIL] $bucket NOT found!"
  fi
done

if [ "$PASS_COUNT" -eq 5 ]; then
  echo "🏆 RESULT: 5/5 BUCKETS CREATED SUCCESSFULLY."
else
  echo "⚠️ RESULT: FAILED. ONLY $PASS_COUNT/5 FOUND."
  exit 1
fi