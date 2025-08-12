#!/usr/bin/env python3
import re
import unicodedata


def normalize_text(text):
    """Normalize Unicode to NFC and convert to LF line endings"""
    text = unicodedata.normalize("NFC", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return text


def apply_conservative_formatting(text):
    """Apply only the minimal allowed formatting changes"""
    text = normalize_text(text)
    lines = text.split("\n")
    result_lines = []

    for line in lines:
        original_line = line

        # 1) Headings: Add ### prefix to section headers
        # §1:, §2:, etc.
        if re.match(r"^§\d+:", line.strip()):
            line = "### " + line.strip()
        # 1.1., 1.2., etc.
        elif re.match(r"^\d+\.\d+\.", line.strip()):
            line = "#### " + line.strip()
        # Handle table header lines (convert tab-separated to pipe-separated)
        elif "\t" in line and not line.startswith(" "):
            # Convert tab-separated table to pipe table
            parts = line.split("\t")
            if len(parts) > 1:
                line = "| " + " | ".join(parts) + " |"
        # 2) Bullets: normalize bullets (• to -)
        elif line.strip().startswith("•"):
            line = line.replace("•", "-", 1)
        # 3) Wrap <...> placeholders in backticks (but NOT inside code blocks)
        elif "<" in line and ">" in line:
            # Only if not inside a fence
            line = re.sub(r"<([^>]+)>", r"`<\1>`", line)

        result_lines.append(line)

    # Join lines back
    result = "\n".join(result_lines)

    # Add table alignment row after header rows
    final_lines = result.split("\n")
    output_lines = []
    i = 0
    while i < len(final_lines):
        line = final_lines[i]
        output_lines.append(line)

        # Check if this is a table header (has |)
        if "|" in line and line.strip() and not line.strip().startswith("|---|"):
            # Look ahead to see if next line is also a table line
            if i + 1 < len(final_lines) and "|" in final_lines[i + 1]:
                # Count columns
                cols = line.count("|") - 1 if line.count("|") > 1 else line.count("|")
                if cols > 0:
                    alignment_row = "|" + "---|" * cols
                    output_lines.append(alignment_row)

    return "\n".join(output_lines)


def main():
    # Read source
    source_path = "/Users/nmhuyen/Documents/Infor/Kế hoạch liên quan/Langdroid_Agent data/TÀI LIỆU QUY PHẠM/LƯU CHUẨN/GC LAW.md"
    output_path = "/Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC_LAW_conservative.md"

    with open(source_path, encoding="utf-8") as f:
        source_text = f.read()

    # Apply conservative formatting
    formatted_text = apply_conservative_formatting(source_text)

    # Write output
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(formatted_text)

    print(f"Created conservative version at {output_path}")


if __name__ == "__main__":
    main()
