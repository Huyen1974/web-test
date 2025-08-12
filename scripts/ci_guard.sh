#!/bin/bash
set -euo pipefail
CI_DIR=".ci/p169d"; LOGS="$CI_DIR/ci_logs"; SUM="$CI_DIR/ci_summary.json"
mkdir -p "$LOGS"
REPO="$(basename "$(git config --get remote.origin.url)" .git 2>/dev/null || echo repo)"
SHA="${GITHUB_SHA:-$(git rev-parse HEAD)}"
RID="${GITHUB_RUN_ID:?GITHUB_RUN_ID required}"
LOG_FILE="$LOGS/${REPO}_${RID}.log"

# Download logs for THIS run (no headSha search)
gh run view --log --run-id "$RID" > "$LOG_FILE" || echo "log download failed" > "$LOG_FILE"

ENT=$(jq -n --arg r "$REPO" --arg s "$SHA" --arg rid "$RID" --arg lf "$LOG_FILE" \
      --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '{repo:$r, head_sha:$s, run_id:$rid, log_file:$lf, timestamp:$ts}')
if [[ -f "$SUM" ]]; then
  jq --argjson e "$ENT" 'if type=="array" then map(select(.repo!=$e.repo))+[$e] else [$e] end' "$SUM" >"$SUM.tmp" && mv "$SUM.tmp" "$SUM"
else echo "[$ENT]" > "$SUM"; fi

# Infer conclusion from job results JSON
if [[ -z "${NEEDS_JSON:-}" ]]; then
  echo "WARN: NEEDS_JSON empty; treat non-success upstream as failure" >&2
  exit 1
fi
python3 - "$NEEDS_JSON" <<'PY'
import json,sys
needs=json.loads(sys.argv[1]) if len(sys.argv)>1 else {}
failed=[k for k,v in needs.items() if v.get("result")!="success"]
print("FAILED:",failed) if failed else print("ALL OK")
sys.exit(1 if failed else 0)
PY
