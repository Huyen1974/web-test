#!/usr/bin/env bash

set -euo pipefail

if [[ ${1:-} == "" || ${2:-} == "" ]]; then
    cat <<'USAGE' >&2
Usage: save_report.sh <title> <report_file> [parent_id]

Environment variables:
  AGENT_DATA_API_KEY   (required) API key for Agent Data service
  AGENT_DATA_BASE_URL  (optional) Base URL, default http://localhost:8000
  AGENT_DATA_PARENT_ID (optional) Default parent document id, default "root"
  AGENT_DATA_REPORT_TAGS (optional) Comma-separated tags, default "report"
  REPORT_DOCUMENT_ID   (optional) Override generated document id
USAGE
    exit 1
fi

if [[ -z "${AGENT_DATA_API_KEY:-}" ]]; then
    echo "❌ AGENT_DATA_API_KEY is not set" >&2
    exit 1
fi

TITLE=$1
REPORT_FILE=$2
PARENT_ID=${3:-${AGENT_DATA_PARENT_ID:-root}}

if [[ ! -f "$REPORT_FILE" ]]; then
    echo "❌ Report file '$REPORT_FILE' not found" >&2
    exit 1
fi

BASE_URL=${AGENT_DATA_BASE_URL:-http://localhost:8000}
BASE_URL=${BASE_URL%/}
ENDPOINT="$BASE_URL/documents"

DOC_ID=${REPORT_DOCUMENT_ID:-$(python3 - <<'PY'
import uuid
print(uuid.uuid4())
PY
)}

DOC_ID=${DOC_ID//[$'\r\n']/}

payload=$(python3 - "$TITLE" "$PARENT_ID" "$DOC_ID" "$REPORT_FILE" <<'PY'
import json
import os
import sys
from pathlib import Path

title, parent_id, doc_id, report_path = sys.argv[1:5]

body = Path(report_path).read_text(encoding="utf-8")
tags_env = os.environ.get("AGENT_DATA_REPORT_TAGS", "report")
tags = [t.strip() for t in tags_env.split(",") if t.strip()]

payload = {
    "document_id": doc_id,
    "parent_id": parent_id,
    "content": {
        "mime_type": "text/markdown",
        "body": body,
    },
    "metadata": {
        "title": title,
        "tags": tags,
    },
    "is_human_readable": True,
}

print(json.dumps(payload))
PY
)

tmp_response=$(mktemp)
trap 'rm -f "$tmp_response"' EXIT

http_code=$(curl -sS -w "%{http_code}" -o "$tmp_response" \
    -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $AGENT_DATA_API_KEY" \
    -d "$payload")

if [[ $http_code -ge 200 && $http_code -lt 300 ]]; then
    echo "✅ Report saved as document $DOC_ID"
    cat "$tmp_response"
    echo
else
    echo "❌ Failed to save report (HTTP $http_code)" >&2
    cat "$tmp_response" >&2
    exit 1
fi
