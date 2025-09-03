#!/usr/bin/env bash
# === CLI.REPAIR.220 : RESTORE MISSING SOP + ENSURE VERIFY WRITES MARKER ===
# Mục tiêu:
#  - Tạo lại scripts/sop_bootstrap_check.sh (wrapper) + bootstrap/bin/sop_bootstrap_check.sh (nếu thiếu)
#  - Thay wrapper scripts/bootstrap_gh.sh để sau khi 'verify' PASS thì ghi .ci/.bootstrap_done
#  - KHÔNG sửa nội dung bootstrap/bin/bootstrap_gh.sh (SoT)
# Dùng:
#   bash CLI.REPAIR.220.sh
set -Eeuo pipefail
SIG="SIGN:AGENT_BOOTSTRAP_V1"
ts(){ date -u +%Y-%m-%dT%H:%M:%SZ; }
ROOT="$(pwd)"; mkdir -p .ci bootstrap/bin scripts
LOG=".ci/repair.log"; echo "[$(ts)] start REPAIR @ $ROOT" | tee -a "$LOG"

# 0) Kiểm tra SoT chính
if [ ! -x bootstrap/bin/bootstrap_gh.sh ]; then
  echo "ERROR: missing bootstrap/bin/bootstrap_gh.sh (SoT). Dừng để tránh tạo mới." | tee -a "$LOG"
  exit 2
fi

# 1) SOP canonical (bootstrap/bin) — chỉ tạo nếu thiếu
if [ ! -x bootstrap/bin/sop_bootstrap_check.sh ]; then
  cat > bootstrap/bin/sop_bootstrap_check.sh <<'EOF'
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
EOF
  chmod +x bootstrap/bin/sop_bootstrap_check.sh
  echo "[$(ts)] created bootstrap/bin/sop_bootstrap_check.sh" | tee -a "$LOG"
else
  echo "[$(ts)] keep existing bootstrap/bin/sop_bootstrap_check.sh" | tee -a "$LOG"
fi

# 2) SOP wrapper (scripts/) — tạo/ghi đè an toàn
cat > scripts/sop_bootstrap_check.sh <<'EOF'
#!/usr/bin/env bash
# SIGN:AGENT_BOOTSTRAP_V1
set -euo pipefail
exec bash "$(dirname "$0")/../bootstrap/bin/sop_bootstrap_check.sh" "$@"
EOF
chmod +x scripts/sop_bootstrap_check.sh
echo "[$(ts)] ensured scripts/sop_bootstrap_check.sh" | tee -a "$LOG"

# 3) Wrapper chính (scripts/bootstrap_gh.sh) — đảm bảo ghi marker sau verify PASS
cat > scripts/bootstrap_gh.sh <<'EOF'
#!/usr/bin/env bash
# SIGN:AGENT_BOOTSTRAP_V1
set -euo pipefail
MODE="${1:-verify}"
# Chạy SoT
bash "$(dirname "$0")/../bootstrap/bin/bootstrap_gh.sh" "$MODE"
RC=$?
# Nếu VERIFY PASS -> ghi marker (local-only, không đụng GitHub)
if [ "$RC" -eq 0 ] && [ "$MODE" = "verify" ]; then
  mkdir -p .ci
  date -u +%Y-%m-%dT%H:%M:%SZ > .ci/.bootstrap_done
fi
exit "$RC"
EOF
chmod +x scripts/bootstrap_gh.sh
echo "[$(ts)] ensured scripts/bootstrap_gh.sh (marker-on-verify)" | tee -a "$LOG"

echo "[$(ts)] REPAIR done. Next: run verify → (apply) → verify, rồi chạy SOP."

