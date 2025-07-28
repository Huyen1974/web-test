#!/usr/bin/env python3
import os
import pathlib
import sys

BASE = pathlib.Path("tests")


def count():
    total = 0
    for _root, dirs, files in os.walk(BASE):
        dirs[:] = [d for d in dirs if d != "__pycache__"]
        total += len([f for f in files if not f.endswith((".pyc", ".pyo"))])
    return total


if __name__ == "__main__":
    if "--check" in sys.argv:
        cur = count()
        with open(sys.argv[-1]) as fh:
            base = int(fh.read().strip())
        sys.exit(0 if cur == base else 1)
    else:
        print(count())
