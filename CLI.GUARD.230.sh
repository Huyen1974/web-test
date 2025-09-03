#!/usr/bin/env bash
# === CLI.GUARD.230 : RESTORE SoT + PRE-COMMIT & CI GUARDS (safe, idempotent) ===
# Mục tiêu:
# 1) Khôi phục SoT: bootstrap/bin/bootstrap_gh.sh (nếu thiếu) — verify/apply, RO trước, không tạo bootstrap mới
# 2) Bảo vệ không xoá/ghi đè nhầm: pre-commit hook chặn thay đổi bootstrap/bin/* (allow override qua env)
# 3) Canary CI: workflow fail nếu thiếu 4 file bắt buộc (SoT + wrappers)
# 4) Cập nhật checksum cho scripts/bootstrap_gh.sh vào .ci/bootstrap_gh.sha256 (nếu tồn tại)
# 5) Commit tất cả vào nhánh bootstrap/guard-sot (không push)
# Idempotent: có thể chạy nhiều lần, chỉ thay đổi khi cần
set -Eeuo pipefail

ts(){ date -u +%Y-%m-%dT%H:%M:%SZ; }
ROOT="$(pwd)"; mkdir -p .ci bootstrap/bin scripts .github/workflows
LOG=".ci/guard.log"; echo "[$(ts)] start CLI.GUARD.230 @ $ROOT" | tee -a "$LOG"

# --- 0) Safety checks: git repo + origin trong phạm vi ---
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: Not a git repo" | tee -a "$LOG"; exit 2; fi
ORI="$(git remote get-url origin 2>/dev/null || true)"
case "$ORI" in
  *Huyen1974/agent-data-test*|*Huyen1974/agent-data-production*|*Huyen1974/chatgpt-githubnew* ) : ;;
  *) echo "ERROR: wrong origin: $ORI" | tee -a "$LOG"; exit 2;;
esac

# helper: write file only if content differs
write_if_diff(){ # $1=path, stdin=content
  local dst="$1"; local tmp; tmp="$(mktemp)"
  cat > "$tmp"
  if [ ! -f "$dst" ] || ! cmp -s "$tmp" "$dst"; then
    mkdir -p "$(dirname "$dst")"
    mv -f "$tmp" "$dst"
    echo "UPDATED $dst" | tee -a "$LOG"
  else
    rm -f "$tmp"
    echo "KEEP    $dst" | tee -a "$LOG"
  fi
}

chmod_plusx(){ [ -f "$1" ] && chmod +x "$1" && echo "chmod +x $1" | tee -a "$LOG" || true; }

# --- 1) Restore SoT bootstrap/bin/bootstrap_gh.sh (only if missing) ---
if [ ! -f bootstrap/bin/bootstrap_gh.sh ]; then
  write_if_diff bootstrap/bin/bootstrap_gh.sh <<'SH'
#!/usr/bin/env bash
# SoT: bootstrap/bin/bootstrap_gh.sh
# Verify (RO) trước; chỉ apply nếu cần (đăng nhập gh cục bộ). Không tạo repo/secret mới.
set -euo pipefail
MODE="${1:-verify}"   # verify | apply
mkdir -p .ci
LOG=".ci/bootstrap.log"; RUN=".ci/.bootstrap_running"; SUM=".ci/bootstrap_gh.sha256"
ts(){ date -u +%FT%TZ; }

# guard concurrent
[ -f "$RUN" ] && { echo "[bootstrap] $MODE already running"; exit 0; }
trap 'rm -f "$RUN"' EXIT INT TERM HUP; printf "%s\n" "$(ts)" > "$RUN"

# env dual-load
if [ -f ".env.bootstrap" ]; then set -a; . ".env.bootstrap"; set +a
elif [ -f "bootstrap/env/.env.bootstrap" ]; then set -a; . "bootstrap/env/.env.bootstrap"; set +a
fi
PROJECT="${PROJECT:-}"; SECRET_NAME="${SECRET_NAME:-}"

