#!/usr/bin/env python3
"""
Checkpoint runner script for Foundation S1 gates.

This script checks that all CP0.* checkpoints are in PASS state by reading
environment variables or checking system status. Fails if any critical
checkpoint is not green.

Reuses C1 pattern: clear error messages, proper exit codes, and verification logic.
"""

import subprocess
import sys
from pathlib import Path


def check_lockfile_consistency():
    """Check CP0.1: Lockfile consistency with pip-compile --no-upgrade."""
    try:
        # Run pip-compile --no-upgrade to regenerate requirements.txt
        result = subprocess.run(
            ["pip-compile", "--no-upgrade", "pyproject.toml"],
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode != 0:
            return False, f"pip-compile failed: {result.stderr}"

        # Check if requirements.txt changed
        git_result = subprocess.run(
            ["git", "diff", "--exit-code", "requirements.txt"],
            capture_output=True,
            text=True,
        )

        if git_result.returncode != 0:
            return False, "requirements.txt has uncommitted changes after pip-compile"

        return True, "CP0.1 PASS: Lockfile consistent"

    except Exception as e:
        return False, f"CP0.1 check failed: {e}"


def check_pre_commit():
    """Check CP0.2: Pre-commit hooks pass."""
    try:
        result = subprocess.run(
            ["pre-commit", "run", "--all-files"],
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.returncode != 0:
            return False, f"pre-commit failed: {result.stdout}"

        return True, "CP0.2 PASS: Pre-commit hooks pass"

    except Exception as e:
        return False, f"CP0.2 check failed: {e}"


def check_unit_tests():
    """Check CP0.3: Unit tests with coverage >= 80%."""
    try:
        result = subprocess.run(
            ["pytest", "-m", "unit", "--cov=agent_data", "--cov-fail-under=80"],
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.returncode != 0:
            return False, f"Unit tests failed: {result.stdout}"

        return True, "CP0.3 PASS: Unit tests with coverage >= 80%"

    except Exception as e:
        return False, f"CP0.3 check failed: {e}"


def check_manifest_drift():
    """Check CP0.4: Manifest drift = 0."""
    try:
        snapshot_file = Path("tests/.snapshot")
        if not snapshot_file.exists():
            return False, "tests/.snapshot not found"

        result = subprocess.run(
            ["python", "scripts/collect_manifest.py", "--check", "tests/.snapshot"],
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode != 0:
            return False, f"Manifest drift detected: {result.stderr}"

        return True, "CP0.4 PASS: No manifest drift"

    except Exception as e:
        return False, f"CP0.4 check failed: {e}"


def check_secret_scan():
    """Check CP0.5: Secret scan 0 findings."""
    try:
        # Check if trufflehog is available
        result = subprocess.run(
            ["which", "trufflehog"],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            # Install trufflehog temporarily for CI
            install_cmd = [
                "bash",
                "-c",
                "curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh -s -- -b /tmp",
            ]
            subprocess.run(install_cmd, check=True, timeout=60)
            trufflehog_path = "/tmp/trufflehog"
        else:
            trufflehog_path = "trufflehog"

        # Run trufflehog scan
        scan_result = subprocess.run(
            [
                trufflehog_path,
                "filesystem",
                ".",
                "--fail",
                "--exclude-paths=.trufflehog-exclude",
                "--results=verified",
            ],
            capture_output=True,
            text=True,
            timeout=300,
        )

        if scan_result.returncode != 0:
            return False, f"Secret scan found issues: {scan_result.stdout}"

        return True, "CP0.5 PASS: Secret scan clean"

    except Exception as e:
        return False, f"CP0.5 check failed: {e}"


def check_dependency_versions():
    """Check CP0.9: Pin dependencies versions."""
    try:
        # Import and check versions
        import pkg_resources
        from packaging.version import Version as V

        # Check langroid version
        langroid_version = pkg_resources.get_distribution("langroid").version
        if langroid_version != "0.58.0":
            return (
                False,
                f"langroid version mismatch: expected 0.58.0, got {langroid_version}",
            )

        # Check slowapi version
        slowapi_version = pkg_resources.get_distribution("slowapi").version
        if slowapi_version != "0.1.9":
            return (
                False,
                f"slowapi version mismatch: expected 0.1.9, got {slowapi_version}",
            )

        # Check redis version
        import redis

        redis_version = redis.__version__
        if not (V("5.0.1") <= V(redis_version) < V("6.0.0")):
            return (
                False,
                f"redis version out of range: expected [5.0.1, 6.0.0), got {redis_version}",
            )

        return True, "CP0.9 PASS: Dependency versions correct"

    except Exception as e:
        return False, f"CP0.9 check failed: {e}"


def main():
    """Main checkpoint runner entry point."""
    print("🔍 Running Foundation S1 Checkpoint Gate...")

    # Define critical checkpoints
    checkpoints = [
        ("CP0.1", check_lockfile_consistency),
        ("CP0.2", check_pre_commit),
        ("CP0.3", check_unit_tests),
        ("CP0.4", check_manifest_drift),
        ("CP0.5", check_secret_scan),
        ("CP0.9", check_dependency_versions),
    ]

    failed_checkpoints = []

    # Run all checkpoints
    for cp_id, check_func in checkpoints:
        try:
            passed, message = check_func()
            if passed:
                print(f"✅ {message}")
            else:
                print(f"❌ {cp_id} FAIL: {message}")
                failed_checkpoints.append(cp_id)
        except Exception as e:
            print(f"❌ {cp_id} ERROR: {e}")
            failed_checkpoints.append(cp_id)

    # Summary
    if failed_checkpoints:
        print("\n🚫 Checkpoint Gate FAILED!")
        print(f"Failed checkpoints: {', '.join(failed_checkpoints)}")
        print("All CP0.* checkpoints must pass before merge/deploy.")
        sys.exit(1)
    else:
        print("\n✅ All Foundation S1 checkpoints PASSED!")
        print("Ready for merge/deploy.")
        sys.exit(0)


if __name__ == "__main__":
    main()
