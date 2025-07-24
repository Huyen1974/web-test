#!/usr/bin/env python3
"""
Preflight check script for Qdrant configuration.
Validates environment variables and API key setup before deployment.
Part of C6 checks.
"""

import os
import subprocess
import sys


def check_environment_variables():
    """Check required environment variables for Qdrant deployment."""
    required_vars = [
        "PROJECT_ID",
        "QDRANT_ACCOUNT_ID",
        "QDRANT_CLUSTER_ID",
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


def check_qdrant_mgmt_key():
    """Check if QDRANT_MGMT_KEY is properly configured and validate API access."""
    try:
        # Get management key from Secret Manager
        cmd = [
            "gcloud",
            "secrets",
            "versions",
            "access",
            "latest",
            "--secret=Qdrant_cloud_management_key",
            f"--project={os.environ.get('PROJECT_ID', 'github-chatgpt-ggcloud')}",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

        if result.returncode != 0:
            print("❌ Failed to retrieve QDRANT_MGMT_KEY from Secret Manager")
            print(f"Error: {result.stderr}")
            return False

        mgmt_key = result.stdout.strip()

        if not mgmt_key:
            print("❌ QDRANT_MGMT_KEY is empty")
            return False

        if len(mgmt_key) < 20:  # Basic length check for API key
            print("❌ QDRANT_MGMT_KEY appears to be too short")
            return False

        print(f"✅ QDRANT_MGMT_KEY retrieved (length: {len(mgmt_key)})")

        # Test API endpoints
        account_id = os.environ.get("QDRANT_ACCOUNT_ID")
        if not account_id:
            print("❌ QDRANT_ACCOUNT_ID not set for API validation")
            return False

        # Test both API endpoints
        endpoints = [
            ("https://cloud.qdrant.io/api/v1", "api-key"),
            ("https://api.cloud.qdrant.io/api/v1", "api-key"),
            ("https://api.cloud.qdrant.io/pa/v1", "Authorization"),
        ]

        working_endpoint = None
        working_header = None

        for base_url, header_type in endpoints:
            print(f"Testing {base_url} with {header_type} header...")

            if header_type == "api-key":
                header_value = mgmt_key
            else:
                header_value = f"apikey {mgmt_key}"

            test_url = f"{base_url}/accounts/{account_id}/clusters"

            curl_cmd = [
                "curl",
                "-s",
                "-w",
                "%{http_code}",
                "-o",
                "/dev/null",
                "-H",
                f"{header_type}: {header_value}",
                test_url,
            ]

            try:
                curl_result = subprocess.run(
                    curl_cmd, capture_output=True, text=True, timeout=30
                )
                status_code = curl_result.stdout.strip()

                print(f"  Status: {status_code}")

                if status_code == "200":
                    working_endpoint = base_url
                    working_header = header_type
                    print(f"✅ Working endpoint found: {base_url} with {header_type}")
                    break
                elif status_code == "401":
                    print(f"  401 Unauthorized - Invalid token for {base_url}")
                else:
                    print(f"  {status_code} - Other error for {base_url}")

            except subprocess.TimeoutExpired:
                print(f"  Timeout testing {base_url}")
            except Exception as e:
                print(f"  Error testing {base_url}: {e}")

        if working_endpoint:
            # Set environment variables for deployment
            print("\n✅ Working API configuration found:")
            print(f"  QDRANT_API_BASE={working_endpoint}")
            print(f"  QDRANT_AUTH_HEADER={working_header}")

            # Export for shell use
            with open(".env.working", "w") as f:
                f.write(f"export QDRANT_API_BASE={working_endpoint}\n")
                f.write(f"export QDRANT_AUTH_HEADER={working_header}\n")

            return True
        else:
            print("❌ No working API endpoint found - all returned 401 or errors")
            print("Please verify the Qdrant_cloud_management_key secret is correct")
            return False

    except subprocess.TimeoutExpired:
        print("❌ Timeout retrieving QDRANT_MGMT_KEY from Secret Manager")
        return False
    except Exception as e:
        print(f"❌ Error checking QDRANT_MGMT_KEY: {e}")
        return False


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
        ("Management Key & API Access", check_qdrant_mgmt_key),
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
        print("💡 Source .env.working for deployment variables")
        sys.exit(0)
    else:
        print("💥 Some preflight checks FAILED!")
        print("Please fix the issues above before proceeding with deployment.")
        sys.exit(1)


if __name__ == "__main__":
    main()
