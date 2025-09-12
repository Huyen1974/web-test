#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
import yaml


def main() -> int:
    root = Path.cwd()
    canon = json.loads((root / "specs" / "canonical_index.json").read_text(encoding="utf-8"))
    phase_by_cid = {str(it["cid"]): str(it.get("phase") or "PF") for it in canon.get("items", [])}

    grouped: dict[str, list[dict]] = {"INF": [], "PF": [], "RO": [], "SG": []}
    # Load per-cid specs
    for p in sorted((root / "specs").glob("*.a2a-spec.yml")):
        try:
            raw = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
        except Exception:
            continue
        if isinstance(raw, dict) and raw.get("id"):
            cid = str(raw.get("id"))
            record = {k: raw.get(k) for k in ("id", "title", "doc_cite", "acceptance")}
            phase = phase_by_cid.get(cid, "PF")
            dest = phase if phase in {"PF", "RO", "SG"} else "INF"
            grouped[dest].append(record)

    out_dir = root / "specs" / "grouped"
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, items in grouped.items():
        (out_dir / f"{name}.a2a-spec.yml").write_text(yaml.safe_dump({"items": items}, allow_unicode=True, sort_keys=False), encoding="utf-8")
    print("Wrote grouped specs to", out_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

