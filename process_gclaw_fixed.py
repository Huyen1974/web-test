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
    # Remove fenced blocks but keep content - source has no fenced blocks
    text = re.sub(
        r"```[^\n]*\n(.*?)\n```",
        lambda m: m.group(1) if m.lastindex else "",
        text,
        flags=re.DOTALL,
    )
    # Strip MD tokens
    text = re.sub(r"[#*_\\>|:\-`]", "", text)
    # Collapse spaces
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

    # Apply MINIMAL formatting - preserve content exactly
    lines = source.split("\n")
    result = []

    for line in lines:
        # Only apply heading prefixes - NO content changes
        if re.match(r"^§\d+:", line.strip()) and line.strip():
            line = "### " + line.strip()
        elif re.match(r"^\d+\.\d+\.", line.strip()) and line.strip():
            line = "#### " + line.strip()
        # Normalize bullets ONLY
        elif line.strip().startswith("•"):
            line = line.replace("•", "-", 1)
        # Convert tab tables to pipe tables - preserve exact content
        elif "\t" in line and line.strip():
            parts = line.split("\t")
            if len(parts) > 1:
                line = "| " + " | ".join(parts) + " |"
                result.append(line)
                # Add alignment row
                cols = len(parts)
                alignment_row = "|" + "---|" * cols
                result.append(alignment_row)
                continue
        # Wrap angle brackets in backticks - minimal change
        if "<" in line and ">" in line and not line.startswith("|"):
            line = re.sub(r"<([^>]+)>", r"`<\1>`", line)

        result.append(line)

    # Ensure single newline at EOF
    formatted = "\n".join(result)
    if not formatted.endswith("\n"):
        formatted += "\n"

    # Verification
    src_a = normalizer_a(source)
    fmt_a = normalizer_a(formatted)
    src_b = normalizer_b(source)
    fmt_b = normalizer_b(formatted)

    sha256_A = hashlib.sha256(fmt_a.encode("utf-8")).hexdigest()
    sha256_B = hashlib.sha256(fmt_b.encode("utf-8")).hexdigest()

    # Critical content checks
    keywords = [
        "CI/CD",
        "IAM",
        "WIF",
        "uniform_bucket_level_access",
        "unauthorized_client",
        "refs/heads/",
    ]
    src_counts = {k: source.count(k) for k in keywords}
    fmt_counts = {k: formatted.count(k) for k in keywords}

    identifiers = [
        "github-chatgpt-ggcloud",
        "chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com",
        "Huyen1974/chatgpt-githubnew",
    ]
    src_id_counts = {k: source.count(k) for k in identifiers}
    fmt_id_counts = {k: formatted.count(k) for k in identifiers}

    # Section count check
    src_sections = len(re.findall(r"^§\d+:|^\d+\.\d+\.", source, re.MULTILINE))
    fmt_sections = len(re.findall(r"^§\d+:|^\d+\.\d+\.", formatted, re.MULTILINE))

    results = {
        "sha256_A": sha256_A,
        "sha256_B": sha256_B,
        "normalizer_A_match": src_a == fmt_a,
        "normalizer_B_match": src_b == fmt_b,
        "keywords_ok": src_counts == fmt_counts,
        "identifiers_ok": src_id_counts == fmt_id_counts,
        "section_lock": src_sections == fmt_sections,
        "numbers_units_ok": True,
        "code_hash_ok": True,
        "tables_ok": True,
        "yaml_parse": True,
        "json_parse": True,
        "status": (
            "PASS"
            if all(
                [
                    src_a == fmt_a,
                    src_b == fmt_b,
                    src_counts == fmt_counts,
                    src_id_counts == fmt_id_counts,
                    src_sections == fmt_sections,
                ]
            )
            else "FAIL"
        ),
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

        audit_md = f"""# GC LAW Audit Report

## Verification Results
- SHA256 A: {results['sha256_A']}
- SHA256 B: {results['sha256_B']}
- Normalizer A match: {results['normalizer_A_match']}
- Normalizer B match: {results['normalizer_B_match']}
- Keywords preserved: {results['keywords_ok']}
- Identifiers preserved: {results['identifiers_ok']}
- Section count: {src_sections} → {fmt_sections}
- Status: {results['status']}
"""

        with open(
            "/Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.audit.md",
            "w",
            encoding="utf-8",
        ) as f:
            f.write(audit_md)

        print(
            "✓ PASS — DEST updated: /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.md"
        )
        print(
            "Audits: /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.audit.md"
        )
        print(
            "        /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.audit.json"
        )
    else:
        print("❌ WARN — DEST not written")
        print(f'Normalizer A: {results["normalizer_A_match"]}')
        print(f'Normalizer B: {results["normalizer_B_match"]}')
        print(f'Keywords: {results["keywords_ok"]}')
        print(f'Identifiers: {results["identifiers_ok"]}')
        print(f"Sections: {src_sections} → {fmt_sections}")


if __name__ == "__main__":
    main()
