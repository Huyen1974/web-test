#!/usr/bin/env bash
set -euo pipefail

# Deploy Cloud Monitoring dashboard defined as code.

PROJECT_ID=${PROJECT_ID:-${GCP_PROJECT_ID:-github-chatgpt-ggcloud}}
FILE=${1:-monitoring/dashboard.json}

if [[ ! -f "$FILE" ]]; then
  echo "Dashboard config not found: $FILE" >&2
  exit 1
fi

echo "Creating dashboard from $FILE in project $PROJECT_ID ..."
gcloud monitoring dashboards create \
  --project="$PROJECT_ID" \
  --config-from-file="$FILE"

echo "Done. List dashboards:"
gcloud monitoring dashboards list --project="$PROJECT_ID" --format='table(name, displayName)'

