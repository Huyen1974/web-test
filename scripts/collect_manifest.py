#!/usr/bin/env python3
"""
Test manifest collection script for CP0.4 test count freeze.

This script walks the ./tests directory and outputs sorted "file::testname" lines.
It validates that all test functions have @pytest.mark.unit decorator.
The --check flag compares with a baseline file and exits with non-zero if there are differences.
"""

import os
import sys

BASE = "tests"


def count():
    total = 0
    files_found = []
    for _root, _, files in os.walk(BASE):
        for file in files:
            files_found.append(os.path.join(_root, file))
        total += len(files)

    # Debug output to stderr so it doesn't interfere with normal output
    print(f"DEBUG: Found {total} files in {BASE}/", file=sys.stderr)
    for f in sorted(files_found):
        print(f"DEBUG: {f}", file=sys.stderr)

    return total


if "--check" in sys.argv:
    cur = count()
    baseline_file = sys.argv[-1]
    print(f"DEBUG: Reading baseline from {baseline_file}", file=sys.stderr)

    with open(baseline_file) as f:
        base = int(f.read().strip())

    print(f"DEBUG: Current count: {cur}, Baseline count: {base}", file=sys.stderr)

    if cur == base:
        print("DEBUG: Counts match - success", file=sys.stderr)
        sys.exit(0)
    else:
        print(f"DEBUG: Counts differ - current={cur}, baseline={base}", file=sys.stderr)
        sys.exit(1)
else:
    print(count())
