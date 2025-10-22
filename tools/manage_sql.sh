#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME=$(basename "$0")
ACTION=${1:-}
INSTANCE=${SQL_INSTANCE:-${CLOUD_SQL_INSTANCE:-mysql-directus-web-test}}
PROJECT=${SQL_PROJECT:-${CLOUD_SQL_PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}}
if [[ "$PROJECT" == "(unset)" ]]; then
  PROJECT=""
fi

usage() {
  cat <<USAGE
Usage: $SCRIPT_NAME <start|stop|status> [--instance INSTANCE] [--project PROJECT]

Environment variables:
  SQL_INSTANCE / CLOUD_SQL_INSTANCE  Cloud SQL instance name (default: mysql-directus-web-test)
  SQL_PROJECT  / CLOUD_SQL_PROJECT   GCP project ID (default: current gcloud config project)
USAGE
}

if [[ -z "$ACTION" ]]; then
  usage
  exit 1
fi

shift
while [[ $# -gt 0 ]]; do
  case $1 in
    --instance)
      INSTANCE=${2:-}
      shift 2
      ;;
    --project)
      PROJECT=${2:-}
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$INSTANCE" ]]; then
  echo "Cloud SQL instance name is required (set SQL_INSTANCE or use --instance)." >&2
  exit 1
fi

if [[ -z "$PROJECT" ]]; then
  echo "GCP project ID is required (set SQL_PROJECT or use --project)." >&2
  exit 1
fi

run_patch() {
  local policy=$1
  echo "Setting activation policy to $policy for instance $INSTANCE (project $PROJECT)..."
  gcloud sql instances patch "$INSTANCE" \
    --project "$PROJECT" \
    --activation-policy "$policy" \
    --quiet >/dev/null
  echo "Instance $INSTANCE activation policy updated to $policy."
}

case $ACTION in
  start)
    run_patch ALWAYS
    ;;
  stop)
    run_patch NEVER
    ;;
  status)
    echo "Fetching status for instance $INSTANCE (project $PROJECT)..."
    gcloud sql instances describe "$INSTANCE" \
      --project "$PROJECT" \
      --format "get(state)"
    ;;
  *)
    echo "Unsupported action: $ACTION" >&2
    usage
    exit 1
    ;;
esac
