#!/usr/bin/env python3
"""
Preflight Check for Cloud Run Deployment

Validates that required environment variables are present and non-empty.
Notes:
- Qdrant-related variables are intentionally not checked (suspended).
"""

from __future__ import annotations

import os
import sys
from collections.abc import Iterable

REQUIRED_ENV_VARS = [
    "GCP_PROJECT_ID",
    "GCP_SERVICE_ACCOUNT",
    "GCP_WIF_PROVIDER",
]


def _is_invalid(value: str | None) -> bool:
    if value is None:
        return True
    v = value.strip()
    if v == "":
        return True
    # Common placeholders to reject
    placeholders = {
        "REPLACE_ME",
        "YOUR-PROJECT-ID",
        "YOUR_SERVICE_ACCOUNT",
        "YOUR_WIF_PROVIDER",
    }
    return v in placeholders


def preflight_check(
    required_vars: Iterable[str] = REQUIRED_ENV_VARS,
) -> tuple[bool, list[str]]:
    missing: list[str] = []
    for name in required_vars:
        if _is_invalid(os.environ.get(name)):
            missing.append(name)
    return (len(missing) == 0), missing


def main() -> int:
    ok, missing = preflight_check()
    if ok:
        print("✅ Preflight check PASSED: required env vars present.")
        return 0
    print("❌ Preflight check FAILED: missing/invalid env vars:")
    for name in missing:
        print(f" - {name}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
