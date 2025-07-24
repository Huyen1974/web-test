import json
import logging
import os
import time

import requests

# Configure structured logging
logging.basicConfig(format="%(message)s")
logger = logging.getLogger(__name__)

# Dynamic API configuration with fallback defaults
API_BASE = os.getenv("QDRANT_API_BASE", "https://cloud.qdrant.io/api/v1")
ACCOUNT_ID = os.getenv("QDRANT_ACCOUNT_ID")


def _api(path: str) -> str:
    """Build API URL for Qdrant Cloud Management API."""
    return f"{API_BASE}/accounts/{ACCOUNT_ID}/{path.lstrip('/')}"


def get_access_token():
    """Get access token from Google metadata server."""
    try:
        metadata_url = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"
        headers = {"Metadata-Flavor": "Google"}
        response = requests.get(metadata_url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()["access_token"]
    except Exception as e:
        logger.error(json.dumps({"action": "token_error", "error": str(e)}))
        return None


def update_secret_manager(secret_name: str, secret_value: str) -> bool:
    """Update Secret Manager secret using REST API."""
    try:
        project_id = os.getenv("PROJECT_ID")
        access_token = get_access_token()
        if not access_token:
            return False

        # Secret Manager REST API URL
        url = f"https://secretmanager.googleapis.com/v1/projects/{project_id}/secrets/{secret_name}:addVersion"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        data = {"payload": {"data": secret_value.encode("utf-8").hex()}}

        response = requests.post(url, headers=headers, json=data, timeout=30)

        if response.status_code == 200:
            version_info = response.json()
            version_id = version_info.get("name", "unknown").split("/")[-1]
            logger.info(
                json.dumps(
                    {
                        "action": "secret_updated",
                        "secret_name": secret_name,
                        "version_id": version_id,
                        "version": version_info.get("name", "unknown"),
                    }
                )
            )
            return True
        else:
            logger.error(
                json.dumps(
                    {
                        "action": "secret_update_error",
                        "secret_name": secret_name,
                        "status_code": response.status_code,
                        "error": response.text,
                    }
                )
            )
            return False

    except Exception as e:
        logger.error(
            json.dumps(
                {
                    "action": "secret_update_exception",
                    "secret_name": secret_name,
                    "error": str(e),
                }
            )
        )
        return False


def handle(request):
    """Cloud Function entry point for managing Qdrant cluster."""

    # Environment configuration
    env = {
        "PROJECT_ID": os.getenv("PROJECT_ID", "github-chatgpt-ggcloud"),
        "QDRANT_ACCOUNT_ID": os.getenv("QDRANT_ACCOUNT_ID"),
        "QDRANT_CLUSTER_ID": os.getenv("QDRANT_CLUSTER_ID"),
        "AUTO_STOP_MINUTES": int(os.getenv("AUTO_STOP_MINUTES", "60")),
        "QDRANT_MGMT_KEY": os.getenv("QDRANT_MGMT_KEY", ""),
        "QDRANT_API_BASE": os.getenv(
            "QDRANT_API_BASE", "https://cloud.qdrant.io/api/v1"
        ),
        "QDRANT_AUTH_HEADER": os.getenv("QDRANT_AUTH_HEADER", "api-key"),
    }

    # Validate required environment variables
    missing_vars = [
        key
        for key, value in env.items()
        if value == "" and key != "QDRANT_API_BASE" and key != "QDRANT_AUTH_HEADER"
    ]
    if missing_vars:
        error_msg = f"Missing required environment variables: {missing_vars}"
        logger.error(json.dumps({"action": "error", "message": error_msg}))
        return error_msg, 500

    # Build authentication headers dynamically
    auth_header = env["QDRANT_AUTH_HEADER"]
    mgmt_key = env["QDRANT_MGMT_KEY"]

    if auth_header == "api-key":
        auth_value = mgmt_key
    else:  # Authorization header
        auth_value = f"apikey {mgmt_key}"

    # Common headers for Qdrant Cloud Management API
    headers = {
        auth_header: auth_value,
        "Content-Type": "application/json",
    }

    def call_qdrant(method, path, data=None, retries=3):
        """Make API call to Qdrant Cloud Management API with retry logic."""
        # Use dynamic API base from environment
        url = f"{env['QDRANT_API_BASE']}/{path}"
        for attempt in range(retries):
            try:
                logger.info(
                    json.dumps(
                        {
                            "action": "api_call",
                            "method": method,
                            "url": url,
                            "headers": {auth_header: f"{mgmt_key[:8]}..."},
                        }
                    )
                )
                response = requests.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=data,
                    timeout=30,
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(
                        json.dumps(
                            {
                                "action": "api_error",
                                "url": url,
                                "status_code": response.status_code,
                                "error": response.text,
                            }
                        )
                    )
                    if response.status_code in [401, 403]:
                        # Authentication errors shouldn't be retried
                        break

            except requests.exceptions.RequestException as e:
                logger.error(
                    json.dumps(
                        {
                            "action": "request_error",
                            "url": url,
                            "error": str(e),
                        }
                    )
                )

            if attempt < retries - 1:
                time.sleep(2**attempt)  # Exponential backoff

        return None

    def get_cluster_status():
        """Get current cluster status using list-clusters API."""
        clusters_result = call_qdrant(
            "GET", f"accounts/{env['QDRANT_ACCOUNT_ID']}/clusters"
        )
        if not clusters_result:
            return None

        # Find our specific cluster and return phase/endpoint
        clusters = clusters_result.get("clusters", [])
        for cluster in clusters:
            if cluster.get("id") == env["QDRANT_CLUSTER_ID"]:
                return {
                    "id": cluster.get("id"),
                    "phase": cluster.get("phase", "unknown"),
                    "endpoint": cluster.get("endpoint", ""),
                }

        logger.error(
            json.dumps(
                {
                    "action": "cluster_not_found",
                    "cluster_id": env["QDRANT_CLUSTER_ID"],
                    "available_clusters": [c.get("id") for c in clusters],
                }
            )
        )
        return None

    def create_snapshot():
        """Create a cluster snapshot."""
        return call_qdrant(
            "POST",
            f"accounts/{env['QDRANT_ACCOUNT_ID']}/clusters/{env['QDRANT_CLUSTER_ID']}/backups",
        )

    def wait_for_task(task_id, max_attempts=20):
        """Wait for a task to complete."""
        for _attempt in range(max_attempts):
            task_result = call_qdrant("GET", f"tasks/{task_id}")
            if task_result and task_result.get("status") == "SUCCEEDED":
                return task_result
            elif task_result and task_result.get("status") == "FAILED":
                logger.error(
                    json.dumps(
                        {
                            "action": "task_failed",
                            "task_id": task_id,
                            "result": task_result,
                        }
                    )
                )
                return None
            time.sleep(30)  # Wait 30 seconds before next check
        return None

    def suspend_cluster():
        """Suspend the cluster."""
        return call_qdrant(
            "POST",
            f"accounts/{env['QDRANT_ACCOUNT_ID']}/clusters/{env['QDRANT_CLUSTER_ID']}:suspend",
        )

    def resume_cluster():
        """Resume the cluster."""
        return call_qdrant(
            "POST",
            f"accounts/{env['QDRANT_ACCOUNT_ID']}/clusters/{env['QDRANT_CLUSTER_ID']}:resume",
        )

    def set_last_hit():
        """Update the last hit timestamp in Secret Manager."""
        current_time = str(int(time.time()))
        success = update_secret_manager("qdrant_idle_marker", current_time)

        logger.info(
            json.dumps(
                {
                    "action": "touch",
                    "last_hit": current_time,
                    "secret_updated": success,
                }
            )
        )
        return current_time

    # Get action from query parameters
    action = request.args.get("action", "status")

    if action == "status":
        # Get cluster status using list-clusters
        cluster = get_cluster_status()
        if cluster:
            logger.info(
                json.dumps(
                    {
                        "action": "status",
                        "cluster_status": cluster.get("phase", "unknown"),
                        "cluster_id": env["QDRANT_CLUSTER_ID"],
                        "endpoint": cluster.get("endpoint", ""),
                    }
                )
            )
            return {"status": "ok", "cluster": cluster}
        else:
            return {"status": "error", "message": "Failed to get cluster status"}, 500

    elif action == "touch":
        # Update last hit timestamp
        last_hit = set_last_hit()
        return {"status": "ok", "action": "touch", "last_hit": last_hit}

    elif action == "snapshot":
        # Create a snapshot
        snapshot_result = create_snapshot()
        if snapshot_result and snapshot_result.get("task_id"):
            task_id = snapshot_result["task_id"]
            logger.info(
                json.dumps(
                    {
                        "action": "snapshot_started",
                        "task_id": task_id,
                    }
                )
            )

            # Wait for task completion
            task_result = wait_for_task(task_id)
            if task_result:
                logger.info(
                    json.dumps(
                        {
                            "action": "snapshot_completed",
                            "task_id": task_id,
                            "result": task_result,
                        }
                    )
                )
                return {"status": "ok", "action": "snapshot", "task": task_result}
            else:
                return {
                    "status": "error",
                    "message": "Snapshot task failed or timed out",
                }, 500
        else:
            return {"status": "error", "message": "Failed to create snapshot"}, 500

    elif action == "suspend":
        # Suspend the cluster
        suspend_result = suspend_cluster()
        if suspend_result:
            logger.info(
                json.dumps(
                    {
                        "action": "suspend_completed",
                        "result": suspend_result,
                    }
                )
            )
            return {"status": "ok", "action": "suspend", "result": suspend_result}
        else:
            return {"status": "error", "message": "Failed to suspend cluster"}, 500

    elif action == "resume":
        # Resume the cluster
        resume_result = resume_cluster()
        if resume_result:
            logger.info(
                json.dumps(
                    {
                        "action": "resume_completed",
                        "result": resume_result,
                    }
                )
            )
            return {"status": "ok", "action": "resume", "result": resume_result}
        else:
            return {"status": "error", "message": "Failed to resume cluster"}, 500

    else:
        return {"status": "error", "message": f"Unknown action: {action}"}, 400
