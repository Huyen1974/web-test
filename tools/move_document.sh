#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<'USAGE' >&2
Usage: move_document.sh <doc_id> --to <new_parent_id> [--base-url <url>] [--api-key <key>] [--dry-run]

Updates parent_id of an existing document through the Agent Data API.

Environment variables:
  AGENT_DATA_API_KEY   (required if --api-key not provided)
  AGENT_DATA_BASE_URL  (optional, default http://localhost:8000)
USAGE
}

if [[ $# -lt 1 ]]; then
    usage
    exit 1
fi

DOC_ID=$1
shift || true

if [[ -z "$DOC_ID" ]]; then
    echo "❌ document id is required" >&2
    usage
    exit 1
fi

NEW_PARENT_ID=""
BASE_URL="${AGENT_DATA_BASE_URL:-http://localhost:8000}"
OVERRIDE_API_KEY=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --to)
            NEW_PARENT_ID=${2:-}
            shift 2
            ;;
        --base-url)
            BASE_URL=${2:-}
            shift 2
            ;;
        --api-key)
            OVERRIDE_API_KEY=${2:-}
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1" >&2
            usage
            exit 1
            ;;
    esac
done

if [[ -z "$NEW_PARENT_ID" ]]; then
    echo "❌ new parent id is required" >&2
    usage
    exit 1
fi

API_KEY="$OVERRIDE_API_KEY"

if [[ -z "$API_KEY" ]]; then
    if [[ -n "${AGENT_DATA_API_KEY:-}" ]]; then
        API_KEY="$AGENT_DATA_API_KEY"
    elif command -v gcloud >/dev/null 2>&1; then
        echo "ℹ️  Fetching AGENT_DATA_API_KEY from Secret Manager" >&2
        if ! API_KEY=$(gcloud secrets versions access latest --secret="AGENT_DATA_API_KEY" 2>/tmp/move_document_gcloud_err); then
            echo "❌ Failed to load AGENT_DATA_API_KEY via gcloud" >&2
            cat /tmp/move_document_gcloud_err >&2 || true
            rm -f /tmp/move_document_gcloud_err
            exit 1
        fi
        rm -f /tmp/move_document_gcloud_err
    else
        echo "❌ AGENT_DATA_API_KEY is not set and gcloud is unavailable" >&2
        exit 1
    fi
fi

BASE_URL=${BASE_URL%/}
ENDPOINT="$BASE_URL/documents/$DOC_ID/move"

payload=$(python3 - "$NEW_PARENT_ID" <<'PY'
import json
import sys
new_parent = sys.argv[1]
print(json.dumps({"new_parent_id": new_parent}))
PY
)

if [[ "$DRY_RUN" == "true" ]]; then
    printf 'curl -sS -X POST %q -H "Content-Type: application/json" -H "x-api-key: $API_KEY" -d %q\n' "$ENDPOINT" "$payload"
    exit 0
fi

TMP_RESPONSE=$(mktemp)
trap 'rm -f "$TMP_RESPONSE"' EXIT

HTTP_CODE=$(curl -sS -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d "$payload" \
    -w "%{http_code}" \
    -o "$TMP_RESPONSE")

if [[ $HTTP_CODE -ge 200 && $HTTP_CODE -lt 300 ]]; then
    echo "✅ Document $DOC_ID moved to $NEW_PARENT_ID"
    cat "$TMP_RESPONSE"
    echo
else
    echo "❌ Failed to move document (HTTP $HTTP_CODE)" >&2
    cat "$TMP_RESPONSE" >&2
    exit 1
fi
