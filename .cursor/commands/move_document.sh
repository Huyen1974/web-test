#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<'USAGE' >&2
Usage: @move_document <doc_id> --to <new_parent_id> [--base-url <url>] [--dry-run]

Wrapper around tools/move_document.sh to move documents inside the knowledge tree.
USAGE
}

if [[ $# -lt 1 ]]; then
    usage
    exit 1
fi

if [[ $1 == "--help" || $1 == "-h" ]]; then
    usage
    exit 0
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MOVE_SCRIPT="$ROOT_DIR/tools/move_document.sh"

if [[ ! -x "$MOVE_SCRIPT" ]]; then
    echo "❌ Expected helper script not executable: $MOVE_SCRIPT" >&2
    exit 1
fi

"$MOVE_SCRIPT" "$@"
