#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import yaml


def load_canonical(path: Path) -> set[str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    ids: set[str] = set()
    if "items" in data:
        for it in data["items"]:
            if isinstance(it, dict) and it.get("cid"):
                ids.add(str(it["cid"]))
    else:
        for group in data.get("groups", []):
            for it in group.get("items", []):
                if isinstance(it, dict) and it.get("id"):
                    ids.add(str(it["id"]))
    return ids


def read_specs(specs_dir: Path) -> List[Tuple[str, str, Path]]:
    out: List[Tuple[str, str, Path]] = []
    for p in sorted(specs_dir.glob("*.a2a-spec.yml")):
        try:
            raw = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
            sid = str(raw.get("id"))
            dc = str(raw.get("doc_cite") or "")
            out.append((sid, dc, p))
        except Exception:
            continue
    return out


def width_of_doc_line(md_ref: str, root: Path) -> int:
    if md_ref.startswith("MD:") and "#L" in md_ref:
        try:
            pp, ln = md_ref[3:].split("#L", 1)
            line_no = int(ln)
            text = (root / pp).read_text(encoding="utf-8").splitlines()
            if 1 <= line_no <= len(text):
                return len(text[line_no - 1])
        except Exception:
            return -1
    return -1


def main(argv: List[str] | None = None) -> int:
    root = Path.cwd()
    specs_dir = root / "specs"
    canonical_path = root / "specs" / "canonical_index.json"

    if not canonical_path.exists():
        print("::warning::canonical_index.json not found; skipping speclint")
        return 0

    canonical_ids = load_canonical(canonical_path)
    specs = read_specs(specs_dir)

    errors = 0

    # Spec→Doc check
    for sid, _dc, p in specs:
        if sid not in canonical_ids:
            print(f"::error file={p}::Spec id not present in canonical index: {sid}")
            errors += 1

    # Overlap check
    by_cite: Dict[str, List[str]] = {}
    for sid, dc, _p in specs:
        if dc:
            by_cite.setdefault(dc, []).append(sid)
    for dc, ids in by_cite.items():
        if len(set(ids)) > 1:
            # Warn for overlap to allow intentional grouping, do not fail gate
            print(f"::warning::doc_cite overlapped by multiple specs: {dc} -> {sorted(set(ids))}")

    # Width check (warn only)
    for sid, dc, _p in specs:
        w = width_of_doc_line(dc, root)
        if w > 200:
            print(f"::warning::doc_cite line too long (width={w}) for spec {sid}: {dc}")

    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
