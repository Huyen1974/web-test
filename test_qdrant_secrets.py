#!/usr/bin/env python3
"""
Simple Qdrant secrets tester for GitHub Actions.
This script will be used to test Qdrant secrets specifically.
"""

import os
import sys

import requests


def test_qdrant_mgmt_key():
    """Test QDRANT_CLOUD_MGMT_KEY against management API."""
    api_key = os.getenv("QDRANT_CLOUD_MGMT_KEY", "")

    print(f"🔑 QDRANT_CLOUD_MGMT_KEY length: {len(api_key)}")

    if len(api_key) < 10:  # API keys are typically much longer
        print("❌ QDRANT_CLOUD_MGMT_KEY appears to be too short (likely placeholder)")
        return False

    # Test actual API call
    try:
        headers = {
            "Authorization": f"apikey {api_key}",
            "Content-Type": "application/json",
        }

        url = "https://api.cloud.qdrant.io/api/cluster/v1/clusters"
        print(f"🌐 Testing management API: {url}")

        response = requests.get(url, headers=headers, timeout=15)
        print(f"📡 Response status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            clusters = data.get("result", [])
            print(f"✅ Management API test PASSED - found {len(clusters)} clusters")
            for cluster in clusters:
                print(
                    f"   - Cluster: {cluster.get('name', 'unnamed')} (ID: {cluster.get('id', 'unknown')})"
                )
            return True
        elif response.status_code == 401:
            print("❌ Management API test FAILED - Authentication failed (invalid key)")
            return False
        else:
            print(
                f"❌ Management API test FAILED - Status {response.status_code}: {response.text}"
            )
            return False

    except Exception as e:
        print(f"❌ Management API test FAILED - Error: {str(e)}")
        return False


def test_qdrant_cluster_key():
    """Test QDRANT_CLUSTER1_KEY against cluster API."""
    api_key = os.getenv("QDRANT_CLUSTER1_KEY", "")
    cluster_id = os.getenv("QDRANT_CLUSTER1_ID", "")

    print(f"🔑 QDRANT_CLUSTER1_KEY length: {len(api_key)}")
    print(f"🆔 QDRANT_CLUSTER1_ID: {cluster_id}")

    if len(api_key) < 10:  # API keys are typically much longer
        print("❌ QDRANT_CLUSTER1_KEY appears to be too short (likely placeholder)")
        return False

    if not cluster_id:
        print("❌ QDRANT_CLUSTER1_ID is empty")
        return False

    # Test actual API call
    try:
        cluster_url = f"https://{cluster_id}.us-east4-0.gcp.cloud.qdrant.io:6333"
        headers = {"api-key": api_key, "Content-Type": "application/json"}

        url = f"{cluster_url}/collections"
        print(f"🌐 Testing cluster API: {url}")

        response = requests.get(url, headers=headers, timeout=15)
        print(f"📡 Response status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            collections = data.get("result", {}).get("collections", [])
            print(f"✅ Cluster API test PASSED - found {len(collections)} collections")
            for collection in collections:
                print(f"   - Collection: {collection.get('name', 'unnamed')}")
            return True
        elif response.status_code == 401:
            print("❌ Cluster API test FAILED - Authentication failed (invalid key)")
            return False
        else:
            print(
                f"❌ Cluster API test FAILED - Status {response.status_code}: {response.text}"
            )
            return False

    except Exception as e:
        print(f"❌ Cluster API test FAILED - Error: {str(e)}")
        return False


def main():
    """Main function."""
    print("🔐 Testing Qdrant Secrets")
    print("=" * 40)

    mgmt_ok = test_qdrant_mgmt_key()
    print()
    cluster_ok = test_qdrant_cluster_key()

    print("\n" + "=" * 40)
    print("SUMMARY:")
    print(f"QDRANT_CLOUD_MGMT_KEY: {'✅ OK' if mgmt_ok else '❌ FAIL'}")
    print(f"QDRANT_CLUSTER1_KEY:   {'✅ OK' if cluster_ok else '❌ FAIL'}")

    if mgmt_ok and cluster_ok:
        print("\n🎉 All Qdrant secrets are working!")
        sys.exit(0)
    else:
        print("\n💥 Some Qdrant secrets failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
