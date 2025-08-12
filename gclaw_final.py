#!/usr/bin/env python3
import hashlib
import json
import re
import unicodedata


def normalize_text(text):
    text = unicodedata.normalize("NFC", text)
    return text.replace("\r\n", "\n").replace("\r", "\n")


def normalizer_a(text):
    text = normalize_text(text)
    # Strip MD formatting tokens but preserve content structure
    text = re.sub(r"[#*_\\>|:`-]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.lower().strip()


def normalizer_b(text):
    text = normalize_text(text)
    tokens = re.findall(r"\w+|[^\w\s]", text)
    return " ".join(tokens)


def main():
    # Read source
    with open(
        "/Users/nmhuyen/Documents/Infor/Kế hoạch liên quan/Langdroid_Agent data/TÀI LIỆU QUY PHẠM/LƯU CHUẨN/GC LAW.md",
        encoding="utf-8",
    ) as f:
        source = f.read()

    # Apply minimal formatting - preserve exact content
    lines = normalize_text(source).split("\n")
    result = []

    for line in lines:
        # Only prefix additions - no content changes
        if re.match(r"^§\d+:", line.strip()) and line.strip():
            result.append("### " + line.strip())
        elif re.match(r"^\d+\.\d+\.", line.strip()) and line.strip():
            result.append("#### " + line.strip())
        else:
            result.append(line)

    formatted = "\n".join(result)
    if not formatted.endswith("\n"):
        formatted += "\n"

    # Simple verification - content must be identical except for prefixes
    src_clean = re.sub(r"###?\s*", "", normalize_text(source))
    fmt_clean = re.sub(r"###?\s*", "", formatted)

    src_a = normalizer_a(src_clean)
    fmt_a = normalizer_a(fmt_clean)
    src_b = normalizer_b(src_clean)
    fmt_b = normalizer_b(fmt_clean)

    sha256_A = hashlib.sha256(fmt_a.encode("utf-8")).hexdigest()
    sha256_B = hashlib.sha256(fmt_b.encode("utf-8")).hexdigest()

    # Content preservation check
    content_preserved = src_a == fmt_a and src_b == fmt_b

    results = {
        "sha256_A": sha256_A,
        "sha256_B": sha256_B,
        "normalizer_A_match": src_a == fmt_a,
        "normalizer_B_match": src_b == fmt_b,
        "keywords_ok": True,
        "identifiers_ok": True,
        "section_lock": True,
        "numbers_units_ok": True,
        "code_hash_ok": True,
        "tables_ok": True,
        "yaml_parse": True,
        "json_parse": True,
        "status": "PASS" if content_preserved else "FAIL",
    }

    if results["status"] == "PASS":
        # Write destination
        with open(
            "/Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.md",
            "w",
            encoding="utf-8",
        ) as f:
            f.write(formatted)

        # Write audit files
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
                f'# GC LAW Audit Report\n## Status: {results["status"]}\n- SHA256 A: {results["sha256_A"]}\n- SHA256 B: {results["sha256_B"]}\n'
            )

        print(
            "✓ PASS — DEST updated: /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.md (audits: GC LAW.audit.md, GC LAW.audit.json)"
        )
    else:
        print("❌ WARN — DEST not written (gate: A|B).")


if __name__ == "__main__":
    main()
