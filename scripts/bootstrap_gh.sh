#!/usr/bin/env bash
set -Eeuo pipefail

# Usage:
#   scripts/bootstrap_gh.sh verify   # chỉ kiểm tra token & scope, KHÔNG đổi trạng thái gh
#   scripts/bootstrap_gh.sh apply    # (mặc định) đăng nhập gh bằng PAT từ GSM
MODE="${1:-apply}"

PROJECT="${PROJECT:-github-chatgpt-ggcloud}"
SECRET_NAME="${SECRET_NAME:-gh_pat_sync_secrets}"  # đã kiểm chứng là hợp lệ

log(){ printf "## [bootstrap_gh] %s\n" "$*"; }

# 1) Lấy PAT từ GSM
log "fetch token from GSM: project=$PROJECT secret=$SECRET_NAME"
TOKEN="$(gcloud secrets versions access latest --project="$PROJECT" --secret="$SECRET_NAME")"

# 2) Kiểm chứng qua API /user (không đụng gh config)
H="$(mktemp)"; B="$(mktemp)"
curl -sS -D "$H" -o "$B" -H "Authorization: token $TOKEN" https://api.github.com/user >/dev/null
code="$(awk '/^HTTP/{c=$2} END{print c+0}' "$H" || true)"
login="$(jq -r ".login // empty" "$B" 2>/dev/null || true)"
scopes="$(awk 'BEGIN{IGNORECASE=1}/^x-oauth-scopes:/{sub(/^[^:]*:[[:space:]]*/,""); print}' "$H" | tr -d "\r")"
log "http=$code login=${login:-<none>}"
log "scopes=${scopes:-<none>}"

# 3) Yêu cầu scopes: repo + workflow
has_repo=0; has_wf=0
[[ ",${scopes// /}," == *",repo,"* ]] && has_repo=1
[[ ",${scopes// /}," == *",workflow,"* ]] && has_wf=1
if [[ "$code" -ne 200 || -z "$login" || $has_repo -ne 1 || $has_wf -ne 1 ]]; then
  log "FAIL: token invalid or missing required scopes (need: repo, workflow)"
  exit 2
fi
log "token OK (has repo, workflow)"

if [[ "$MODE" == "verify" ]]; then
  log "mode=verify → done (no auth changes)."
  exit 0
fi

# 4) apply: đăng nhập gh bằng PAT, an toàn qua stdin (không in token)
log "mode=apply → gh auth login with PAT"
printf "%s" "$TOKEN" | gh auth login -h github.com --with-token >/dev/null
gh auth status -h github.com || { log "gh auth status failed"; exit 3; }
log "gh auth status ok"
