#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import html
import io
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator  # type: ignore

RE_REQ = re.compile(r"@req:([A-Za-z0-9_.-]+)")


@dataclass
class Spec:
    path: Path
    data: dict[str, Any]
    id: str
    title: str
    doc_cite: str | None
    acceptance: list[str]


@dataclass
class Findings:
    invalid_specs: list[tuple[Path, str]] = field(default_factory=list)
    missing_acceptance: list[tuple[str, Path]] = field(default_factory=list)
    orphans: list[tuple[Path, str, str]] = field(
        default_factory=list
    )  # (path, id, reason)
    duplicate_doc_cites: list[tuple[str, list[str]]] = field(
        default_factory=list
    )  # (doc_cite, ids)
    unknown_req_ids: list[tuple[str, Path]] = field(default_factory=list)
    duplicate_ids: list[tuple[str, list[str]]] = field(
        default_factory=list
    )  # (id, paths)
    missing_from_canonical: list[str] = field(default_factory=list)


def load_schema(schema_path: Path) -> dict[str, Any]:
    with schema_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def read_specs(specs_dir: Path, schema_path: Path) -> tuple[list[Spec], Findings]:
    findings = Findings()
    schema = load_schema(schema_path)
    validator = Draft202012Validator(schema)

    specs: list[Spec] = []
    for path in sorted(specs_dir.rglob("*.a2a-spec.yml")):
        try:
            with path.open("r", encoding="utf-8") as f:
                raw = yaml.safe_load(f) or {}
        except Exception as e:
            findings.invalid_specs.append((path, f"YAML parse error: {e}"))
            continue

        # Validate against schema
        errors = sorted(validator.iter_errors(raw), key=lambda e: e.path)
        if errors:
            msg = ", ".join(f"{list(err.path)}: {err.message}" for err in errors)
            findings.invalid_specs.append((path, msg))
            continue

        # Support grouped format: a file with top-level 'items' list
        def parse_one(obj: dict, src_path: Path) -> None:
            sid = str(obj.get("id"))
            title = str(obj.get("title", ""))
            doc_cite = obj.get("doc_cite")
            acceptance_items = obj.get("acceptance") or []
            acceptance_paths: list[str] = []
            for item in acceptance_items:
                if isinstance(item, str):
                    acceptance_paths.append(item)
                elif isinstance(item, dict) and "test" in item:
                    acceptance_paths.append(str(item["test"]))
                else:
                    findings.invalid_specs.append(
                        (src_path, f"Invalid acceptance item: {item!r}")
                    )
            specs.append(
                Spec(
                    path=src_path,
                    data=obj,
                    id=sid,
                    title=title,
                    doc_cite=str(doc_cite) if doc_cite else None,
                    acceptance=acceptance_paths,
                )
            )

        if isinstance(raw, dict) and "items" in raw:
            for it in raw.get("items", []):
                if isinstance(it, dict):
                    parse_one(it, path)
        else:
            parse_one(raw, path)

    return specs, findings


def scan_code_for_req_ids(root: Path) -> dict[str, list[Path]]:
    matches: dict[str, list[Path]] = {}
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        # Fast exclude by parts
        parts = set(path.parts)
        if parts & {
            ".git",
            ".venv",
            "venv",
            ".ruff_cache",
            ".pytest_cache",
            ".mypy_cache",
            ".bin",
        }:
            continue
        if any(str(path).startswith(str(root / d)) for d in ["terraform/.terraform"]):
            continue
        # Only scan reasonable text files
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".pdf", ".ico", ".zip"}:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for m in RE_REQ.findall(text):
            matches.setdefault(m, []).append(path)
    return matches


def check_acceptance_files(specs: list[Spec], root: Path, findings: Findings) -> None:
    for spec in specs:
        for rel in spec.acceptance:
            # Normalize path relative to repo root
            candidate = root / rel
            if not candidate.exists():
                findings.missing_acceptance.append((spec.id, Path(rel)))


