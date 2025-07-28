#!/usr/bin/env python3
"""Collect test manifest for CP0.4 test count freeze."""

import os
import sys

BASE = "tests"


def count():
    total = 0
    for _root, dirs, files in os.walk(BASE):
        # Skip __pycache__ directories
        dirs[:] = [d for d in dirs if d != "__pycache__"]

        # Count only files that are not build artifacts
        for file in files:
            if not file.endswith((".pyc", ".pyo")):
                total += 1
    return total


if __name__ == "__main__":
    if "--check" in sys.argv:
        cur = count()
        baseline_file = sys.argv[-1]

        with open(baseline_file) as f:
            base = int(f.read().strip())

        sys.exit(0 if cur == base else 1)
    else:
        print(count())
