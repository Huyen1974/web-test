#!/bin/bash

# Check if --no-dry-run flag is passed
if [[ "$*" == *"--no-dry-run"* ]]; then
  DRY_RUN=""
else
  echo "Running in DRY-RUN mode (CI default). Use --no-dry-run for actual deployment."
  DRY_RUN="echo [DRY-RUN]"
fi

$DRY_RUN gcloud functions deploy manage_qdrant \
  --gen2 \
  --runtime=python313 \
  --region=us-east4 \
  --source . \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=handle \
  --service-account=placeholder@mock \
  --timeout=900 \
  --set-env-vars=PROJECT_ID=github-chatgpt-ggcloud,QDRANT_ACCOUNT_ID="<placeholder>",QDRANT_CLUSTER_ID=529a17a6-01b8-4304-bc5c-b936aec8fca9,QDRANT_API_KEY="<placeholder>",AUTO_STOP_MINUTES=60,COLLECTION_PROD=production_documents,COLLECTION_TEST=test_documents
