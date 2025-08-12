#!/bin/bash

# CI Hard Gate Guard Script - Verifies CI success by HEAD SHA
# Usage: scripts/ci_guard.sh [repo_name]
# Exit codes: 0=success, 1=failed CI, 2=script error

set -euo pipefail

# Constants
CI_LOGS_DIR=".ci/p169d/ci_logs"
CI_SUMMARY_FILE=".ci/p169d/ci_summary.json"
MAX_SEARCH_RUNS=40

# Get repository name (default to current repo name from remote)
REPO_NAME="${1:-}"
if [[ -z "$REPO_NAME" ]]; then
    REPO_NAME=$(basename "$(git remote get-url origin)" .git 2>/dev/null || echo "unknown-repo")
fi

# Ensure directories exist
mkdir -p "$CI_LOGS_DIR"

echo "🔍 CI Hard Gate: Checking CI status for HEAD SHA in repo: $REPO_NAME"

# Get current HEAD SHA
HEAD_SHA=$(git rev-parse HEAD)
echo "📋 HEAD SHA: $HEAD_SHA"

# Find the most recent workflow run for this HEAD SHA
echo "🔎 Searching for workflow runs matching HEAD SHA..."
RUN_DATA=$(gh run list --json databaseId,headSha,conclusion,status,workflowName,createdAt -L $MAX_SEARCH_RUNS 2>/dev/null || {
    echo "❌ Error: Failed to fetch workflow runs. Check gh auth status."
    exit 2
})

# Extract RUN_ID for matching HEAD SHA
RUN_ID=$(echo "$RUN_DATA" | jq -r --arg sha "$HEAD_SHA" '.[] | select(.headSha == $sha) | .databaseId' | head -1)

if [[ -z "$RUN_ID" || "$RUN_ID" == "null" ]]; then
    echo "❌ Error: No workflow run found for HEAD SHA $HEAD_SHA"
    echo "   Available runs:"
    echo "$RUN_DATA" | jq -r '.[] | "  - SHA: \(.headSha[0:8]) Run: \(.databaseId) Status: \(.status) Conclusion: \(.conclusion // "pending")"' | head -5
    exit 2
fi

echo "✅ Found RUN_ID: $RUN_ID"

# Get run details for verification
RUN_DETAILS=$(echo "$RUN_DATA" | jq -r --arg id "$RUN_ID" '.[] | select(.databaseId == ($id | tonumber))')
CONCLUSION=$(echo "$RUN_DETAILS" | jq -r '.conclusion // "pending"')
STATUS=$(echo "$RUN_DETAILS" | jq -r '.status')
WORKFLOW_NAME=$(echo "$RUN_DETAILS" | jq -r '.workflowName')
CREATED_AT=$(echo "$RUN_DETAILS" | jq -r '.createdAt')

echo "📊 Run Details:"
echo "   Workflow: $WORKFLOW_NAME"
echo "   Status: $STATUS"
echo "   Conclusion: $CONCLUSION"
echo "   Created: $CREATED_AT"

# Download logs
LOG_FILE="${CI_LOGS_DIR}/${REPO_NAME}_${RUN_ID}.log"
echo "📥 Downloading logs to: $LOG_FILE"

if ! gh run view --log --run-id "$RUN_ID" > "$LOG_FILE" 2>&1; then
    echo "⚠️  Warning: Failed to download logs, but continuing with status check"
    echo "Error downloading logs for run $RUN_ID" > "$LOG_FILE"
fi

# Create or update CI summary JSON
SUMMARY_ENTRY=$(cat <<EOF
{
  "repo": "$REPO_NAME",
  "head_sha": "$HEAD_SHA",
  "run_id": "$RUN_ID",
  "conclusion": "$CONCLUSION",
  "status": "$STATUS",
  "workflow_name": "$WORKFLOW_NAME",
  "created_at": "$CREATED_AT",
  "log_file": "$LOG_FILE",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)

# Update summary file (create if doesn't exist, or merge entry)
if [[ -f "$CI_SUMMARY_FILE" ]]; then
    # Read existing summary and add/update this repo's entry
    EXISTING_SUMMARY=$(cat "$CI_SUMMARY_FILE")
    UPDATED_SUMMARY=$(echo "$EXISTING_SUMMARY" | jq --argjson entry "$SUMMARY_ENTRY" '
        if type == "array" then
            map(select(.repo != $entry.repo)) + [$entry]
        else
            [$entry]
        end')
    echo "$UPDATED_SUMMARY" > "$CI_SUMMARY_FILE"
else
    echo "[$SUMMARY_ENTRY]" > "$CI_SUMMARY_FILE"
fi

echo "📝 Updated CI summary: $CI_SUMMARY_FILE"

# Check conclusion and exit accordingly
case "$CONCLUSION" in
    "success")
        echo "✅ CI PASS: All checks successful for HEAD SHA $HEAD_SHA"
        exit 0
        ;;
    "failure")
        echo "❌ CI FAIL: Workflow failed for HEAD SHA $HEAD_SHA"
        echo "   Check logs: $LOG_FILE"
        echo "   Run URL: https://github.com/$(gh repo view --json owner,name -q '.owner.login + \"/\" + .name')/actions/runs/$RUN_ID"
        exit 1
        ;;
    "cancelled")
        echo "⏹️  CI CANCELLED: Workflow was cancelled for HEAD SHA $HEAD_SHA"
        exit 1
        ;;
    "timed_out")
        echo "⏰ CI TIMEOUT: Workflow timed out for HEAD SHA $HEAD_SHA"
        exit 1
        ;;
    *)
        echo "⏳ CI PENDING: Workflow is still running or pending (status: $STATUS, conclusion: $CONCLUSION)"
        echo "   Run URL: https://github.com/$(gh repo view --json owner,name -q '.owner.login + \"/\" + .name')/actions/runs/$RUN_ID"
        exit 1
        ;;
esac
