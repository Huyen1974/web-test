#!/usr/bin/env python3
import re


def main():
    # Read both files
    with open(
        "/Users/nmhuyen/Documents/Infor/Kế hoạch liên quan/Langdroid_Agent data/TÀI LIỆU QUY PHẠM/LƯU CHUẨN/GC LAW.md",
        encoding="utf-8",
    ) as f:
        source = f.read()

    with open(
        "/Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid/nhap_cursor/GC_LAW_temp.md",
        encoding="utf-8",
    ) as f:
        formatted = f.read()

    # Debug code blocks - source has no code blocks, so this is wrong
    print("=== CODE BLOCK ANALYSIS ===")
    # Source should have no fenced code blocks
    src_fenced = re.findall(r"```[^\n]*\n.*?\n```", source, re.DOTALL)
    fmt_fenced = re.findall(r"```[^\n]*\n.*?\n```", formatted, re.DOTALL)

    print(f"Source fenced blocks: {len(src_fenced)}")
    print(f"Formatted fenced blocks: {len(fmt_fenced)}")

    if src_fenced:
        print("Source fenced blocks found (should be 0):")
        for i, block in enumerate(src_fenced):
            print(f"  {i}: {block[:100]}...")

    if fmt_fenced:
        print("Formatted fenced blocks:")
        for i, block in enumerate(fmt_fenced):
            print(f"  {i}: {block[:100]}...")

    # Debug table conversion
    print("\n=== TABLE ANALYSIS ===")
    # Look for tab-separated content in source
    src_lines = source.split("\n")
    fmt_lines = formatted.split("\n")

    src_tab_lines = [line for line in src_lines if "\t" in line]
    fmt_pipe_lines = [line for line in fmt_lines if "|" in line and line.strip()]

    print(f"Source tab-separated lines: {len(src_tab_lines)}")
    print(f"Formatted pipe lines: {len(fmt_pipe_lines)}")

    print("\nSource tab lines:")
    for line in src_tab_lines:
        print(f"  {repr(line)}")

    print("\nFormatted pipe lines:")
    for line in fmt_pipe_lines[:10]:  # First 10
        print(f"  {repr(line)}")

    # Debug section analysis
    print("\n=== SECTION ANALYSIS ===")

    # Extract sections from both
    def extract_sections(text):
        sections = []
        patterns = [
            r"(§\d+:?\s*[^:\n]*?)(?=\n|$)",
            r"(\d+\.\d*\.?\s+[^\n]*?)(?=\n|$)",
            r"(Điều\s+[IVXLCDM]+\b[^\n]*?)(?=\n|$)",
            r"(Phụ\s+lục\s+[A-Z]\b[^\n]*?)(?=\n|$)",
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.MULTILINE | re.IGNORECASE)
            sections.extend(matches)

        return sections

    src_sections = extract_sections(source)
    fmt_sections = extract_sections(formatted)

    print(f"Source sections: {len(src_sections)}")
    print(f"Formatted sections: {len(fmt_sections)}")

    if len(src_sections) != len(fmt_sections):
        print("Section mismatch! Showing differences:")
        print("Source sections:")
        for i, section in enumerate(src_sections):
            print(f"  {i:2d}: {section}")
        print("\nFormatted sections:")
        for i, section in enumerate(fmt_sections):
            print(f"  {i:2d}: {section}")


if __name__ == "__main__":
    main()
