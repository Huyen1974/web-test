#!/bin/bash
SOURCE="gs://directus-assets-test-20251223"   # Legacy-1
TARGET="gs://huyen1974-web-uploads-test"      # W2-T

echo "🔹 1. PRE-FLIGHT COUNT..."
COUNT_SRC=$(gsutil ls -r $SOURCE/** | wc -l)
SIZE_SRC=$(gsutil du -s $SOURCE | awk '{print $1}')
echo "   Source: $COUNT_SRC objects, size $SIZE_SRC"

echo "🔹 2. COPYING DATA (gsutil cp -r)..."
# Use -n (no-clobber) to avoid re-copying if run multiple times
gsutil -m cp -r -n "$SOURCE/*" "$TARGET/"

echo "🔹 3. POST-MIGRATION VERIFICATION..."
COUNT_DST=$(gsutil ls -r $TARGET/** | wc -l)
SIZE_DST=$(gsutil du -s $TARGET | awk '{print $1}')
echo "   Target: $COUNT_DST objects, size $SIZE_DST"

if [ "$COUNT_SRC" -eq "$COUNT_DST" ]; then
    echo "✅ DATA INTEGRITY MATCHED: $COUNT_DST objects."
else
    echo "❌ MISMATCH WARNING: Source($COUNT_SRC) != Target($COUNT_DST). Investigate!"
    # Don't exit, proceed to allow manual check, but flag it in report.
fi