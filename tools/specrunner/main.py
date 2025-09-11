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


def load_schema(schema_path: Path) -> dict[str, Any]:
    with schema_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def read_specs(specs_dir: Path, schema_path: Path) -> tuple[list[Spec], Findings]:
    findings = Findings()
    schema = load_schema(schema_path)
    validator = Draft202012Validator(schema)

    specs: list[Spec] = []
    for path in sorted(specs_dir.glob("*.a2a-spec.yml")):
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

        sid = str(raw.get("id"))
        title = str(raw.get("title", ""))
        doc_cite = raw.get("doc_cite")

        # Normalize acceptance to a list of strings (paths)
        acceptance_items = raw.get("acceptance") or []
        acceptance_paths: list[str] = []
        for item in acceptance_items:
            if isinstance(item, str):
                acceptance_paths.append(item)
            elif isinstance(item, dict) and "test" in item:
                acceptance_paths.append(str(item["test"]))
            else:
                findings.invalid_specs.append(
                    (path, f"Invalid acceptance item: {item!r}")
                )
        specs.append(
            Spec(
                path=path,
                data=raw,
                id=sid,
                title=title,
                doc_cite=str(doc_cite) if doc_cite else None,
                acceptance=acceptance_paths,
            )
        )

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


def write_orphans_csv(dest: Path, findings: Findings) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["spec_path", "id", "reason", "doc_cite_or_value"])
        for path, sid, reason in findings.orphans:
            w.writerow([str(path), sid, reason, ""])
        for cite, ids in findings.duplicate_doc_cites:
            w.writerow(["", ";".join(ids), "duplicate doc_cite", cite])


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="SpecRunner for A2A specs (Standard-as-Code)"
    )
    ap.add_argument(
        "--specs-dir", default="specs", help="Directory with *.a2a-spec.yml"
    )
    ap.add_argument(
        "--schema", default="specs/a2a-spec.schema.json", help="JSON schema path"
    )
    ap.add_argument("--rtm", default="artifacts/rtm.html", help="RTM HTML output path")
    ap.add_argument(
        "--orphans", default="artifacts/orphans.csv", help="Orphans CSV output path"
    )
    args = ap.parse_args(argv)

    root = Path.cwd()
    specs_dir = (root / args.specs_dir).resolve()
    schema_path = (root / args.schema).resolve()

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

    # Check acceptance files
    check_acceptance_files(specs, root, findings)

    # Scan for @req:IDs in codebase
    req_refs = scan_code_for_req_ids(root)
    spec_ids = {s.id for s in specs}
    for rid, paths in req_refs.items():
        if spec_ids and rid not in spec_ids:
            # Only warn for unknown IDs (do not fail pipeline yet)
            # Users can add a spec later.
            for p in paths:
                findings.unknown_req_ids.append((rid, p))

    # Orphans + duplicates
    detect_orphans_and_duplicates(specs, findings)

    # Write artifacts
    write_rtm_html(root / args.rtm, specs, req_refs)
    write_orphans_csv(root / args.orphans, findings)

    # Summary
    print("SpecRunner Summary:")
    print(f"  specs: {len(specs)}")
    print(f"  invalid_specs: {len(findings.invalid_specs)}")
    print(f"  missing_acceptance: {len(findings.missing_acceptance)}")
    print(f"  orphans: {len(findings.orphans)}")
    print(f"  duplicate_doc_cites: {len(findings.duplicate_doc_cites)}")
    print(f"  unknown_req_ids (warning): {len(findings.unknown_req_ids)}")

    violations = (
        len(findings.invalid_specs)
        + len(findings.missing_acceptance)
        + len(findings.orphans)
        + len(findings.duplicate_doc_cites)
    )
    if violations:
        print("::error::SpecRunner detected violations; see artifacts for details")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
