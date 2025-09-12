#!/usr/bin/env python3
from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Iterable


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    root = Path.cwd()
    lock = root / 'artifacts.lock'
    files: list[Path] = []
    files.append(root / 'specs' / 'canonical_index.json')
    files.extend(sorted((root / 'specs' / 'grouped').glob('*.a2a-spec.yml')))

    lines: list[str] = []
    for p in files:
        if not p.exists():
            continue
        lines.append(f"{sha256_of(p)}  {p.relative_to(root)}")

    lock.parent.mkdir(parents=True, exist_ok=True)
    lock.write_text("\n".join(lines) + "\n", encoding='utf-8')
    print(f"Wrote {len(lines)} entries to {lock}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

