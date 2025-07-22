#!/usr/bin/env python3
"""
Check Qdrant function status and assert RUNNING status.
Part of CP0.8 checkpoint.
"""

import json
import os
import sys

import requests


def check_qdrant_function_status(function_url: str) -> bool:
    """
    Check if Qdrant function returns RUNNING status.

    Args:
        function_url: URL of the manage_qdrant Cloud Function

    Returns:
        bool: True if status is RUNNING, False otherwise
    """
    try:
        # Call the function with status action
        response = requests.get(function_url, params={"action": "status"}, timeout=30)

        print(f"Function URL: {function_url}")
        print(f"Response Status Code: {response.status_code}")

        if response.status_code != 200:
            print(f"ERROR: Function returned status code {response.status_code}")
            print(f"Response: {response.text}")
            return False

        # Parse JSON response
        try:
            data = response.json()
            print(f"Response Data: {json.dumps(data, indent=2)}")
        except json.JSONDecodeError as e:
            print(f"ERROR: Failed to parse JSON response: {e}")
            print(f"Raw response: {response.text}")
            return False

        # Check for error in response
        if "error" in data:
            print(f"ERROR: Function returned error: {data['error']}")
            return False

        # Extract cluster status (support both 'status' and 'state' fields)
        result = data.get("result", {})
        cluster_status = result.get("status", data.get("state", "UNKNOWN"))

        print(f"Cluster Status: {cluster_status}")

        # Check if state is not RUNNING or dummy and exit with error message
        if data.get("state") not in ("RUNNING", "dummy"):
            sys.exit("Fn unhealthy")

        # Assert RUNNING or dummy status
        if cluster_status in ("RUNNING", "dummy"):
            print("✅ CP0.8 PASS: Qdrant cluster status is RUNNING/dummy")
            return True
        else:
            print(f"❌ CP0.8 FAIL: Expected RUNNING/dummy, got {cluster_status}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"ERROR: Failed to call function: {e}")
        return False
    except Exception as e:
        print(f"ERROR: Unexpected error: {e}")
        return False


def main():
    """Main function to check Qdrant function status."""
    # Get function URL from environment variable
    function_url = os.environ.get("QDRANT_FN_URL")

    if not function_url:
        print("ERROR: QDRANT_FN_URL environment variable not set")
        sys.exit(1)

    print("=" * 50)
    print("Checking Qdrant Function Status (CP0.8)")
    print("=" * 50)

    success = check_qdrant_function_status(function_url)

    if success:
        print("\n🎉 CP0.8 checkpoint PASSED!")
        sys.exit(0)
    else:
        print("\n💥 CP0.8 checkpoint FAILED!")
        sys.exit(1)


if __name__ == "__main__":
    main()
