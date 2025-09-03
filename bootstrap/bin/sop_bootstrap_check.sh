#!/usr/bin/env bash
# SIGN:AGENT_BOOTSTRAP_V1
set -euo pipefail
CLI_ID="SOP.bootstrap-check.quick"
EVID_DIR=".ci/sop_bootstrap_check"; mkdir -p "$EVID_DIR"
SUMMARY="$EVID_DIR/summary.json"; DIAG="$EVID_DIR/diag.txt"
{ which -a gh || true; gh --version || true; which -a git || true; git --version || true; } > "$DIAG" 2>&1
for b in gh jq git; do command -v "$b" >/dev/null || { echo "[$CLI_ID] ERROR: missing $b"; exit 2; }; done
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "[$CLI_ID] FAIL: not a git repo"; exit 2; }
ORI="$(git remote get-url origin 2>/dev/null || true)"
case "$ORI" in
  *Huyen1974/agent-data-test*|*Huyen1974/agent-data-production*|*Huyen1974/chatgpt-githubnew* ) : ;;
  *) echo "[$CLI_ID] FAIL: wrong origin remote"; exit 2;;
esac
gh auth status -h github.com >/dev/null 2>&1 || { echo "[$CLI_ID] FAIL: gh not authenticated"; exit 1; }
HEAD_SHA="$(git rev-parse HEAD)"
jq -n --arg repo "$ORI" --arg head "$HEAD_SHA" '{pass:true, ts:now|todate, repo:$repo, head:$head}' > "$SUMMARY"
echo "OK"