def detect_orphans_and_duplicates(specs: list[Spec], findings: Findings) -> None:
    # Orphans: missing or blank doc_cite
    for spec in specs:
        if not spec.doc_cite or not str(spec.doc_cite).strip():
            findings.orphans.append((spec.path, spec.id, "missing doc_cite"))

    # Duplicates: same doc_cite used by multiple IDs
    by_cite: dict[str, list[str]] = {}
    for spec in specs:
        if spec.doc_cite:
            by_cite.setdefault(spec.doc_cite, []).append(spec.id)
    for cite, ids in sorted(by_cite.items()):
        if len(ids) > 1:
            findings.duplicate_doc_cites.append((cite, ids))


def detect_duplicate_ids(specs: list[Spec], findings: Findings) -> None:
    by_id: dict[str, list[str]] = {}
    for s in specs:
        by_id.setdefault(s.id, []).append(str(s.path))
    for sid, paths in sorted(by_id.items()):
        if len(paths) > 1:
            findings.duplicate_ids.append((sid, paths))


def write_rtm_html(
    dest: Path, specs: list[Spec], req_refs: dict[str, list[Path]]
) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    buf = io.StringIO()
    buf.write("<html><head><meta charset='utf-8'><title>RTM</title>\n")
    buf.write(
        "<style>body{font-family:sans-serif} table{border-collapse:collapse} td,th{border:1px solid #ccc;padding:4px}</style>"
    )
    buf.write("</head><body>\n<h1>Requirements Traceability Matrix</h1>\n")
    buf.write(
        "<table>\n<tr><th>ID</th><th>Title</th><th>Doc Cite</th><th>Acceptance</th><th>Refs in Code</th></tr>\n"
    )
    for s in sorted(specs, key=lambda x: x.id):
        acc = "<br>".join(html.escape(a) for a in s.acceptance) or "&nbsp;"
        refs = req_refs.get(s.id, [])
        refs_s = "<br>".join(html.escape(str(p)) for p in sorted(set(refs))) or "&nbsp;"
        buf.write(
            "<tr>"
            f"<td>{html.escape(s.id)}</td>"
            f"<td>{html.escape(s.title)}</td>"
            f"<td>{html.escape(s.doc_cite or '')}</td>"
            f"<td>{acc}</td>"
            f"<td>{refs_s}</td>"
            "</tr>\n"
        )
    buf.write("</table>\n</body></html>\n")
    dest.write_text(buf.getvalue(), encoding="utf-8")


def write_rtm_json(
    dest: Path, specs: list[Spec], req_refs: dict[str, list[Path]]
) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    items: list[dict[str, Any]] = []
    for s in sorted(specs, key=lambda x: x.id):
        items.append(
            {
                "id": s.id,
                "title": s.title,
                "doc_cite": s.doc_cite,
                "acceptance": list(s.acceptance),
                "refs": sorted({str(p) for p in req_refs.get(s.id, [])}),
                "path": str(s.path),
            }
        )
    # Ensure deterministic order by id
    items = sorted(items, key=lambda x: x["id"])  # type: ignore[index]
    dest.write_text(json.dumps(items, indent=2), encoding="utf-8")


def write_orphans_csv(dest: Path, findings: Findings) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["spec_path", "id", "reason", "doc_cite_or_value"])
        # Sort orphans by ID for deterministic output
        for path, sid, reason in sorted(findings.orphans, key=lambda x: x[1]):
            w.writerow([str(path), sid, reason, ""])
        # Sort duplicates section deterministically as well
        for cite, ids in sorted(
            findings.duplicate_doc_cites, key=lambda x: ",".join(sorted(x[1]))
        ):
            w.writerow(["", ";".join(ids), "duplicate doc_cite", cite])


