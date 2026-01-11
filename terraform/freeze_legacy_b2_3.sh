#!/bin/bash
LEGACY="gs://directus-assets-test-20251223"
SA_EMAIL="chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com"

echo "🔹 FREEZING LEGACY BUCKET..."
# 1. Remove Admin/Write capability
gsutil iam ch -d serviceAccount:$SA_EMAIL:objectAdmin $LEGACY
# 2. Add Viewer/Read capability (Strict Read-Only)
gsutil iam ch serviceAccount:$SA_EMAIL:objectViewer $LEGACY
# 3. Verify
gsutil iam get $LEGACY