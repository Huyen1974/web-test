#!/usr/bin/env bash
# === CLI.PREFLIGHT.240 : PRE-FLIGHT BEFORE REBOOT (safe, idempotent) ===
# Mục tiêu: Đảm bảo SoT/wrappers/guard/CI đều sẵn sàng, sync checksum, push nhánh guard-sot & mở PR draft nếu cần.
set -Eeuo pipefail
ts(){ date -u +%Y-%m-%dT%H:%M:%SZ; }
ROOT="$(pwd)"; mkdir -p .ci
LOG=".ci/preflight.log"; RPT=".ci/preflight_report_$(date -u +%Y%m%dT%H%M%SZ).txt"
echo "[$(ts)] start PRE-FLIGHT @ $ROOT" | tee -a "$LOG"; : > "$RPT"

need(){ command -v "$1" >/dev/null || { echo "ERROR: missing $1" | tee -a "$LOG"; exit 2; }; }
for b in git gh shasum jq; do need "$b" || true; done

# 1) Kiểm tra repo + origin
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "ERROR: not a git repo" | tee -a "$LOG"; exit 2; }
ORI="$(git remote get-url origin 2>/dev/null || true)"
case "$ORI" in
  *Huyen1974/agent-data-test*|*Huyen1974/agent-data-production*|*Huyen1974/chatgpt-githubnew*) : ;;
  *) echo "ERROR: wrong origin: $ORI" | tee -a "$LOG"; exit 2;;
esac

# 2) SoT & wrappers: tồn tại + executable
PASS=1
chk(){ [ -x "$1" ] && echo "OK $1" | tee -a "$LOG" || { echo "MISS/!x $1" | tee -a "$LOG"; PASS=0; }; }
chk bootstrap/bin/bootstrap_gh.sh
chk bootstrap/bin/sop_bootstrap_check.sh
chk scripts/bootstrap_gh.sh
chk scripts/sop_bootstrap_check.sh

# 3) Pre-commit hook & CI canary
[ -x .git/hooks/pre-commit ] && echo "OK .git/hooks/pre-commit" | tee -a "$LOG" || { echo "MISS .git/hooks/pre-commit" | tee -a "$LOG"; PASS=0; }
[ -f .github/workflows/guard_bootstrap.yml ] && echo "OK guard_bootstrap.yml" | tee -a "$LOG" || { echo "MISS guard_bootstrap.yml" | tee -a "$LOG"; PASS=0; }

# 4) Đồng bộ checksum wrapper (nếu có)
if [ -f scripts/bootstrap_gh.sh ]; then
  SUM_NEW="$(shasum -a 256 scripts/bootstrap_gh.sh | awk '{print $1}')"
  if [ -f .ci/bootstrap_gh.sha256 ]; then
    SUM_OLD="$(cat .ci/bootstrap_gh.sha256)"
  else SUM_OLD=""; fi
  if [ "$SUM_NEW" != "$SUM_OLD" ]; then
    echo "$SUM_NEW" > .ci/bootstrap_gh.sha256
    echo "UPDATED .ci/bootstrap_gh.sha256 -> $SUM_NEW" | tee -a "$LOG"
  else
    echo "OK checksum scripts/bootstrap_gh.sh" | tee -a "$LOG"
  fi
fi

# 5) Push nhánh guard-sot + PR draft (nếu chưa có)
CURR="$(git rev-parse --abbrev-ref HEAD)"
if git rev-parse --verify bootstrap/guard-sot >/dev/null 2>&1; then
  git checkout bootstrap/guard-sot >/dev/null 2>&1
  git add -A && git commit -m "chore(preflight): sync checksum & guards" || true
  if ! git ls-remote --exit-code --heads origin bootstrap/guard-sot >/dev/null 2>&1; then
    git push -u origin bootstrap/guard-sot
    gh pr create --title "chore(bootstrap): guard SoT + CI canary" --body "Auto-created by PRE-FLIGHT.240" --base main --draft || true
    echo "PUSHED & PR draft created" | tee -a "$LOG"
  else
    echo "Branch already on remote" | tee -a "$LOG"
  fi
  git checkout "$CURR" >/dev/null 2>&1 || true
else
  echo "NOTE: local branch bootstrap/guard-sot not found (skip push/PR)" | tee -a "$LOG"
fi

# 6) DoD tóm tắt
{
  echo "=== PREFLIGHT DoD ==="
  for f in bootstrap/bin/bootstrap_gh.sh bootstrap/bin/sop_bootstrap_check.sh scripts/bootstrap_gh.sh scripts/sop_bootstrap_check.sh; do
    [ -x "$f" ] && echo "[ok] $f" || echo "[missing] $f"
  done
  [ -x .git/hooks/pre-commit ] && echo "[ok] .git/hooks/pre-commit" || echo "[missing] .git/hooks/pre-commit"
  [ -f .github/workflows/guard_bootstrap.yml ] && echo "[ok] guard_bootstrap.yml" || echo "[missing] guard_bootstrap.yml"
  [ -f .ci/bootstrap_gh.sha256 ] && echo "[ok] .ci/bootstrap_gh.sha256=$(cat .ci/bootstrap_gh.sha256)" || echo "[missing] .ci/bootstrap_gh.sha256"
} | tee -a "$LOG" | tee -a "$RPT"

[ $PASS -eq 1 ] && echo "RESULT: PASS — Ready to reboot test." | tee -a "$LOG" | tee -a "$RPT" || { echo "RESULT: PARTIAL — Fix items above before reboot." | tee -a "$LOG" | tee -a "$RPT"; exit 1; }

echo "[$(ts)] done. Report: $RPT"

