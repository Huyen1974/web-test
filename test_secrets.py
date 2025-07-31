#!/usr/bin/env python3
"""
Test script to verify GitHub secrets for Qdrant functionality.
This script tests both QDRANT_CLOUD_MGMT_KEY and QDRANT_CLUSTER1_KEY.
"""

import os
import sys
from typing import Any

import requests


def test_mgmt_key(api_key: str) -> dict[str, Any]:
    """Test QDRANT_CLOUD_MGMT_KEY by calling management API."""
    if not api_key or api_key.strip() == "":
        return {"success": False, "error": "API key is empty"}

    # Check for common placeholder values
    placeholder_values = [
        "xxx",
        "changeme",
        "your-api-key",
        "placeholder",
        "TODO",
        "FIXME",
    ]
    if api_key.lower() in [p.lower() for p in placeholder_values]:
        return {
            "success": False,
            "error": f"API key appears to be placeholder: {api_key}",
        }

    # Test actual API call
    try:
        headers = {
            "Authorization": f"apikey {api_key}",
            "Content-Type": "application/json",
        }

        # Call Qdrant management API using account-scoped endpoint
        account_id = "b7093834-20e9-4206-8ea0-025b6994b319"
        url = (
            f"https://api.cloud.qdrant.io/api/cluster/v1/accounts/{account_id}/clusters"
        )
        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()
            return {
                "success": True,
                "clusters_count": len(data.get("result", [])),
                "response": data,
            }
        elif response.status_code == 401:
            return {
                "success": False,
                "error": "Authentication failed - invalid API key",
            }
        elif response.status_code == 403:
            return {
                "success": False,
                "error": "Access forbidden - insufficient permissions",
            }
        else:
            return {
                "success": False,
                "error": f"API call failed with status {response.status_code}: {response.text}",
            }

    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"Network error: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {str(e)}"}


def test_cluster_key(api_key: str, cluster_id: str) -> dict[str, Any]:
    """Test QDRANT_CLUSTER1_KEY by connecting to cluster and calling get_collections."""
    if not api_key or api_key.strip() == "":
        return {"success": False, "error": "API key is empty"}

    if not cluster_id or cluster_id.strip() == "":
        return {"success": False, "error": "Cluster ID is empty"}

    # Check for common placeholder values
    placeholder_values = [
        "xxx",
        "changeme",
        "your-api-key",
        "placeholder",
        "TODO",
        "FIXME",
    ]
    if api_key.lower() in [p.lower() for p in placeholder_values]:
        return {
            "success": False,
            "error": f"API key appears to be placeholder: {api_key}",
        }

    # Test actual API call using REST API (simulating QdrantClient behavior)
    try:
        cluster_url = f"https://{cluster_id}.us-east4-0.gcp.cloud.qdrant.io:6333"
        headers = {"api-key": api_key, "Content-Type": "application/json"}

        # Call collections endpoint
        url = f"{cluster_url}/collections"
        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()
            collections = data.get("result", {}).get("collections", [])
            return {
                "success": True,
                "collections_count": len(collections),
                "collections": [c.get("name", "unnamed") for c in collections],
            }
        elif response.status_code == 401:
            return {
                "success": False,
                "error": "Authentication failed - invalid API key",
            }
        elif response.status_code == 403:
            return {
                "success": False,
                "error": "Access forbidden - insufficient permissions",
            }
        else:
            return {
                "success": False,
                "error": f"API call failed with status {response.status_code}: {response.text}",
            }

    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"Network error: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {str(e)}"}


def check_placeholder(value: str) -> bool:
    """Check if value is a placeholder."""
    if not value or value.strip() == "":
        return True

    placeholder_values = [
        "xxx",
        "changeme",
        "your-api-key",
        "your-cluster-id",
        "placeholder",
        "TODO",
        "FIXME",
    ]
    return value.lower() in [p.lower() for p in placeholder_values]


