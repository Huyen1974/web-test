#!/usr/bin/env bash
# === CLI.FINALIZE.260 : INSTALL SESSION-STARTUP SHORTCUTS & DOCS (safe, idempotent) ===
# Mục tiêu:
# 1) Đảm bảo có CLI.POSTBOOT.250.sh (post-reboot quickcheck) tại root
# 2) Tạo Makefile target 'postboot' chạy CLI.POSTBOOT.250.sh
# 3) Bổ sung hướng dẫn chuẩn vào docs/rules/bootstrap.md (SECTION: SESSION STARTUP)
# 4) Xuất sẵn 2 "prompt để dán" cho Codex & Cursor tại .ci/
# 5) Commit vào nhánh bootstrap/finalize-session-startup (không push)
set -Eeuo pipefail
ts(){ date -u +%Y-%m-%dT%H:%M:%SZ; }
ROOT="$(pwd)"; mkdir -p .ci docs/rules
LOG=".ci/finalize.log"; echo "[$(ts)] start FINALIZE.260 @ $ROOT" | tee -a "$LOG"

need(){ command -v "$1" >/dev/null || { echo "ERROR: missing $1" | tee -a "$LOG"; exit 2; }; }
need git

# Safety: repo & origin
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "ERROR: not a git repo" | tee -a "$LOG"; exit 2; }
ORI="$(git remote get-url origin 2>/dev/null || true)"
case "$ORI" in
  *Huyen1974/agent-data-test*|*Huyen1974/agent-data-production*|*Huyen1974/chatgpt-githubnew* ) : ;;
  *) echo "ERROR: wrong origin: $ORI" | tee -a "$LOG"; exit 2;;
esac

write_if_diff(){ # $1=path, stdin=content
  local dst="$1"; local tmp; tmp="$(mktemp)"
  cat > "$tmp"
  if [ ! -f "$dst" ] || ! cmp -s "$tmp" "$dst"; then
    mkdir -p "$(dirname "$dst")"; mv -f "$tmp" "$dst"; echo "UPDATED $dst" | tee -a "$LOG"
  else rm -f "$tmp"; echo "KEEP    $dst" | tee -a "$LOG"; fi
}

# 1) Ensure CLI.POSTBOOT.250.sh present (use current canonical content if missing)
if [ ! -f CLI.POSTBOOT.250.sh ]; then
  write_if_diff CLI.POSTBOOT.250.sh <<'SH'
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
SH
  chmod +x CLI.POSTBOOT.250.sh
else
  echo "KEEP    CLI.POSTBOOT.250.sh" | tee -a "$LOG"
fi

# 2) Makefile target 'postboot'
if [ -f Makefile ] && grep -qE '^[[:space:]]*postboot:' Makefile; then
  echo "KEEP    Makefile (postboot exists)" | tee -a "$LOG"
else
  if [ ! -f Makefile ]; then : > Makefile; fi
  {
    echo ""
    echo "postboot:"
    echo "\t@bash CLI.POSTBOOT.250.sh"
  } >> Makefile
  echo "UPDATED Makefile (added postboot target)" | tee -a "$LOG"
fi

# 3) Docs: SESSION STARTUP section (append or replace block)
BOOT_DOC="docs/rules/bootstrap.md"
[ -f "$BOOT_DOC" ] || : > "$BOOT_DOC"
SESSION_BLOCK="$(cat <<'MD'
<!-- SESSION-STARTUP -->
## Session Startup (Codex/Cursor)

Mục tiêu: Mỗi phiên mới chỉ cần 1 bước: chạy post-boot quickcheck để verify → (apply nếu cần) → verify + SOP và in DoD.

Lệnh chạy:

```bash
bash CLI.POSTBOOT.250.sh
# hoặc: make postboot
```

Kết quả mong đợi:
- Log tại `.ci/postboot.log` và DoD snapshot (marker, sop.pass, gh status, origin).
- Tập tin dấu mốc `.ci/.bootstrap_done` (nếu gh đã đăng nhập).
- Báo cáo `.ci/sop_bootstrap_check/summary.json` với `pass:true` khi hợp lệ.

Gợi ý khắc phục nhanh:
- gh chưa cài/đăng nhập: cài GitHub CLI; script sẽ thử `GITHUB_TOKEN` hoặc Google Secret Manager (`$PROJECT`/`$SECRET_NAME`).
- Sai remote `origin`: cập nhật về repo hợp lệ.

Env override thường dùng:
- `PROJECT`, `SECRET_NAME`, `GITHUB_TOKEN`

Copy-paste prompt có sẵn: `.ci/prompt_codex.txt`, `.ci/prompt_cursor.txt`.
<!-- /SESSION-STARTUP -->
MD
)"

if grep -q "<!-- SESSION-STARTUP -->" "$BOOT_DOC"; then
  tmpdoc="$(mktemp)"
  # Remove existing block then append refreshed block at end
  sed -e '/<!-- SESSION-STARTUP -->/,/<!-- \/SESSION-STARTUP -->/d' "$BOOT_DOC" > "$tmpdoc"
  printf "\n%s\n" "$SESSION_BLOCK" >> "$tmpdoc"
  write_if_diff "$BOOT_DOC" < "$tmpdoc"
  rm -f "$tmpdoc"
else
  printf "\n%s\n" "$SESSION_BLOCK" | write_if_diff "$BOOT_DOC"
fi

# 4) Export copy-paste prompts for Codex & Cursor
write_if_diff .ci/prompt_codex.txt <<'TXT'
[SESSION STARTUP]
Please run the post-boot quickcheck now and report a short DoD.

Steps:
1) Run: `./CLI.POSTBOOT.250.sh` (safe, idempotent)
2) Paste DoD snapshot: marker state, sop.pass, gh status, and origin remote.
3) If verify fails, the script will apply then re-verify. Do not push any commits.

If anything is missing, suggest the smallest fix and ask before changing SoT under `bootstrap/bin/`.
TXT

write_if_diff .ci/prompt_cursor.txt <<'TXT'
[SESSION STARTUP]
Run `./CLI.POSTBOOT.250.sh` (or `make postboot`). Then show a concise DoD:
- marker (.ci/.bootstrap_done)
- sop.pass (.ci/sop_bootstrap_check/summary.json)
- gh auth status
- origin remote

If gh not logged in, allow the script to apply using token from env or GSM, then re-run verify. Do not push.
TXT

# 5) Commit on branch bootstrap/finalize-session-startup (no push)
CURR="$(git rev-parse --abbrev-ref HEAD)"
if git rev-parse --verify bootstrap/finalize-session-startup >/dev/null 2>&1; then
  git checkout bootstrap/finalize-session-startup
else
  git checkout -b bootstrap/finalize-session-startup
fi
git add -A
git commit -m "chore(bootstrap): finalize session-startup (postboot target, docs, prompts)" || echo "Nothing to commit" | tee -a "$LOG"
echo "Committed on branch: bootstrap/finalize-session-startup (from: $CURR)" | tee -a "$LOG"

echo "[$(ts)] FINALIZE.260 done. Next: make postboot, then follow docs/rules/bootstrap.md."

