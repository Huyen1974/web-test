#!/usr/bin/env python3
import hashlib
import re
import unicodedata


def normalize_text(text):
    """Normalize Unicode to NFC and convert to LF line endings"""
    text = unicodedata.normalize("NFC", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return text


def normalizer_a(text):
    """Remove fence markers but keep inner text, strip MD tokens, collapse spaces, lowercase"""
    text = normalize_text(text)

    # Remove fence markers but preserve inner content
    # Extract fenced blocks content
    fenced_blocks = []
    fence_pattern = r"```[^\n]*\n(.*?)\n```"

    def preserve_fenced_content(match):
        content = match.group(1)
        fenced_blocks.append(content)
        return f" FENCED_BLOCK_{len(fenced_blocks)-1} "

    text = re.sub(fence_pattern, preserve_fenced_content, text, flags=re.DOTALL)

    # Strip MD tokens (# * _ \ > | : - `)
    text = re.sub(r"[#*_\\>|:\-`]", "", text)

    # Collapse spaces
    text = re.sub(r"\s+", " ", text)

    # Restore fenced content
    for i, block in enumerate(fenced_blocks):
        text = text.replace(f" FENCED_BLOCK_{i} ", f" {block} ")

    return text.lower().strip()


def normalizer_b(text):
    """Tokenize words/numbers/symbols, join with single spaces"""
    text = normalize_text(text)
    # Tokenize keeping words, numbers, and important symbols
    tokens = re.findall(r"\w+|[^\w\s]", text)
    return " ".join(tokens)


def extract_sections(text):
    """Extract section numbering and titles"""
    sections = []
    # Match patterns like §1:, 1.1., Điều VIII, Phụ lục A
    patterns = [
        r"(§\d+:?\s*[^:]*?)(?=\n|$)",
        r"(\d+\.\d*\.?\s+[^\n]*?)(?=\n|$)",
        r"(Điều\s+[IVXLCDM]+\b[^\n]*?)(?=\n|$)",
        r"(Phụ\s+lục\s+[A-Z]\b[^\n]*?)(?=\n|$)",
    ]

    for pattern in patterns:
        matches = re.findall(pattern, text, re.MULTILINE | re.IGNORECASE)
        sections.extend(matches)

    return sections


def extract_identifiers(text):
    """Extract critical identifiers"""
    identifiers = []

    # Project IDs, email addresses, file names, placeholders
    patterns = [
        r"github-chatgpt-ggcloud",
        r"chatgpt-deployer@github-chatgpt-ggcloud\.iam\.gserviceaccount\.com",
        r"<[^>]+>",  # Placeholders like <env>, <purpose>
        r"\w+\.tf\w*",  # Terraform files
        r"\w+\.yml",  # YAML files
        r"Huyen1974/[\w-]+",  # GitHub repos
    ]

    for pattern in patterns:
        matches = re.findall(pattern, text)
        identifiers.extend(matches)

    return identifiers


def extract_keywords(text):
    """Extract critical keywords"""
    keywords = [
        "CI/CD",
        "pass-gate",
        "cancel-in-progress",
        "IAM",
        "WIF",
        "unauthorized_client",
        "refs/heads/",
        "uniform_bucket_level_access",
    ]

    found_keywords = []
    for keyword in keywords:
        count = len(re.findall(re.escape(keyword), text, re.IGNORECASE))
        if count > 0:
            found_keywords.append((keyword, count))

    return found_keywords


def extract_code_blocks(text):
    """Extract code blocks by language"""
    blocks = {}
    pattern = r"```(\w+)\n(.*?)\n```"
    matches = re.findall(pattern, text, re.DOTALL)

    for lang, code in matches:
        if lang not in blocks:
            blocks[lang] = []
        blocks[lang].append(code.strip())

    return blocks


def extract_tables(text):
    """Extract table content"""
    tables = []
    # Find markdown tables
    lines = text.split("\n")
    current_table = []
    in_table = False

    for line in lines:
        if "|" in line and line.strip():
            if not in_table:
                in_table = True
                current_table = []
            current_table.append(line.strip())
        else:
            if in_table and current_table:
                tables.append(current_table)
                current_table = []
                in_table = False

    if current_table:
        tables.append(current_table)

    return tables


def main():
    # Read source file
    source_path = "/Users/nmhuyen/Documents/Infor/Kế hoạch liên quan/Langdroid_Agent data/TÀI LIỆU QUY PHẠM/LƯU CHUẨN/GC LAW.md"
    formatted_path = "/Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC_LAW_temp.md"

    with open(source_path, encoding="utf-8") as f:
        source_text = f.read()

    with open(formatted_path, encoding="utf-8") as f:
        formatted_text = f.read()

    # Apply normalizers
    src_a = normalizer_a(source_text)
    fmt_a = normalizer_a(formatted_text)

    src_b = normalizer_b(source_text)
    fmt_b = normalizer_b(formatted_text)

    # Calculate SHA256 hashes
    src_a_hash = hashlib.sha256(src_a.encode("utf-8")).hexdigest()
    fmt_a_hash = hashlib.sha256(fmt_a.encode("utf-8")).hexdigest()

    src_b_hash = hashlib.sha256(src_b.encode("utf-8")).hexdigest()
    fmt_b_hash = hashlib.sha256(fmt_b.encode("utf-8")).hexdigest()

    # Extract and compare various elements
    src_sections = extract_sections(source_text)
    fmt_sections = extract_sections(formatted_text)

    src_identifiers = extract_identifiers(source_text)
    fmt_identifiers = extract_identifiers(formatted_text)

    src_keywords = extract_keywords(source_text)
    fmt_keywords = extract_keywords(formatted_text)

    src_code_blocks = extract_code_blocks(source_text)
    fmt_code_blocks = extract_code_blocks(formatted_text)

    src_tables = extract_tables(source_text)
    fmt_tables = extract_tables(formatted_text)

    # Verification results
    results = {
        "sha256_A": fmt_a_hash,
        "sha256_B": fmt_b_hash,
        "normalizer_A_match": src_a_hash == fmt_a_hash,
        "normalizer_B_match": src_b_hash == fmt_b_hash,
        "section_lock": src_sections == fmt_sections,
        "identifiers_ok": sorted(src_identifiers) == sorted(fmt_identifiers),
        "keywords_ok": sorted(src_keywords) == sorted(fmt_keywords),
        "code_blocks_ok": src_code_blocks == fmt_code_blocks,
        "tables_count_ok": len(src_tables) == len(fmt_tables),
        "status": "UNKNOWN",
    }

    # Determine overall status
    critical_checks = [
        results["normalizer_A_match"],
        results["normalizer_B_match"],
        results["section_lock"],
        results["identifiers_ok"],
        results["keywords_ok"],
        results["code_blocks_ok"],
        results["tables_count_ok"],
    ]

    results["status"] = "PASS" if all(critical_checks) else "FAIL"

    print("=== VERIFICATION RESULTS ===")
    print(f"Normalizer A match: {results['normalizer_A_match']}")
    print(f"Normalizer B match: {results['normalizer_B_match']}")
    print(f"Section structure preserved: {results['section_lock']}")
    print(f"Identifiers preserved: {results['identifiers_ok']}")
    print(f"Keywords preserved: {results['keywords_ok']}")
    print(f"Code blocks preserved: {results['code_blocks_ok']}")
    print(f"Table count preserved: {results['tables_count_ok']}")
    print(f"Overall status: {results['status']}")

    # Debug info for failures
    if not results["normalizer_A_match"]:
        print("\nNormalizer A hashes differ:")
        print(f"Source: {src_a_hash}")
        print(f"Formatted: {fmt_a_hash}")

    if not results["normalizer_B_match"]:
        print("\nNormalizer B hashes differ:")
        print(f"Source: {src_b_hash}")
        print(f"Formatted: {fmt_b_hash}")

    if not results["section_lock"]:
        print("\nSection mismatch:")
        print(f"Source sections: {len(src_sections)}")
        print(f"Formatted sections: {len(fmt_sections)}")

    if not results["identifiers_ok"]:
        print("\nIdentifier mismatch:")
        print(f"Source: {sorted(src_identifiers)}")
        print(f"Formatted: {sorted(fmt_identifiers)}")

    if not results["keywords_ok"]:
        print("\nKeyword mismatch:")
        print(f"Source: {sorted(src_keywords)}")
        print(f"Formatted: {sorted(fmt_keywords)}")

    return results


if __name__ == "__main__":
    results = main()