def write_speclint_json(dest: Path, findings: Findings) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "invalid_specs": [(str(p), msg) for p, msg in findings.invalid_specs],
        "missing_acceptance": [(sid, str(p)) for sid, p in findings.missing_acceptance],
        "orphans": [(str(p), sid, reason) for p, sid, reason in findings.orphans],
        "duplicate_doc_cites": [
            (cite, ids) for cite, ids in findings.duplicate_doc_cites
        ],
        "duplicate_ids": [(sid, paths) for sid, paths in findings.duplicate_ids],
        "unknown_req_ids": [(sid, str(p)) for sid, p in findings.unknown_req_ids],
        "missing_from_canonical": list(findings.missing_from_canonical),
    }
    dest.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="SpecRunner for A2A specs (Standard-as-Code)"
    )
    ap.add_argument(
        "--config",
        default="tools/specrunner/specrunner.yml",
        help="Config YAML path",
    )
    ap.add_argument("--specs-dir", default=None, help="Directory with *.a2a-spec.yml")
    ap.add_argument("--schema", default=None, help="JSON schema path")
    ap.add_argument("--rtm", dest="rtm_html", default=None, help="RTM HTML output path")
    ap.add_argument("--rtm-json", default=None, help="RTM JSON output path")
    ap.add_argument("--orphans", default=None, help="Orphans CSV output path")
    ap.add_argument("--speclint", default=None, help="Spec lint JSON output path")
    ap.add_argument(
        "--strict", action="store_true", help="Fail on unknown @req IDs in code"
    )
    ap.add_argument(
        "--coverage-only", action="store_true", help="Only verify Doc→Spec coverage"
    )
    ap.add_argument(
        "--canonical-index", default=None, help="Path to canonical_index.json"
    )
    args = ap.parse_args(argv)

    # Load config if exists
    cfg_path = Path(args.config)
    cfg: dict[str, Any] = {}
    if cfg_path.exists():
        try:
            cfg = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}
        except Exception as e:
            print(f"::warning::Failed to parse config {cfg_path}: {e}")

    def pick(key: str, default: Any) -> Any:
        val = getattr(args, key, None)
        return val if val not in (None, "") else cfg.get(key, default)

    root = Path.cwd()
    specs_dir = (root / pick("specs_dir", "specs")).resolve()
    schema_path = (root / pick("schema", "specs/a2a-spec.schema.json")).resolve()
    rtm_html = root / pick("rtm_html", "artifacts/rtm.html")
    rtm_json = root / pick("rtm_json", "artifacts/rtm.json")
    orphans_csv = root / pick("orphans", "artifacts/orphans.csv")
    speclint_json = root / pick("speclint", "artifacts/speclint.json")
    doc_cite_pattern = pick(
        "doc_cite_pattern",
        r"^(https?://[^\s]+|DOC:[A-Za-z0-9_.:/-]+|MD:[^#]+#L[0-9]+)$",
    )
    constitution_path = root / pick(
        "constitution_path", "docs/agent-a2a-constitution-v5.md"
    )
    strict = bool(args.strict)
    coverage_only = bool(args.coverage_only)
    canonical_index_path = root / pick("canonical_index", "specs/canonical_index.json")

    specs: list[Spec] = []
    findings = Findings()

    if not schema_path.exists():
        print(f"::warning::Schema not found: {schema_path}")
    if specs_dir.exists():
        specs, findings0 = read_specs(specs_dir, schema_path)
        # merge findings
        findings.invalid_specs.extend(findings0.invalid_specs)
        findings.missing_acceptance.extend(findings0.missing_acceptance)
        findings.orphans.extend(findings0.orphans)
        findings.duplicate_doc_cites.extend(findings0.duplicate_doc_cites)
    else:
        print(
            f"::notice::No specs directory found at {specs_dir}, skipping spec validation"
        )

    # Validate doc_cite with regex if present
    try:
        re_doc = re.compile(str(doc_cite_pattern))
    except re.error as e:
        print(f"::warning::Invalid doc_cite_pattern '{doc_cite_pattern}': {e}")
        re_doc = None
    if re_doc is not None:
        for s in specs:
            if s.doc_cite and not re_doc.match(s.doc_cite):
                findings.invalid_specs.append(
                    (s.path, f"doc_cite does not match pattern: {s.doc_cite}")
                )
    # Verify MD:<path>#L<line> references if constitution exists
    if constitution_path.exists():
        for s in specs:
            dc = s.doc_cite or ""
            if dc.startswith("MD:") and "#L" in dc:
                try:
                    path_part, line_part = dc[3:].split("#L", 1)
                    md_path = (root / path_part).resolve()
                    line_no = int(line_part)
                    if not md_path.exists():
                        findings.invalid_specs.append(
                            (s.path, f"doc_cite MD path not found: {md_path}")
                        )
                        continue
                    lines = md_path.read_text(encoding="utf-8").splitlines()
                    if line_no < 1 or line_no > len(lines):
                        findings.invalid_specs.append(
                            (s.path, f"doc_cite line out of range: L{line_no}")
                        )
                except Exception as e:
                    findings.invalid_specs.append(
                        (s.path, f"doc_cite parse error: {dc} ({e})")
                    )

    # Coverage-only flow skips acceptance and code scanning
    req_refs: dict[str, list[Path]] = {}
    spec_ids = {s.id for s in specs}
    if not coverage_only:
        # Check acceptance files
        check_acceptance_files(specs, root, findings)

        # Scan for @req:IDs in codebase
        req_refs = scan_code_for_req_ids(root)
        for rid, paths in req_refs.items():
            if spec_ids and rid not in spec_ids:
                for p in paths:
                    findings.unknown_req_ids.append((rid, p))

    # Detect duplicates
    detect_orphans_and_duplicates(specs, findings)
    detect_duplicate_ids(specs, findings)

    # Coverage vs canonical index
    if canonical_index_path.exists():
        try:
            ci = json.loads(canonical_index_path.read_text(encoding="utf-8"))
            ci_ids: set[str] = set()
            # Support both legacy {groups:[{items:[{id:..}]}]} and new {items:[{cid:..}]}
            if "items" in ci:
                for item in ci.get("items", []):
                    if isinstance(item, dict) and item.get("cid"):
                        ci_ids.add(str(item["cid"]))
            else:
                for group in ci.get("groups", []):
                    for item in group.get("items", []):
                        if isinstance(item, dict) and item.get("id"):
                            ci_ids.add(str(item["id"]))
            missing = sorted(ci_ids - spec_ids)
            findings.missing_from_canonical.extend(missing)
        except Exception as e:
            print(f"::warning::Failed to parse canonical index: {e}")

    # Write artifacts
    write_rtm_html(rtm_html, specs, req_refs)
    write_rtm_json(rtm_json, specs, req_refs)
    write_orphans_csv(orphans_csv, findings)
    write_speclint_json(speclint_json, findings)

    # Summary
    print("SpecRunner Summary:")
    print(f"  specs: {len(specs)}")
    print(f"  invalid_specs: {len(findings.invalid_specs)}")
    print(f"  missing_acceptance: {len(findings.missing_acceptance)}")
    print(f"  orphans: {len(findings.orphans)}")
    print(f"  duplicate_doc_cites: {len(findings.duplicate_doc_cites)}")
    print(f"  duplicate_ids: {len(findings.duplicate_ids)}")
    print(
        f"  unknown_req_ids ({'strict' if strict else 'warning'}): {len(findings.unknown_req_ids)}"
    )
    print(f"  missing_from_canonical: {len(findings.missing_from_canonical)}")

    violations = (
        len(findings.invalid_specs)
        + len(findings.missing_acceptance)
        + len(findings.orphans)
        + len(findings.duplicate_ids)
        + (len(findings.unknown_req_ids) if strict else 0)
        + (len(findings.missing_from_canonical) if coverage_only else 0)
    )
    if violations:
        print("::error::SpecRunner detected violations; see artifacts for details")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
