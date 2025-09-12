#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path


def sanitize_filename(text: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", text)[:80]


def main() -> int:
    root = Path.cwd()
    canon = json.loads(
        (root / "specs" / "canonical_index.json").read_text(encoding="utf-8")
    )
    items = canon.get("items") or []
    out_dir = root / "specs"
    count = 0
    for it in items:
        cid = str(it.get("cid"))
        text = str(it.get("text") or "")
        doc_cite = str(it.get("doc_cite") or "")
        # File name: specs/<cid>.a2a-spec.yml (sanitized)
        fname = out_dir / f"{sanitize_filename(cid)}.a2a-spec.yml"
        if fname.exists():
            continue
        # Compose YAML content
        title = text.strip().replace("\n", " ")
        title = title.replace('"', '\\"')
        safe_title = title.replace("{", "(").replace("}", ")")
        yml = [
            f"id: {cid}",
            f'title: "{safe_title}"',
            f"doc_cite: {doc_cite}",
            "acceptance:",
            "  - README.md",
        ]
        fname.write_text("\n".join(yml) + "\n", encoding="utf-8")
        count += 1
    print(f"Generated {count} spec files from canonical index")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
