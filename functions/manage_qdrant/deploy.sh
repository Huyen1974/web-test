#!/bin/bash

# Deploy manage_qdrant Cloud Function
# Usage: ./deploy.sh [PROJECT_ID] [REGION]

PROJECT_ID=${1:-${GOOGLE_CLOUD_PROJECT}}
REGION=${2:-asia-southeast1}
FUNCTION_NAME="manage-qdrant"

if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID is required"
    echo "Usage: $0 [PROJECT_ID] [REGION]"
    exit 1
fi

echo "Deploying $FUNCTION_NAME to project $PROJECT_ID in region $REGION..."

gcloud functions deploy $FUNCTION_NAME \
    --gen2 \
    --runtime=python313 \
    --region=$REGION \
    --source=. \
    --entry-point=manage_qdrant \
    --trigger=http \
    --allow-unauthenticated \
    --set-env-vars="QDRANT_ACCOUNT_ID=${QDRANT_ACCOUNT_ID},QDRANT_CLUSTER_ID=${QDRANT_CLUSTER_ID},QDRANT_API_KEY=${QDRANT_API_KEY}" \
    --memory=256Mi \
    --timeout=60s \
    --max-instances=10 \
    --project=$PROJECT_ID

echo "Deployment completed!"
echo "Function URL: https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME"
