import os
import time
from typing import Any

import functions_framework
import requests
from flask import Request

# Environment variables
QDRANT_ACCOUNT_ID = os.environ.get("QDRANT_ACCOUNT_ID")
QDRANT_CLUSTER_ID = os.environ.get("QDRANT_CLUSTER_ID")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")
QDRANT_BASE_URL = "https://cloud.qdrant.io/api/v1"


def _get_headers() -> dict[str, str]:
    """Get headers for Qdrant API requests."""
    return {
        "Authorization": f"Bearer {QDRANT_API_KEY}",
        "Content-Type": "application/json",
    }


def _make_request(
    method: str, endpoint: str, data: dict | None = None
) -> dict[str, Any]:
    """Make HTTP request to Qdrant API."""
    url = f"{QDRANT_BASE_URL}/{endpoint}"
    headers = _get_headers()

    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=30)
        elif method.upper() == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=30)
        else:
            return {"error": f"Unsupported method: {method}"}

        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}


def get_cluster_status() -> dict[str, Any]:
    """Get current cluster status."""
    endpoint = f"accounts/{QDRANT_ACCOUNT_ID}/clusters/{QDRANT_CLUSTER_ID}"
    return _make_request("GET", endpoint)


def restart_cluster() -> dict[str, Any]:
    """Restart the Qdrant cluster."""
    endpoint = f"accounts/{QDRANT_ACCOUNT_ID}/clusters/{QDRANT_CLUSTER_ID}/restart"
    return _make_request("POST", endpoint)


def suspend_cluster() -> dict[str, Any]:
    """Suspend the Qdrant cluster."""
    endpoint = f"accounts/{QDRANT_ACCOUNT_ID}/clusters/{QDRANT_CLUSTER_ID}/suspend"
    return _make_request("POST", endpoint)


def resume_cluster() -> dict[str, Any]:
    """Resume the Qdrant cluster."""
    endpoint = f"accounts/{QDRANT_ACCOUNT_ID}/clusters/{QDRANT_CLUSTER_ID}/resume"
    return _make_request("POST", endpoint)


def create_snapshot() -> dict[str, Any]:
    """Create a cluster snapshot."""
    endpoint = f"accounts/{QDRANT_ACCOUNT_ID}/clusters/{QDRANT_CLUSTER_ID}/snapshots"
    return _make_request("POST", endpoint)


def poll_until_healthy(max_attempts: int = 30, delay: int = 10) -> dict[str, Any]:
    """Poll cluster status until it's healthy."""
    for attempt in range(max_attempts):
        status_response = get_cluster_status()

        if "error" in status_response:
            return {"error": f'Failed to get status: {status_response["error"]}'}

        cluster_status = status_response.get("result", {}).get("status", "UNKNOWN")

        if cluster_status == "RUNNING":
            return {
                "status": "HEALTHY",
                "attempts": attempt + 1,
                "cluster_status": cluster_status,
            }

        if attempt < max_attempts - 1:  # Don't sleep on last attempt
            time.sleep(delay)

    return {
        "error": "Cluster did not become healthy within timeout",
        "attempts": max_attempts,
        "last_status": status_response.get("result", {}).get("status", "UNKNOWN"),
    }


@functions_framework.http
def manage_qdrant(request: Request) -> dict[str, Any]:
    """Main Cloud Function entry point."""
    # Validate required environment variables
    if not all([QDRANT_ACCOUNT_ID, QDRANT_CLUSTER_ID, QDRANT_API_KEY]):
        return {
            "error": "Missing required environment variables: QDRANT_ACCOUNT_ID, QDRANT_CLUSTER_ID, QDRANT_API_KEY"
        }, 500

    # Parse request
    try:
        if request.method == "GET":
            action = request.args.get("action", "status")
        else:
            request_json = request.get_json(silent=True) or {}
            action = request_json.get("action", "status")
    except Exception as e:
        return {"error": f"Invalid request format: {str(e)}"}, 400

    # Route to appropriate action
    try:
        if action == "status":
            result = get_cluster_status()
        elif action == "restart":
            result = restart_cluster()
        elif action == "suspend":
            result = suspend_cluster()
        elif action == "resume":
            result = resume_cluster()
        elif action == "snapshot":
            result = create_snapshot()
        elif action == "poll_healthy":
            max_attempts = request.args.get("max_attempts", 30)
            delay = request.args.get("delay", 10)
            try:
                max_attempts = int(max_attempts)
                delay = int(delay)
            except ValueError:
                return {"error": "max_attempts and delay must be integers"}, 400
            result = poll_until_healthy(max_attempts, delay)
        else:
            return {"error": f"Unknown action: {action}"}, 400

        # Return result
        if "error" in result:
            return result, 500
        else:
            return result, 200

    except Exception as e:
        return {"error": f"Internal error: {str(e)}"}, 500
