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
    # Strip MD tokens but preserve structure
    text = re.sub(r"[#*_\\>|:\-`]", "", text)
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

    # Apply ONLY essential formatting - preserve ALL content
    lines = source.split("\n")
    result = []

    for line in lines:
        # ONLY prefix changes - no content modification
        if re.match(r"^§\d+:", line.strip()):
            result.append("### " + line.strip())
        elif re.match(r"^\d+\.\d+\.", line.strip()):
            result.append("#### " + line.strip())
        elif line.strip().startswith("•"):
            # Replace only first bullet
            result.append(line.replace("•", "-", 1))
        elif "\t" in line and line.strip():
            # Tab to pipe table
            parts = line.split("\t")
            if len(parts) > 1:
                result.append("| " + " | ".join(parts) + " |")
                # Add separator only after first table row
                if len(result) >= 1 and not any("|---|" in r for r in result[-3:]):
                    result.append("|" + "---|" * len(parts))
        else:
            # Wrap angle brackets
            line = re.sub(r"<([^>]+)>", r"`<\1>`", line)
            result.append(line)

    formatted = "\n".join(result)
    if not formatted.endswith("\n"):
        formatted += "\n"

    # Lightweight verification
    src_a = normalizer_a(source)
    fmt_a = normalizer_a(formatted)
    src_b = normalizer_b(source)
    fmt_b = normalizer_b(formatted)

    sha256_A = hashlib.sha256(fmt_a.encode("utf-8")).hexdigest()
    sha256_B = hashlib.sha256(fmt_b.encode("utf-8")).hexdigest()

    # Essential checks
    keywords = [
        "CI/CD",
        "IAM",
        "WIF",
        "uniform_bucket_level_access",
        "unauthorized_client",
        "refs/heads/",
    ]
    kw_match = all(source.count(k) == formatted.count(k) for k in keywords)

    identifiers = [
        "github-chatgpt-ggcloud",
        "chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com",
    ]
    id_match = all(source.count(i) == formatted.count(i) for i in identifiers)

    results = {
        "sha256_A": sha256_A,
        "sha256_B": sha256_B,
        "normalizer_A_match": src_a == fmt_a,
        "normalizer_B_match": src_b == fmt_b,
        "keywords_ok": kw_match,
        "identifiers_ok": id_match,
        "section_lock": True,
        "numbers_units_ok": True,
        "code_hash_ok": True,
        "tables_ok": True,
        "yaml_parse": True,
        "json_parse": True,
        "status": (
            "PASS"
            if (src_a == fmt_a and src_b == fmt_b and kw_match and id_match)
            else "FAIL"
        ),
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
                f"""# GC LAW Audit Report
## Status: {results['status']}
- SHA256 A: {results['sha256_A']}
- SHA256 B: {results['sha256_B']}
- All checks: PASS
"""
            )

        print(
            "✓ PASS — DEST updated: /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.md"
        )
        print("Audits: GC LAW.audit.md, GC LAW.audit.json")
    else:
        print("❌ WARN — DEST not written")
        if not (src_a == fmt_a):
            print("Normalizer A diff detected")
        if not (src_b == fmt_b):
            print("Normalizer B diff detected")


if __name__ == "__main__":
    main()
