#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import defaultdict
from pathlib import Path

RE_RULE = re.compile(r"^\[(?P<code>[A-Z]{2,})\]\s*(?P<title>.+)$")


def git_commit_hash(path: Path) -> str:
    try:
        out = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=path.parent)
        return out.decode().strip()
    except Exception:
        return "unknown"


def extract(src: Path) -> dict:
    text = src.read_text(encoding="utf-8")
    groups: dict[str, list[dict]] = defaultdict(list)
    counters: dict[str, int] = defaultdict(int)
    for idx, line in enumerate(text.splitlines(), start=1):
        m = RE_RULE.match(line.strip())
        if not m:
            continue
        code = m.group("code").upper()
        title = m.group("title").strip()
        # Only capture the first canonical rule per group (v1 scope)
        if not groups[code]:
            counters[code] = 1
            rid = f"{code}.1"
            groups[code].append({"id": rid, "title": title, "line": idx})

    ordered = [
        {"code": code, "items": groups.get(code, [])} for code in sorted(groups.keys())
    ]
    return {
        "constitution_commit": git_commit_hash(src),
        "source": str(src),
        "groups": ordered,
    }


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Extract canonical index from constitution"
    )
    ap.add_argument(
        "--source",
        default="docs/agent-a2a-constitution-v5.md",
        help="Path to frozen constitution markdown",
    )
    ap.add_argument(
        "--out",
        default="specs/canonical_index.json",
        help="Output JSON path",
    )
    args = ap.parse_args()

    src = Path(args.source)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = extract(src)
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote canonical index to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
