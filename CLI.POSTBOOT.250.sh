#!/usr/bin/env bash
# === CLI.POSTBOOT.250 : POST-REBOOT QUICKCHECK (safe, idempotent) ===
# Mục tiêu: verify → (apply) → verify + SOP, rồi in DoD ngắn gọn.
set -Eeuo pipefail
ts(){ date -u +%Y-%m-%dT%H:%M:%SZ; }
mkdir -p .ci
LOG=".ci/postboot.log"
echo "[$(ts)] start POST-BOOT" | tee -a "$LOG"

# Bỏ pause nếu còn sót
rm -f .ci/.bootstrap_pause || true

# Env mặc định (có thể override qua shell)
export PROJECT="${PROJECT:-github-chatgpt-ggcloud}"
export SECRET_NAME="${SECRET_NAME:-gh_pat_sync_secrets}"

# 1) VERIFY (RO) → nếu fail thì APPLY rồi VERIFY lại
set +e
PROJECT="$PROJECT" SECRET_NAME="$SECRET_NAME" bash scripts/bootstrap_gh.sh verify
RC=$?
set -e
if [ $RC -ne 0 ]; then
  PROJECT="$PROJECT" SECRET_NAME="$SECRET_NAME" bash scripts/bootstrap_gh.sh apply
  PROJECT="$PROJECT" SECRET_NAME="$SECRET_NAME" bash scripts/bootstrap_gh.sh verify
fi

# 2) SOP (RO)
bash scripts/sop_bootstrap_check.sh

# 3) DoD snapshot (log-first)
MARKER=".ci/.bootstrap_done"
PASS="false"
[ -f .ci/sop_bootstrap_check/summary.json ] && PASS="$(jq -r '.pass' .ci/sop_bootstrap_check/summary.json 2>/dev/null || echo false)"
echo "=== DoD ===" | tee -a "$LOG"
[ -f "$MARKER" ] && echo "marker: present @ $(cat "$MARKER")" | tee -a "$LOG" || echo "marker: missing" | tee -a "$LOG"
echo "sop.pass: $PASS" | tee -a "$LOG"
git remote -v | sed 's/^/remote: /' | tee -a "$LOG" >/dev/null
gh auth status -h github.com >/dev/null 2>&1 && echo "gh: logged-in" | tee -a "$LOG" || echo "gh: not-logged-in" | tee -a "$LOG"
echo "[$(ts)] done. See $LOG"

