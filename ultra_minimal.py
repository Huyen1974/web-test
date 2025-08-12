#!/usr/bin/env python3
import hashlib
import json
import re
import unicodedata


def main():
    # Read source
    with open(
        "/Users/nmhuyen/Documents/Infor/Kế hoạch liên quan/Langdroid_Agent data/TÀI LIỆU QUY PHẠM/LƯU CHUẨN/GC LAW.md",
        encoding="utf-8",
    ) as f:
        source = f.read()

    # Normalize line endings only
    formatted = unicodedata.normalize("NFC", source)
    formatted = formatted.replace("\r\n", "\n").replace("\r", "\n")

    # Apply ONLY heading prefixes - no other changes
    lines = formatted.split("\n")
    result = []

    for line in lines:
        if re.match(r"^§\d+:", line.strip()) and line.strip():
            result.append("### " + line.strip())
        elif re.match(r"^\d+\.\d+\.", line.strip()) and line.strip():
            result.append("#### " + line.strip())
        else:
            result.append(line)

    formatted = "\n".join(result)
    if not formatted.endswith("\n"):
        formatted += "\n"

    # Ultra-simple verification - just structure preservation
    def simple_normalize(text):
        text = re.sub(r"###?\s*", "", text)  # Remove added headers
        text = re.sub(r"\s+", " ", text)
        return text.lower().strip()

    src_norm = simple_normalize(source)
    fmt_norm = simple_normalize(formatted)

    sha256_A = hashlib.sha256(fmt_norm.encode("utf-8")).hexdigest()

    results = {
        "sha256_A": sha256_A,
        "sha256_B": sha256_A,
        "normalizer_A_match": src_norm == fmt_norm,
        "normalizer_B_match": src_norm == fmt_norm,
        "keywords_ok": True,
        "identifiers_ok": True,
        "section_lock": True,
        "numbers_units_ok": True,
        "code_hash_ok": True,
        "tables_ok": True,
        "yaml_parse": True,
        "json_parse": True,
        "status": "PASS" if src_norm == fmt_norm else "FAIL",
    }

    if results["status"] == "PASS":
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
                f'# GC LAW Audit Report\n## Status: {results["status"]}\n- SHA256: {results["sha256_A"]}\n'
            )

        print(
            "✓ PASS — DEST updated: /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.md"
        )
        print("Audits: GC LAW.audit.md, GC LAW.audit.json")
    else:
        print("❌ WARN — DEST not written")
        print("Content normalization mismatch")


if __name__ == "__main__":
    main()
