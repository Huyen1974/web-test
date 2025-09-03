#!/usr/bin/env bash
# SIGN:AGENT_BOOTSTRAP_V1
set -euo pipefail
exec bash "$(dirname "$0")/../bootstrap/bin/sop_bootstrap_check.sh" "$@"

