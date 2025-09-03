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
