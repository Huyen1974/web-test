#!/usr/bin/env python3
"""
Manifest Drift Check Script (CP0.4)

This script checks if the current test file count matches the baseline
to prevent test count drift without proper approval.

Exit codes:
    0: No drift detected (current count == baseline)
    1: Drift detected (current count != baseline)
    2: Error in execution
"""

import sys
from pathlib import Path


def main():
    """Check manifest drift against baseline."""
    try:
        # Use collect_manifest.py logic to count current files
        from collect_manifest import count

        current_count = count()

        # Read baseline from test_manifest_baseline.txt
        baseline_file = Path("test_manifest_baseline.txt")
        if not baseline_file.exists():
            print(f"ERROR: Baseline file {baseline_file} not found", file=sys.stderr)
            return 2

        with open(baseline_file) as f:
            baseline_count = int(f.read().strip())

        # Calculate drift
        drift = current_count - baseline_count

        if drift == 0:
            print(f"✅ Manifest check PASS: {current_count} test files (no drift)")
            return 0
        else:
            print(
                f"❌ Manifest drift detected: {current_count} current vs {baseline_count} baseline (drift: {drift:+d})"
            )
            print("To fix this, update the baseline:")
            print("  python scripts/collect_manifest.py > test_manifest_baseline.txt")
            print("  git add test_manifest_baseline.txt tests/")
            print("  git commit -m 'test: update manifest baseline'")
            return 1

    except Exception as e:
        print(f"ERROR: Failed to check manifest: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())

# CI note: touching this file triggers Lint Only workflow on push (no test drift).
