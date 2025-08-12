#!/usr/bin/env bash
set -euo pipefail
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

# Constants (do not edit)
SRC_GLOBAL='/Users/nmhuyen/Documents/Infor/Kế hoạch liên quan/Langdroid_Agent data/TÀI LIỆU QUY PHẠM/LƯU CHUẨN/BNEW GLOBAL RULES CURSOR 1.2.docx'
SRC_PROJECT='/Users/nmhuyen/Documents/Infor/Kế hoạch liên quan/Langdroid_Agent data/TÀI LIỆU QUY PHẠM/LƯU CHUẨN/NEW RULES AGENT DATA Project 1.2.docx'
DST_GLOBAL='/Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/.cursor/GLOBAL_RULES.md'
DST_PROJECT='/Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/.cursor/RULES_agent-data-langroid.md'
WORKDIR='/Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid'

# 0) Quick diag
command -v pandoc >/dev/null 2>&1 || { echo "ERR: pandoc missing"; exit 1; }
command -v git    >/dev/null 2>&1 || { echo "ERR: git missing"; exit 1; }
[ -d "$WORKDIR" ] || { echo "ERR: WORKDIR not found"; exit 1; }
cd "$WORKDIR"
git rev-parse --is-inside-work-tree >/dev/null || { echo "ERR: not a git repo"; exit 1; }

BRANCH="$(git rev-parse --abbrev-ref HEAD || echo 'UNKNOWN')"
echo "ℹ️ Branch: $BRANCH"
echo "ℹ️ Pending staged diff (if any):"
git diff --cached --name-status || true

# 1) Reproduce latest conversion outputs in a clean tmp
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/src" "$TMP/out" "$TMP/logs"
cp "$SRC_GLOBAL"  "$TMP/src/global.docx"
cp "$SRC_PROJECT" "$TMP/src/project.docx"

doc2md() {
  in="$1"; out="$2"; base="$3"
  # AST route for determinism
  pandoc "$in" -f docx -t json > "$TMP/out/$base.ast.json" 2> "$TMP/logs/$base.ast.err"
  pandoc "$TMP/out/$base.ast.json" -f json -t gfm --wrap=none --markdown-headings=atx \
         --strip-comments -o "$TMP/out/$out" 2> "$TMP/logs/$base.gfm.err"
  # Normalize
  perl -0777 -pe 's/\r\n?/\n/g; s/[ \t]+$//mg' "$TMP/out/$out" > "$TMP/out/$out.norm"
  mv "$TMP/out/$out.norm" "$TMP/out/$out"
}

doc2md "$TMP/src/global.docx"  "GLOBAL_RULES.md"              "global"
doc2md "$TMP/src/project.docx" "RULES_agent-data-langroid.md" "project"

# 2) Plain text equivalence (strict)
to_plain() { pandoc "$1" -t plain --wrap=none | perl -0777 -pe 's/\r\n?/\n/g; s/[ \t]+$//mg'; }
to_plain "$TMP/src/global.docx"  > "$TMP/out/src_global.txt"
to_plain "$TMP/src/project.docx" > "$TMP/out/src_project.txt"
to_plain "$TMP/out/GLOBAL_RULES.md"              > "$TMP/out/dst_global.txt"
to_plain "$TMP/out/RULES_agent-data-langroid.md" > "$TMP/out/dst_project.txt"

diff -u "$TMP/out/src_global.txt"  "$TMP/out/dst_global.txt"  > "$TMP/out/global.diff"  || true
diff -u "$TMP/out/src_project.txt" "$TMP/out/dst_project.txt" > "$TMP/out/project.diff" || true

G_DIFF_SIZE=$(wc -c < "$TMP/out/global.diff"  || echo 0)
P_DIFF_SIZE=$(wc -c < "$TMP/out/project.diff" || echo 0)
echo "ℹ️ Diff sizes (bytes) — global:$G_DIFF_SIZE project:$P_DIFF_SIZE"

# 3) If diffs non-empty, apply tolerances and retry once
if [ "$G_DIFF_SIZE" -gt 0 ] || [ "$P_DIFF_SIZE" -gt 0 ]; then
  echo "🔧 Applying tolerant normalization and re-checking…"
  norm_text() {
    # Normalize bullets, quotes, dashes, NBSP, repeated spaces, and list numbers
    perl -0777 -pe '
      s/\xC2\xA0/ /g;                          # NBSP -> space
      s/[""]/"/g; s/['"'"''"'"']/'"'"'/g;               # curly quotes -> straight
      s/[–—]/-/g;                               # en/em dash -> hyphen
      s/^\s*[\*\-\u2022]\s+/- /mg;             # various bullets -> "- "
      s/^\s*\d+\.\s+/- /mg;                     # numbered list -> "- "
      s/[ \t]+$//mg; s/\r\n?/\n/g;              # trim & unix EOL
      s/\n{3,}/\n\n/g;                          # collapse blank lines
    '
  }
  norm_text < "$TMP/out/src_global.txt"   > "$TMP/out/src_global.norm.txt"
  norm_text < "$TMP/out/dst_global.txt"   > "$TMP/out/dst_global.norm.txt"
  norm_text < "$TMP/out/src_project.txt"  > "$TMP/out/src_project.norm.txt"
  norm_text < "$TMP/out/dst_project.txt"  > "$TMP/out/dst_project.norm.txt"

  diff -u "$TMP/out/src_global.norm.txt"  "$TMP/out/dst_global.norm.txt"  > "$TMP/out/global.norm.diff"  || true
  diff -u "$TMP/out/src_project.norm.txt" "$TMP/out/dst_project.norm.txt" > "$TMP/out/project.norm.diff" || true

  NG_DIFF_SIZE=$(wc -c < "$TMP/out/global.norm.diff"  || echo 0)
  NP_DIFF_SIZE=$(wc -c < "$TMP/out/project.norm.diff" || echo 0)
  echo "ℹ️ Tolerant diff sizes — global:$NG_DIFF_SIZE project:$NP_DIFF_SIZE"

  if [ "$NG_DIFF_SIZE" -gt 0 ] || [ "$NP_DIFF_SIZE" -gt 0 ]; then
    echo "❌ Content still not equivalent after tolerance."
    echo "Show first 60 lines of diffs (global/project), then exit."
    [ "$NG_DIFF_SIZE" -gt 0 ] && head -n 60 "$TMP/out/global.norm.diff"  || true
    [ "$NP_DIFF_SIZE" -gt 0 ] && head -n 60 "$TMP/out/project.norm.diff" || true
    exit 1
  fi
fi

# 4) Atomic write to targets (create .cursor if missing)
mkdir -p "$(dirname "$DST_GLOBAL")" "$(dirname "$DST_PROJECT")"
cp "$TMP/out/GLOBAL_RULES.md"              "$DST_GLOBAL"
cp "$TMP/out/RULES_agent-data-langroid.md" "$DST_PROJECT"

# 5) Stage & commit if there is a change; otherwise report "no change"
git add "$DST_GLOBAL" "$DST_PROJECT" || true
if git diff --cached --quiet; then
  echo "ℹ️ No changes to commit (targets already up-to-date with sources)."
else
  git commit -m "docs(rules): sync from canonical DOCX (equivalence proven; tolerant normalization applied if needed)"
fi

# 6) Final report (no false success)
echo "✅ COMPLETE. Status:"
git status -s || true
echo "Targets:"
ls -l "$DST_GLOBAL" "$DST_PROJECT" || true
