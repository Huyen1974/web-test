#!/usr/bin/env bash
set -Eeuo pipefail

# Friendly wrapper to manage Cloud Run traffic (promote / rollback)
# Defaults can be overridden via env: PROJECT, REGION, SERVICE

PROJECT="${PROJECT:-$(gcloud config get-value project 2>/dev/null || echo github-chatgpt-ggcloud)}"
REGION="${REGION:-$(gcloud config get-value run/region 2>/dev/null || echo asia-southeast1)}"
SERVICE="${SERVICE:-agent-data-test}"

usage() {
  cat <<EOF
Usage: $(basename "$0") <command> [args]

Commands:
  promote <REVISION_NAME>   Route 100% traffic to the specified revision
  rollback                  Route 100% traffic to the previous stable revision

Env overrides:
  PROJECT, REGION, SERVICE
EOF
}

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing dependency: $1" >&2; exit 2; }; }

promote() {
  local rev="$1"
  if [[ -z "$rev" ]]; then
    echo "[ERR] Missing revision name. Usage: $0 promote <REVISION_NAME>" >&2
    exit 2
  fi
  echo "[INFO] Promoting revision '$rev' to 100% traffic for service '$SERVICE' in '$REGION' (project: $PROJECT)"
  gcloud run services update-traffic "$SERVICE" \
    --project="$PROJECT" --region="$REGION" \
    --to-revisions "$rev=100"
  echo "[OK] Traffic updated. Current traffic:"
  gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" \
    --format='value(status.traffic)'
}

current_stable() {
  gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" \
    --format='json' | jq -r '.status.traffic[] | select(.percent==100) | .revisionName' | head -n1
}

previous_revision() {
  local curr="$1"
  gcloud run revisions list --project="$PROJECT" --region="$REGION" --service="$SERVICE" \
    --format=json | jq -r 'sort_by(.metadata.creationTimestamp) | reverse | .[].metadata.name' \
    | awk -v curr="$curr" '$0!=curr{print; exit}'
}

rollback() {
  echo "[INFO] Determining current stable (100% traffic) revision..."
  local curr; curr="$(current_stable)"
  if [[ -z "$curr" ]]; then
    echo "[ERR] Could not determine current stable revision." >&2
    exit 1
  fi
  echo "[INFO] Current stable: $curr"

  echo "[INFO] Resolving previous revision..."
  local prev; prev="$(previous_revision "$curr")"
  if [[ -z "$prev" ]]; then
    echo "[ERR] No previous revision found to rollback to." >&2
    exit 1
  fi
  echo "[INFO] Rolling back to: $prev"

  gcloud run services update-traffic "$SERVICE" \
    --project="$PROJECT" --region="$REGION" \
    --to-revisions "$prev=100"
  echo "[OK] Traffic updated. Current traffic:"
  gcloud run services describe "$SERVICE" --project="$PROJECT" --region="$REGION" \
    --format='value(status.traffic)'
}

main() {
  need gcloud; need jq; need awk
  local cmd="${1:-}"; shift || true
  case "$cmd" in
    promote) promote "${1:-}" ;;
    rollback) rollback ;;
    *) usage; exit 2 ;;
  esac
}

main "$@"

