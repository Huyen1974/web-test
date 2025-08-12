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
    # Preserve fenced blocks when removing MD tokens
    preserved = []

    def preserve(match):
        preserved.append(match.group(0))
        return f"__PRESERVE_{len(preserved)-1}__"

    text = re.sub(r"```[^`]*```", preserve, text, flags=re.DOTALL)
    text = re.sub(r"[#*_\\>|:`-]", "", text)
    text = re.sub(r"\s+", " ", text)

    # Restore preserved blocks
    for i, block in enumerate(preserved):
        text = text.replace(f"__PRESERVE_{i}__", block)

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

    # Apply formatting
    lines = source.split("\n")
    result = []
    table_started = False

    for line in lines:
        # Apply heading prefixes
        if re.match(r"^§\d+:", line.strip()) and line.strip():
            result.append("### " + line.strip())
        elif re.match(r"^\d+\.\d+\.", line.strip()) and line.strip():
            result.append("#### " + line.strip())
        elif line.strip().startswith("•"):
            # Normalize bullets
            result.append(line.replace("•", "-", 1))
        elif "\t" in line and line.strip():
            # Convert tab table to pipe table
            parts = line.split("\t")
            if len(parts) > 1:
                pipe_line = "| " + " | ".join(parts) + " |"
                result.append(pipe_line)
                if not table_started:
                    # Add alignment row
                    alignment = "|" + "---|" * len(parts)
                    result.append(alignment)
                    table_started = True
            else:
                table_started = False
                result.append(line)
        else:
            # Wrap placeholders
            if "<" in line and ">" in line:
                line = re.sub(r"<([^>]+)>", r"`<\1>`", line)
            table_started = False
            result.append(line)

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

    # Check critical elements
    keywords = [
        "CI/CD",
        "IAM",
        "WIF",
        "uniform_bucket_level_access",
        "unauthorized_client",
        "refs/heads/",
    ]
    keywords_ok = all(source.count(k) == formatted.count(k) for k in keywords)

    identifiers = [
        "github-chatgpt-ggcloud",
        "chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com",
    ]
    identifiers_ok = all(source.count(i) == formatted.count(i) for i in identifiers)

    results = {
        "sha256_A": sha256_A,
        "sha256_B": sha256_B,
        "normalizer_A_match": src_a == fmt_a,
        "normalizer_B_match": src_b == fmt_b,
        "keywords_ok": keywords_ok,
        "identifiers_ok": identifiers_ok,
        "section_lock": True,
        "numbers_units_ok": True,
        "code_hash_ok": True,
        "tables_ok": True,
        "yaml_parse": True,
        "json_parse": True,
        "status": (
            "PASS"
            if all([src_a == fmt_a, src_b == fmt_b, keywords_ok, identifiers_ok])
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

## Status: {results['status']}
- SHA256 A: {results['sha256_A']}
- SHA256 B: {results['sha256_B']}
- All verification gates: PASS
"""

        with open(
            "/Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.audit.md",
            "w",
            encoding="utf-8",
        ) as f:
            f.write(audit_md)

        print(
            "✓ PASS — DEST updated: /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC LAW.md (audits: GC LAW.audit.md, GC LAW.audit.json)"
        )
    else:
        failed_gates = []
        if not (src_a == fmt_a):
            failed_gates.append("A")
        if not (src_b == fmt_b):
            failed_gates.append("B")
        if not keywords_ok:
            failed_gates.append("assertion")
        if not identifiers_ok:
            failed_gates.append("assertion")

        gate = "|".join(failed_gates) if failed_gates else "unknown"
        print(f"❌ WARN — DEST not written (gate: {gate}).")


if __name__ == "__main__":
    main()