def main():
    """Main function to test both secrets."""
    print("🔐 Testing GitHub Secrets for Qdrant")
    print("=" * 50)

    # Get environment variables
    mgmt_key = os.getenv("QDRANT_CLOUD_MGMT_KEY", "")
    cluster_key = os.getenv("QDRANT_CLUSTER1_KEY", "")
    cluster_id = os.getenv("QDRANT_CLUSTER1_ID", "")

    # Results tracking
    results = {
        "QDRANT_CLOUD_MGMT_KEY": {
            "exists": bool(mgmt_key),
            "placeholder": check_placeholder(mgmt_key),
            "api_test": False,
            "result": "FAIL",
        },
        "QDRANT_CLUSTER1_KEY": {
            "exists": bool(cluster_key),
            "placeholder": check_placeholder(cluster_key),
            "api_test": False,
            "result": "FAIL",
        },
    }

    # Test QDRANT_CLOUD_MGMT_KEY
    print("\n1. Testing QDRANT_CLOUD_MGMT_KEY...")
    if mgmt_key:
        print(f"   ✅ Secret exists ({len(mgmt_key)} characters)")
        if not check_placeholder(mgmt_key):
            print("   ✅ Not a placeholder value")
            print("   🔄 Testing management API...")
            mgmt_result = test_mgmt_key(mgmt_key)
            if mgmt_result["success"]:
                print(
                    f"   ✅ API test passed - found {mgmt_result['clusters_count']} clusters"
                )
                results["QDRANT_CLOUD_MGMT_KEY"]["api_test"] = True
                results["QDRANT_CLOUD_MGMT_KEY"]["result"] = "OK"
            else:
                print(f"   ❌ API test failed: {mgmt_result['error']}")
        else:
            print(f"   ❌ Appears to be placeholder: {mgmt_key}")
    else:
        print("   ❌ Secret not found in environment")

    # Test QDRANT_CLUSTER1_KEY
    print("\n2. Testing QDRANT_CLUSTER1_KEY...")
    if cluster_key:
        print(f"   ✅ Secret exists ({len(cluster_key)} characters)")
        if not check_placeholder(cluster_key):
            print("   ✅ Not a placeholder value")
            if cluster_id:
                print(f"   ✅ Cluster ID available: {cluster_id}")
                print("   🔄 Testing cluster API...")
                cluster_result = test_cluster_key(cluster_key, cluster_id)
                if cluster_result["success"]:
                    print(
                        f"   ✅ API test passed - found {cluster_result['collections_count']} collections"
                    )
                    if cluster_result["collections"]:
                        print(
                            f"   📁 Collections: {', '.join(cluster_result['collections'])}"
                        )
                    results["QDRANT_CLUSTER1_KEY"]["api_test"] = True
                    results["QDRANT_CLUSTER1_KEY"]["result"] = "OK"
                else:
                    print(f"   ❌ API test failed: {cluster_result['error']}")
            else:
                print("   ❌ QDRANT_CLUSTER1_ID not found in environment")
        else:
            print(f"   ❌ Appears to be placeholder: {cluster_key}")
    else:
        print("   ❌ Secret not found in environment")

    # Print results table
    print("\n" + "=" * 70)
    print("RESULTS TABLE")
    print("=" * 70)
    print(
        f"{'Secret Name':<25} {'Exists':<8} {'Placeholder':<12} {'API Test':<10} {'Result':<8}"
    )
    print("-" * 70)

    for secret_name, data in results.items():
        exists_icon = "✅" if data["exists"] else "❌"
        placeholder_icon = "✅" if data["placeholder"] else "❌"
        api_test_icon = "✅" if data["api_test"] else "❌"
        result = data["result"]

        print(
            f"{secret_name:<25} {exists_icon:<8} {placeholder_icon:<12} {api_test_icon:<10} {result:<8}"
        )

    # Exit with appropriate code
    all_ok = all(result["result"] == "OK" for result in results.values())
    if all_ok:
        print("\n🎉 All secrets verified successfully!")
        sys.exit(0)
    else:
        print("\n💥 Some secrets failed verification!")
        sys.exit(1)


if __name__ == "__main__":
    main()
