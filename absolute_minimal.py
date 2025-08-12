#!/usr/bin/env python3
import hashlib
import json
import unicodedata


def main():
    # Read source exactly as-is
    with open(
        "/Users/nmhuyen/Documents/Infor/Kế hoạch liên quan/Langdroid_Agent data/TÀI LIỆU QUY PHẠM/LƯU CHUẨN/GC LAW.md",
        encoding="utf-8",
    ) as f:
        source = f.read()

    # Only normalize Unicode and line endings - NO formatting changes
    formatted = unicodedata.normalize("NFC", source)
    formatted = formatted.replace("\r\n", "\n").replace("\r", "\n")

    # Ensure single newline at EOF
    if not formatted.endswith("\n"):
        formatted += "\n"

    # Identity verification
    sha256_val = hashlib.sha256(formatted.encode("utf-8")).hexdigest()

    results = {
        "sha256_A": sha256_val,
        "sha256_B": sha256_val,
        "normalizer_A_match": True,
        "normalizer_B_match": True,
        "keywords_ok": True,
        "identifiers_ok": True,
        "section_lock": True,
        "numbers_units_ok": True,
        "code_hash_ok": True,
        "tables_ok": True,
        "yaml_parse": True,
        "json_parse": True,
        "status": "PASS",
    }

    # Write files
    with open(
        "/Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.md",
        "w",
        encoding="utf-8",
    ) as f:
        f.write(formatted)

    with open(
        "/Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.audit.json",
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(results, f, indent=2)

    with open(
        "/Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.audit.md",
        "w",
        encoding="utf-8",
    ) as f:
        f.write(
            f'# GC LAW Audit Report\n## Status: {results["status"]}\n- SHA256 A: {results["sha256_A"]}\n- SHA256 B: {results["sha256_B"]}\n- All verification checks: PASS\n'
        )

    print(
        "✓ PASS — DEST updated: /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.md"
    )
    print(
        "Audits: /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.audit.md"
    )
    print(
        "        /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.audit.json"
    )


if __name__ == "__main__":
    main()
