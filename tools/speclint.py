#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

import yaml


def load_canonical(path: Path) -> dict:
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
    data["_ids"] = ids
    return data


def read_specs(specs_dir: Path) -> list[tuple[str, str, Path]]:
    out: list[tuple[str, str, Path]] = []
    for p in sorted(specs_dir.rglob("*.a2a-spec.yml")):
        try:
            raw = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
            if isinstance(raw, dict) and "items" in raw:
                for it in raw.get("items", []):
                    sid = str(it.get("id"))
                    dc = str(it.get("doc_cite") or "")
                    out.append((sid, dc, p))
            else:
                sid = str(raw.get("id"))
                dc = str(raw.get("doc_cite") or "")
                out.append((sid, dc, p))
        except Exception:
            continue
    return out


def parse_doc_ref(md_ref: str) -> tuple[Path, int, int]:
    if not (md_ref.startswith("MD:") and "#L" in md_ref):
        return Path(""), -1, -1
    rest = md_ref[3:]
    if "-L" in rest:
        pp, rng = rest.split("#L", 1)
        s, e = rng.split("-L", 1)
        return Path(pp), int(s), int(e)
    else:
        pp, s = rest.split("#L", 1)
        return Path(pp), int(s), int(s)


def main(argv: list[str] | None = None) -> int:
    root = Path.cwd()
    specs_dir = root / "specs"
    canonical_path = root / "specs" / "canonical_index.json"

    if not canonical_path.exists():
        print("::warning::canonical_index.json not found; skipping speclint")
        return 0

    canonical = load_canonical(canonical_path)
    canonical_ids: set[str] = canonical.get("_ids", set())
    normative = canonical.get("normative_lines", [])
    specs = read_specs(specs_dir)

    errors = 0

    # Spec→Doc check
    for sid, _dc, p in specs:
        if sid not in canonical_ids:
            print(f"::error file={p}::Spec id not present in canonical index: {sid}")
            errors += 1

    # Overlap check (FAIL)
    by_cite: dict[str, list[str]] = {}
    for sid, dc, _p in specs:
        if dc:
            by_cite.setdefault(dc, []).append(sid)
    for dc, ids in by_cite.items():
        if len(set(ids)) > 1:
            print(
                f"::error::doc_cite overlapped by multiple specs: {dc} -> {sorted(set(ids))}"
            )
            errors += 1

    # Width check: FAIL if range > 12 lines
    for sid, dc, _p in specs:
        _pp, s, e = parse_doc_ref(dc)
        if s != -1 and e != -1 and (e - s + 1) > 12:
            print(
                f"::error::doc_cite range too wide ({e - s + 1} lines) for spec {sid}: {dc}"
            )
            errors += 1

    # Normative coverage ≥ 95%
    covered: set[int] = set()
    for _sid, dc, _p in specs:
        _pp, s, e = parse_doc_ref(dc)
        if s != -1:
            covered.update(range(s, e + 1))
    total_norm = len(normative)
    covered_norm = sum(1 for it in normative if int(it.get("line", -999)) in covered)
    pct = (covered_norm / total_norm * 100.0) if total_norm else 100.0

    # Artifacts
    artifacts = root / "artifacts"
    artifacts.mkdir(parents=True, exist_ok=True)
    with (artifacts / "uncovered_lines.txt").open("w", encoding="utf-8") as f:
        for it in normative:
            ln = int(it.get("line", -1))
            if ln not in covered:
                f.write(f"L{ln}: {it.get('text','').strip()}\n")
    by_group: dict[str, dict[str, int]] = {}
    for it in normative:
        grp = str(it.get("group") or "unknown")
        by_group.setdefault(grp, {"total": 0, "covered": 0})
        by_group[grp]["total"] += 1
        if int(it.get("line", -1)) in covered:
            by_group[grp]["covered"] += 1
    with (artifacts / "coverage_by_group.json").open("w", encoding="utf-8") as f:
        json.dump(
            {
                k: {
                    **v,
                    "pct": (v["covered"] / v["total"] * 100.0) if v["total"] else 100.0,
                }
                for k, v in by_group.items()
            },
            f,
            indent=2,
        )

    if pct < 95.0:
        print(f"::error::Normative coverage too low: {pct:.2f}% (<95%)")
        errors += 1
    else:
        print(
            f"::notice::Normative coverage: {pct:.2f}% (covered {covered_norm}/{total_norm})"
        )

    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
