#!/usr/bin/env bash
# === CLI.PR.270 : PUSH/PR FINALIZE + VERSIONED HOOKS (safe, idempotent) ===
# Mục tiêu:
# 1) Chuẩn hoá pre-commit hook -> .githooks/pre-commit (versioned) + set core.hooksPath
# 2) Đẩy branch `bootstrap/finalize-session-startup` (đã commit) và mở PR nếu chưa có
# 3) Bảo toàn `bootstrap/guard-sot` & PR #70 (không đụng)
# 4) Không merge tự động; để CI canary kiểm tra rồi bạn review/merge
set -Eeuo pipefail
ts(){ date -u +%Y-%m-%dT%H:%M:%SZ; }
ROOT="$(pwd)"; mkdir -p .ci .githooks
LOG=".ci/pr270.log"; echo "[$(ts)] start CLI.PR.270 @ $ROOT" | tee -a "$LOG"

need(){ command -v "$1" >/dev/null || { echo "ERROR: missing $1" | tee -a "$LOG"; exit 2; }; }
for b in git gh; do need "$b"; done

# 0) Repo & origin guard
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "ERROR: not a git repo" | tee -a "$LOG"; exit 2; }
ORI="$(git remote get-url origin 2>/dev/null || true)"
case "$ORI" in
  *Huyen1974/agent-data-test*|*Huyen1974/agent-data-production*|*Huyen1974/chatgpt-githubnew* ) : ;;
  *) echo "ERROR: wrong origin: $ORI" | tee -a "$LOG"; exit 2;;
esac

# 1) Chuẩn hoá pre-commit (versioned)
cat > .githooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
# GUARD (versioned): protect bootstrap/bin/* and scripts/bootstrap_gh.sh unless ALLOW_BOOTSTRAP_SOT_CHANGE=1
set -euo pipefail
[ "${ALLOW_BOOTSTRAP_SOT_CHANGE:-0}" = "1" ] && exit 0
CHANGES="$(git diff --cached --name-status || true)"
BAD="$(printf "%s\n" "$CHANGES" | awk '($2 ~ /^bootstrap\/bin\// || $2=="scripts/bootstrap_gh.sh") && ($1=="D"||$1=="M"||$1=="R") {print}')"
if [ -n "$BAD" ]; then
  echo "ERROR: Protected files changed:"; echo "$BAD"
  echo "Set ALLOW_BOOTSTRAP_SOT_CHANGE=1 to override intentionally."; exit 1
fi
exit 0
HOOK
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
echo "hooksPath => $(git config core.hooksPath)" | tee -a "$LOG"

# 2) Commit & push branch finalize-session-startup + PR (nếu chưa)
CURR="$(git rev-parse --abbrev-ref HEAD)"
# bảo đảm branch có tồn tại local
if ! git rev-parse --verify bootstrap/finalize-session-startup >/dev/null 2>&1; then
  echo "ERROR: missing local branch bootstrap/finalize-session-startup" | tee -a "$LOG"; exit 2
fi
git checkout bootstrap/finalize-session-startup >/dev/null 2>&1
git add -A
git commit -m "chore(hooks): versioned pre-commit via core.hooksPath" || true

if ! git ls-remote --exit-code --heads origin bootstrap/finalize-session-startup >/dev/null 2>&1; then
  git push -u origin bootstrap/finalize-session-startup
else
  echo "Branch already on remote." | tee -a "$LOG"
fi

# mở PR nếu chưa có
PR_URL="$(gh pr list --state open --head bootstrap/finalize-session-startup --json url -q '.[0].url' 2>/dev/null || true)"
if [ -z "$PR_URL" ]; then
  gh pr create --title "chore(bootstrap): finalize session-startup (postboot target, docs, prompts, hooksPath)" \
               --body "Automated by CLI.PR.270. Includes versioned pre-commit guard + session-startup docs/prompts." \
               --base main --head bootstrap/finalize-session-startup --draft || true
  PR_URL="$(gh pr list --state open --head bootstrap/finalize-session-startup --json url -q '.[0].url' 2>/dev/null || true)"
  echo "PR created: ${PR_URL:-<none>}" | tee -a "$LOG"
else
  echo "PR exists: $PR_URL" | tee -a "$LOG"
fi

# trở lại nhánh trước
git checkout "$CURR" >/dev/null 2>&1 || true

echo "[$(ts)] done. Review/merge PR finalize-session-startup when CI green. Log: $LOG"
