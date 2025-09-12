#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

RE_RULE = re.compile(r"^\[(?P<code>[A-Z]{2,})\]\s*(?P<title>.+)$")
RE_NUM = re.compile(r"^\s*\d+\.\s+(?P<text>.+)$")
RE_ENVELOPE_MARK = re.compile(r"Message Envelope\s*v?2\.\d", re.IGNORECASE)
RE_JSON_FIELD = re.compile(r"^\s*\"(?P<field>[a-zA-Z0-9_\-]+)\"\s*:\s*")
RE_LEVEL_MUST = re.compile(r"\b(MUST|BẮT BUỘC)\b", re.IGNORECASE)


@dataclass
class CanonItem:
    cid: str
    text: str
    doc_cite: str
    level: str  # MUST/SHOULD
    phase: str  # PF/RO/SG
    group: str  # Envelope / Async & State / Errors/TTL/Quota / Transport / Artifact / Registry/Versioning


def git_commit_hash(path: Path) -> str:
    try:
        out = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=path.parent)
        return out.decode().strip()
    except Exception:
        return "unknown"


def extract(src: Path) -> dict:
    lines = src.read_text(encoding="utf-8").splitlines()

    items: list[CanonItem] = []
    counters: dict[str, int] = defaultdict(int)

    def emit(
        prefix: str,
        group: str,
        text: str,
        line_no: int,
        phase: str = "PF",
        level: str = "SHOULD",
    ):
        counters[prefix] += 1
        cid = f"{prefix}.{counters[prefix]}"
        doc_cite = f"MD:{src}#L{line_no}"
        items.append(
            CanonItem(
                cid=cid,
                text=text.strip(),
                doc_cite=doc_cite,
                level=level,
                phase=phase,
                group=group,
            )
        )

    # Pass 1: Envelope fields
    in_env = False
    for i, line in enumerate(lines, start=1):
        if RE_ENVELOPE_MARK.search(line):
            in_env = True
            continue
        if in_env:
            if line.strip().startswith("}"):
                in_env = False
                continue
            m = RE_JSON_FIELD.match(line)
            if m:
                field = m.group("field")
                lvl = (
                    "MUST"
                    if field in {"request_id", "timestamp", "action"}
                    else "SHOULD"
                )
                emit(
                    "ENV",
                    "Envelope",
                    f"Envelope field '{field}' present and validated",
                    i,
                    phase="PF",
                    level=lvl,
                )

    # Pass 2: Numbered rules and MUST/BẮT BUỘC sentences
    current_group = ""
    for i, raw in enumerate(lines, start=1):
        tline = raw.strip()
        if "Rate Limiting" in tline:
            current_group = "Errors/TTL/Quota"
        elif "Hàng đợi" in tline or "DLQ" in tline or "retry" in tline:
            current_group = "Async & State"
        elif (
            "capabilities" in tline.lower()
            or "registry" in tline.lower()
            or "deprecation" in tline.lower()
            or "heartbeat" in tline.lower()
        ):
            current_group = "Registry/Versioning"
        elif "Pub/Sub" in tline or "HTTP" in tline:
            current_group = "Transport"
        elif "resource_links" in tline or "Signed URL" in tline:
            current_group = "Artifact"

        mn = RE_NUM.match(tline)
        if mn:
            text = mn.group("text")
            level = "MUST" if RE_LEVEL_MUST.search(text) else "SHOULD"
            phase = "PF"
            if current_group in ("Errors/TTL/Quota", "Async & State"):
                phase = "RO"
            if current_group == "Artifact":
                phase = "SG"
            prefix = {
                "Envelope": "ENV",
                "Async & State": "ASY",
                "Errors/TTL/Quota": "ERQ",
                "Transport": "TRN",
                "Artifact": "ART",
                "Registry/Versioning": "REG",
            }.get(current_group or "Registry/Versioning", "REG")
            emit(
                prefix,
                current_group or "Registry/Versioning",
                text,
                i,
                phase=phase,
                level=level,
            )
        elif RE_LEVEL_MUST.search(tline) and len(tline) > 12:
            if not tline.startswith("{") and not tline.startswith("#"):
                phase = "PF"
                if current_group in ("Errors/TTL/Quota", "Async & State"):
                    phase = "RO"
                if current_group == "Artifact":
                    phase = "SG"
                prefix = {
                    "Envelope": "ENV",
                    "Async & State": "ASY",
                    "Errors/TTL/Quota": "ERQ",
                    "Transport": "TRN",
                    "Artifact": "ART",
                    "Registry/Versioning": "REG",
                }.get(current_group or "Registry/Versioning", "REG")
                emit(
                    prefix,
                    current_group or "Registry/Versioning",
                    tline,
                    i,
                    phase=phase,
                    level="MUST",
                )

    # Pass 3: Metrics & SLOs
    for i, line in enumerate(lines, start=1):
        if "Metrics bắt buộc" in line:
            for metric in [
                "a2a_requests_total",
                "a2a_latency_ms",
                "a2a_dlq_total",
                "a2a_retries_total",
            ]:
                emit(
                    "ERQ",
                    "Errors/TTL/Quota",
                    f"Metric {metric} MUST be emitted with required labels",
                    i,
                    phase="RO",
                    level="MUST",
                )
        if "SLOs tối thiểu" in line:
            emit("ERQ", "Errors/TTL/Quota", "ACK P95 ≤ 1s", i, phase="RO", level="MUST")
            emit(
                "ERQ",
                "Errors/TTL/Quota",
                "Job-done P95 ≤ ETA + 60s",
                i,
                phase="RO",
                level="MUST",
            )
            emit(
                "ERQ",
                "Errors/TTL/Quota",
                "DLQ/ngày ≤ 0.1%",
                i,
                phase="RO",
                level="MUST",
            )

    payload = {
        "constitution_commit": git_commit_hash(src),
        "source": str(src),
        "count": len(items),
        "items": [
            {
                "cid": it.cid,
                "text": it.text,
                "doc_cite": it.doc_cite,
                "level": it.level,
                "phase": it.phase,
                "group": it.group,
            }
            for it in items
        ],
    }
    return payload


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
    payload["items"] = sorted(payload["items"], key=lambda x: x["cid"])  # type: ignore[index]
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote canonical index to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
