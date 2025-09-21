#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<'USAGE' >&2
Usage: @save_report <file_path> [--title <title>] [--parent <parent_id>] [--visible]

Wraps tools/save_report.sh so Cursor helpers can quickly upload reports.

Options:
  --title <title>     Optional human friendly title (defaults to file name)
  --parent <id>       Overrides target parent document (default $AGENT_DATA_PARENT_ID or "root")
  --visible           Pass through --visible to expose content in the web UI
USAGE
}

if [[ $# -lt 1 ]]; then
    usage
    exit 1
fi

FILE_PATH=$1
shift

TITLE=""
PARENT_ID="${AGENT_DATA_PARENT_ID:-root}"
VISIBLE=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --title)
            TITLE=${2:-}
            shift 2
            ;;
        --parent)
            PARENT_ID=${2:-}
            shift 2
            ;;
        --visible)
            VISIBLE=true
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1" >&2
            usage
            exit 1
            ;;
    esac
done

if [[ ! -f "$FILE_PATH" ]]; then
    echo "❌ File not found: $FILE_PATH" >&2
    exit 1
fi

if [[ -z "$TITLE" ]]; then
    TITLE=$(basename "$FILE_PATH")
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SAVE_SCRIPT="$ROOT_DIR/tools/save_report.sh"

if [[ ! -x "$SAVE_SCRIPT" ]]; then
    echo "❌ Expected helper script not executable: $SAVE_SCRIPT" >&2
    exit 1
fi

if [[ "$VISIBLE" == "true" ]]; then
    "$SAVE_SCRIPT" --visible "$TITLE" "$FILE_PATH" "$PARENT_ID"
else
    "$SAVE_SCRIPT" "$TITLE" "$FILE_PATH" "$PARENT_ID"
fi
