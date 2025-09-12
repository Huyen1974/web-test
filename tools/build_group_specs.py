#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

import yaml


def main() -> int:
    root = Path.cwd()
    canon = json.loads(
        (root / "specs" / "canonical_index.json").read_text(encoding="utf-8")
    )
    grouped: dict[str, list[dict]] = {"INF": [], "PF": [], "RO": [], "SG": []}
    # Build grouped specs directly from canonical index
    for it in canon.get("items", []):
        if not isinstance(it, dict):
            continue
        cid = str(it.get("cid"))
        title = str(it.get("text") or "").replace("\n", " ")
        doc_cite = str(it.get("doc_cite") or "")
        phase = str(it.get("phase") or "PF")
        dest = phase if phase in {"PF", "RO", "SG"} else "INF"
        grouped[dest].append(
            {
                "id": cid,
                "title": title,
                "doc_cite": doc_cite,
                "acceptance": ["README.md"],
            }
        )

    out_dir = root / "specs" / "grouped"
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, items in grouped.items():
        (out_dir / f"{name}.a2a-spec.yml").write_text(
            yaml.safe_dump({"items": items}, allow_unicode=True, sort_keys=False),
            encoding="utf-8",
        )
    print("Wrote grouped specs to", out_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