{
  echo "== bootstrap:$MODE @ $(ts)"
  for b in git gh ssh; do command -v "$b" >/dev/null || { echo "missing:$b"; exit 2; }; done
  git rev-parse --is-inside-work-tree >/dev/null || { echo "not a git repo"; exit 2; }
  ORI="$(git remote get-url origin 2>/dev/null || true)"
  case "$ORI" in
    *Huyen1974/agent-data-test*|*Huyen1974/agent-data-production*|*Huyen1974/chatgpt-githubnew* ) : ;;
    *) echo "wrong origin:$ORI"; exit 2;;
  esac
  echo "origin:$ORI"

  # quick SSH check (3s timeout, không chặn)
  ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=3 -T git@github.com >/dev/null 2>&1 || true

  echo "- gh auth status (RO)"
  if gh auth status -h github.com >/dev/null 2>&1; then echo "gh:logged-in"; else echo "gh:not-logged-in"; fi

  # checksum self (record only)
  (command -v sha256sum >/dev/null && sha256sum "$0" || shasum -a 256 "$0") | awk '{print $1}' > "$SUM".new
  [ -f "$SUM" ] && diff -q "$SUM" "$SUM".new >/dev/null 2>&1 || cp -f "$SUM".new "$SUM"
  rm -f "$SUM".new

  if [ "$MODE" = "verify" ]; then
    gh auth status -h github.com >/dev/null 2>&1 || { echo "verify:gh not logged-in"; exit 3; }
    echo "verify:PASS" ; exit 0
  fi

  # APPLY — local login only (no writes beyond auth)
  if gh auth status -h github.com >/dev/null 2>&1; then
    echo "apply:already logged in"
  else
    echo "apply:try login via env/secret"
    if [ -n "${GITHUB_TOKEN:-}" ]; then
      echo "$GITHUB_TOKEN" | gh auth login --with-token
    elif [ -n "${PROJECT:-}" ] && [ -n "${SECRET_NAME:-}" ] && command -v gcloud >/dev/null 2>&1; then
      TOK="$(gcloud secrets versions access latest --secret="$SECRET_NAME" 2>/dev/null || true)"
      [ -n "$TOK" ] && echo "$TOK" | gh auth login --with-token || true
    fi
  fi
  gh auth status -h github.com >/dev/null 2>&1 || { echo "apply:gh login failed"; exit 4; }
  echo "apply:PASS"
} | tee -a "$LOG"
SH
  chmod_plusx bootstrap/bin/bootstrap_gh.sh
else
  echo "SoT exists: bootstrap/bin/bootstrap_gh.sh" | tee -a "$LOG"
  chmod_plusx bootstrap/bin/bootstrap_gh.sh
fi

# Ensure canonical SOP exists (do not override if present)
if [ ! -f bootstrap/bin/sop_bootstrap_check.sh ]; then
  write_if_diff bootstrap/bin/sop_bootstrap_check.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail
CLI_ID="SOP.bootstrap-check.quick"
EVID_DIR=".ci/sop_bootstrap_check"; mkdir -p "$EVID_DIR"
SUMMARY="$EVID_DIR/summary.json"
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
SH
  chmod_plusx bootstrap/bin/sop_bootstrap_check.sh
else
  chmod_plusx bootstrap/bin/sop_bootstrap_check.sh
fi

# --- 2) Pre-commit hook: block changes in bootstrap/bin/* unless allowed ---
mkdir -p .git/hooks
write_if_diff .git/hooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
# GUARD: protect bootstrap/bin/* from accidental delete/modify.
# Allow override with env ALLOW_BOOTSTRAP_SOT_CHANGE=1.
set -euo pipefail
if [ "${ALLOW_BOOTSTRAP_SOT_CHANGE:-0}" = "1" ]; then exit 0; fi
CHANGES="$(git diff --cached --name-status || true)"
# Block D(lete)/M(odify)/R(ename) under bootstrap/bin/
BAD="$(printf "%s\n" "$CHANGES" | awk '$2 ~ /^bootstrap\/bin\// && ($1=="D"||$1=="M"||$1=="R") {print}')"
if [ -n "$BAD" ]; then
  echo "ERROR: Protected files under bootstrap/bin/ changed:"
  echo "$BAD"
  echo "Set ALLOW_BOOTSTRAP_SOT_CHANGE=1 if you really intend to modify SoT."
  exit 1
fi
exit 0
HOOK
chmod_plusx .git/hooks/pre-commit

# --- 3) CI canary workflow ---
write_if_diff .github/workflows/guard_bootstrap.yml <<'YML'
name: guard_bootstrap
on:
  push:
  pull_request:
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify bootstrap scaffold exists
        run: |
          test -x bootstrap/bin/bootstrap_gh.sh
          test -x bootstrap/bin/sop_bootstrap_check.sh
          test -x scripts/bootstrap_gh.sh
          test -x scripts/sop_bootstrap_check.sh
YML

# --- 4) Refresh checksum for scripts/bootstrap_gh.sh (if exists) ---
if [ -f scripts/bootstrap_gh.sh ]; then
  SHASUM=$((command -v shasum >/dev/null && shasum -a 256 scripts/bootstrap_gh.sh || sha256sum scripts/bootstrap_gh.sh) | awk '{print $1}')
  echo "$SHASUM" > .ci/bootstrap_gh.sha256
  echo "UPDATED .ci/bootstrap_gh.sha256 = $SHASUM" | tee -a "$LOG"
fi

# --- 5) Commit on branch bootstrap/guard-sot (no push) ---
CURR="$(git rev-parse --abbrev-ref HEAD)"
if ! git rev-parse --verify bootstrap/guard-sot >/dev/null 2>&1; then
  git checkout -b bootstrap/guard-sot
else
  git checkout bootstrap/guard-sot
fi
git add -A
git commit -m "chore(bootstrap): restore SoT + pre-commit guard + CI canary + checksum refresh" || echo "Nothing to commit"
echo "Committed on branch: bootstrap/guard-sot (from: $CURR)" | tee -a "$LOG"

echo "[$(ts)] CLI.GUARD.230 done. Next: run verify → (apply) → verify → SOP as usual."

