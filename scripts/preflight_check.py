#!/usr/bin/env python3
"""
Preflight check script for Qdrant configuration.
Validates environment variables and API key setup before deployment.
Part of C6 checks.
"""

import os
import sys


def check_environment_variables():
    """Check required environment variables for Qdrant deployment."""
    required_vars = [
        "PROJECT_ID",
        "QDRANT_ACCOUNT_ID",
        "QDRANT_CLUSTER_ID",
        "QDRANT_API_KEY",
    ]

    missing_vars = []

    for var in required_vars:
        value = os.environ.get(var)
        if not value or value in ["<placeholder>", "placeholder"]:
            missing_vars.append(var)

    if missing_vars:
        print(
            f"❌ Missing or placeholder environment variables: {', '.join(missing_vars)}"
        )
        return False

    print("✅ All required environment variables are set")
    return True


def check_qdrant_api_key():
    """Check if QDRANT_API_KEY is properly configured."""
    api_key = os.environ.get("QDRANT_API_KEY")

    if not api_key:
        print("❌ QDRANT_API_KEY not set")
        return False

    if api_key == "<placeholder>" or api_key == "placeholder":
        print("❌ QDRANT_API_KEY is still set to placeholder value")
        return False

    if len(api_key) < 20:  # Basic length check for API key
        print("❌ QDRANT_API_KEY appears to be too short")
        return False

    print("✅ QDRANT_API_KEY appears to be properly configured")
    return True


def check_project_config():
    """Check project configuration."""
    project_id = os.environ.get("PROJECT_ID")

    if not project_id:
        print("❌ PROJECT_ID not set")
        return False

    if project_id == "github-chatgpt-ggcloud":
        print("✅ PROJECT_ID set to production project")
    else:
        print(f"⚠️  PROJECT_ID set to: {project_id} (not production)")

    return True


def main():
    """Main preflight check function."""
    print("=" * 50)
    print("Preflight Check for Qdrant Configuration")
    print("=" * 50)

    checks = [
        ("Environment Variables", check_environment_variables),
        ("API Key Configuration", check_qdrant_api_key),
        ("Project Configuration", check_project_config),
    ]

    all_passed = True

    for check_name, check_func in checks:
        print(f"\nRunning {check_name} check...")
        if not check_func():
            all_passed = False

    print("\n" + "=" * 50)

    if all_passed:
        print("🎉 All preflight checks PASSED!")
        sys.exit(0)
    else:
        print("💥 Some preflight checks FAILED!")
        print("Please fix the issues above before proceeding with deployment.")
        sys.exit(1)


if __name__ == "__main__":
    main()
