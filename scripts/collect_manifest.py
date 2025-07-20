#!/usr/bin/env python3
"""
Test manifest collection script for CP0.4 test count freeze.

This script walks the ./tests directory and outputs sorted "file::testname" lines.
It validates that all test functions have @pytest.mark.unit decorator.
The --check flag compares with a baseline file and exits with non-zero if there are differences.
"""

import argparse
import ast
import sys
from pathlib import Path


class TestFunctionVisitor(ast.NodeVisitor):
    """AST visitor to find test functions and their decorators."""

    def __init__(self):
        self.test_functions = []
        self.missing_unit_markers = []
        self.current_class_has_unit_marker = False

    def visit_ClassDef(self, node):
        """Visit class definitions to check for unit markers."""
        # Save previous state
        prev_class_has_unit_marker = self.current_class_has_unit_marker

        # Check if this class has unit marker
        self.current_class_has_unit_marker = False
        for decorator in node.decorator_list:
            if self._is_unit_marker(decorator):
                self.current_class_has_unit_marker = True
                break

        # Visit children (including test methods)
        self.generic_visit(node)

        # Restore previous state
        self.current_class_has_unit_marker = prev_class_has_unit_marker

    def visit_FunctionDef(self, node):
        """Visit function definitions to find test functions."""
        if node.name.startswith("test_"):
            # Check for pytest.mark.unit decorator on function or containing class
            has_unit_marker = self.current_class_has_unit_marker
            if not has_unit_marker:
                for decorator in node.decorator_list:
                    if self._is_unit_marker(decorator):
                        has_unit_marker = True
                        break

            self.test_functions.append(node.name)
            if not has_unit_marker:
                self.missing_unit_markers.append(node.name)

        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node):
        """Visit async function definitions to find test functions."""
        if node.name.startswith("test_"):
            # Check for pytest.mark.unit decorator on function or containing class
            has_unit_marker = self.current_class_has_unit_marker
            if not has_unit_marker:
                for decorator in node.decorator_list:
                    if self._is_unit_marker(decorator):
                        has_unit_marker = True
                        break

            self.test_functions.append(node.name)
            if not has_unit_marker:
                self.missing_unit_markers.append(node.name)

        self.generic_visit(node)

    def _is_unit_marker(self, decorator):
        """Check if a decorator is @pytest.mark.unit."""
        if isinstance(decorator, ast.Attribute):
            # Handle pytest.mark.unit
            if (
                isinstance(decorator.value, ast.Attribute)
                and isinstance(decorator.value.value, ast.Name)
                and decorator.value.value.id == "pytest"
                and decorator.value.attr == "mark"
                and decorator.attr == "unit"
            ):
                return True
        elif isinstance(decorator, ast.Name):
            # Handle cases where pytest.mark.unit is imported as unit
            if decorator.id == "unit":
                return True
        return False


def find_test_functions(file_path: Path) -> tuple[list[str], list[str]]:
    """Find all test functions in a Python file and check for unit markers.

    Returns:
        Tuple of (test_functions, missing_unit_markers)
    """
    try:
        with open(file_path, encoding="utf-8") as f:
            content = f.read()

        tree = ast.parse(content)
        visitor = TestFunctionVisitor()
        visitor.visit(tree)

        return visitor.test_functions, visitor.missing_unit_markers
    except Exception as e:
        print(f"Error parsing {file_path}: {e}", file=sys.stderr)
        return [], []


def collect_test_manifest(tests_dir: Path) -> tuple[list[str], list[str]]:
    """Collect all test functions from the tests directory.

    Returns:
        Tuple of (manifest_lines, all_missing_markers)
    """
    manifest_lines = []
    all_missing_markers = []

    # Walk through all Python files in tests directory
    for py_file in tests_dir.rglob("*.py"):
        if py_file.name.startswith("test_"):
            relative_path = py_file.relative_to(tests_dir.parent)
            test_functions, missing_markers = find_test_functions(py_file)

            # Add to manifest
            for func_name in sorted(test_functions):
                manifest_lines.append(f"{relative_path}::{func_name}")

            # Track missing markers with file context
            for func_name in missing_markers:
                all_missing_markers.append(f"{relative_path}::{func_name}")

    return sorted(manifest_lines), all_missing_markers


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Collect test manifest for CP0.4 test count freeze"
    )
    parser.add_argument(
        "--check",
        metavar="BASELINE_FILE",
        help="Compare with baseline file and exit with non-zero if different",
    )

    args = parser.parse_args()

    # Find tests directory
    tests_dir = Path("tests")
    if not tests_dir.exists():
        print("Error: tests directory not found", file=sys.stderr)
        sys.exit(1)

    # Collect test manifest
    manifest_lines, missing_markers = collect_test_manifest(tests_dir)

    # Check for missing unit markers
    if missing_markers:
        print(
            "Error: Test functions missing @pytest.mark.unit decorator:",
            file=sys.stderr,
        )
        for missing in missing_markers:
            print(f"  {missing}", file=sys.stderr)
        sys.exit(1)

    # Handle --check mode
    if args.check:
        baseline_file = Path(args.check)
        if not baseline_file.exists():
            print(f"Error: Baseline file {baseline_file} not found", file=sys.stderr)
            sys.exit(1)

        # Read baseline
        try:
            with open(baseline_file, encoding="utf-8") as f:
                baseline_lines = [
                    line.strip() for line in f.readlines() if line.strip()
                ]
        except Exception as e:
            print(f"Error reading baseline file: {e}", file=sys.stderr)
            sys.exit(1)

        # Compare with current manifest
        current_set = set(manifest_lines)
        baseline_set = set(baseline_lines)

        if current_set != baseline_set:
            print("Error: Manifest drift detected!", file=sys.stderr)

            added = current_set - baseline_set
            removed = baseline_set - current_set

            if added:
                print("Added tests:", file=sys.stderr)
                for test in sorted(added):
                    print(f"  + {test}", file=sys.stderr)

            if removed:
                print("Removed tests:", file=sys.stderr)
                for test in sorted(removed):
                    print(f"  - {test}", file=sys.stderr)

            sys.exit(1)

        print("✓ No manifest drift detected")
        sys.exit(0)

    # Output manifest
    for line in manifest_lines:
        print(line)


if __name__ == "__main__":
    main()
