import json
import logging
import os
import subprocess
import time

import requests

# Configure structured logging
logging.basicConfig(format="%(message)s")
logger = logging.getLogger(__name__)

API_BASE = "https://api.cloud.qdrant.io/api/v1"


def handle(request):
    """Cloud Function entry point for managing Qdrant cluster."""

    def get_secret(name):
        """Get secret value from Secret Manager."""
        try:
            # Use gcloud to get secret value
            result = subprocess.run(
                [
                    "gcloud",
                    "secrets",
                    "versions",
                    "access",
                    "latest",
                    "--secret",
                    name,
                    "--project",
                    env["PROJECT_ID"],
                    "--quiet",
                ],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode == 0:
                return result.stdout.strip()
            else:
                logger.error(
                    json.dumps(
                        {
                            "error": "Failed to get secret",
                            "secret": name,
                            "stderr": result.stderr,
                        }
                    )
                )
                return "0"  # Default fallback
        except Exception as e:
            logger.error(
                json.dumps({"error": "Secret access failed", "exception": str(e)})
            )
            return "0"  # Default fallback

    def update_secret(name, value):
        """Update secret value in Secret Manager."""
        try:
            # Use gcloud to add new secret version
            result = subprocess.run(
                [
                    "gcloud",
                    "secrets",
                    "versions",
                    "add",
                    name,
                    "--data-file",
                    "-",
                    "--project",
                    env["PROJECT_ID"],
                    "--quiet",
                ],
                input=str(value),
                text=True,
                capture_output=True,
                timeout=30,
            )
            if result.returncode == 0:
                logger.info(
                    json.dumps(
                        {"action": "secret_updated", "secret": name, "value": value}
                    )
                )
                return True
            else:
                logger.error(
                    json.dumps(
                        {
                            "error": "Failed to update secret",
                            "secret": name,
                            "stderr": result.stderr,
                        }
                    )
                )
                return False
        except Exception as e:
            logger.error(
                json.dumps({"error": "Secret update failed", "exception": str(e)})
            )
            return False

    # Environment configuration
    env = {
        "PROJECT_ID": os.getenv("PROJECT_ID", "github-chatgpt-ggcloud"),
        "QDRANT_ACCOUNT_ID": os.getenv("QDRANT_ACCOUNT_ID"),
        "QDRANT_CLUSTER_ID": os.getenv("QDRANT_CLUSTER_ID"),
        "AUTO_STOP_MINUTES": int(os.getenv("AUTO_STOP_MINUTES", "60")),
    }

    # Handle QDRANT_API_KEY - it might be a secret reference or actual key
    api_key_env = os.getenv("QDRANT_API_KEY", "").strip()
    if api_key_env.startswith("projects/") and "/secrets/" in api_key_env:
        # This is a secret reference, extract the secret name
        secret_name = api_key_env.split("/secrets/")[1].split(":")[0]
        env["QDRANT_API_KEY"] = get_secret(secret_name)
    else:
        env["QDRANT_API_KEY"] = api_key_env

    # Get LAST_HIT from secret
    last_hit_value = get_secret("qdrant_idle_marker")
    env["LAST_HIT"] = int(last_hit_value or "0")

    # Log environment for debugging (without showing full API key)
    logger.info(
        json.dumps(
            {
                "env_check": {
                    "PROJECT_ID": env["PROJECT_ID"],
                    "QDRANT_ACCOUNT_ID": env["QDRANT_ACCOUNT_ID"],
                    "QDRANT_CLUSTER_ID": env["QDRANT_CLUSTER_ID"],
                    "api_key_length": (
                        len(env["QDRANT_API_KEY"]) if env["QDRANT_API_KEY"] else 0
                    ),
                    "api_key_prefix": (
                        env["QDRANT_API_KEY"][:10] if env["QDRANT_API_KEY"] else "none"
                    ),
                }
            }
        )
    )

    def call_qdrant(method, path, **kwargs):
        """Make authenticated request to Qdrant API with proper headers."""
        headers = {"Authorization": f"apikey {env['QDRANT_API_KEY']}"}
        headers.update(kwargs.get("headers", {}))
        kwargs["headers"] = headers

        url = f"{API_BASE}{path}"
        start_time = time.time()

        try:
            response = requests.request(method, url, timeout=60, **kwargs)
            elapsed_ms = (time.time() - start_time) * 1000

            logger.info(
                json.dumps(
                    {
                        "method": method,
                        "path": path,
                        "status_code": response.status_code,
                        "elapsed_ms": round(elapsed_ms, 2),
                    }
                )
            )

            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            elapsed_ms = (time.time() - start_time) * 1000
            logger.error(
                json.dumps(
                    {
                        "method": method,
                        "path": path,
                        "error": str(e),
                        "elapsed_ms": round(elapsed_ms, 2),
                    }
                )
            )
            raise

    def get_health():
        """Get cluster health status."""
        response = call_qdrant(
            "GET",
            f"/accounts/{env['QDRANT_ACCOUNT_ID']}/clusters/{env['QDRANT_CLUSTER_ID']}",
        )
        return response.json()

    def create_snapshot():
        """Create a backup snapshot."""
        payload = {"backup": {"name": f"autostop-{int(time.time())}"}}
        response = call_qdrant(
            "POST",
            f"/accounts/{env['QDRANT_ACCOUNT_ID']}/clusters/{env['QDRANT_CLUSTER_ID']}/backups",
            json=payload,
        )
        return response.json()

    def wait_backup(task_id):
        """Wait for backup task to complete."""
        start_time = time.time()
        while time.time() - start_time < 600:  # 10 minute timeout
            try:
                response = call_qdrant("GET", f"/tasks/{task_id}")
                task_data = response.json()
                status = task_data.get("status", "")

                logger.info(
                    json.dumps(
                        {"action": "wait_backup", "task_id": task_id, "status": status}
                    )
                )

                if status == "SUCCEEDED":
                    return True
                elif status == "FAILED":
                    raise Exception(f"Backup task failed: {task_data}")

                time.sleep(30)  # Poll every 30 seconds
            except Exception as e:
                logger.error(
                    json.dumps(
                        {"action": "wait_backup", "task_id": task_id, "error": str(e)}
                    )
                )
                time.sleep(30)

        raise TimeoutError(f"Backup task {task_id} timeout after 600s")

    def suspend_cluster():
        """Suspend the cluster."""
        response = call_qdrant(
            "POST",
            f"/accounts/{env['QDRANT_ACCOUNT_ID']}/clusters/{env['QDRANT_CLUSTER_ID']}:suspend",
        )
        return response.json()

    def resume_cluster():
        """Resume the cluster."""
        response = call_qdrant(
            "POST",
            f"/accounts/{env['QDRANT_ACCOUNT_ID']}/clusters/{env['QDRANT_CLUSTER_ID']}:resume",
        )
        return response.json()

    def wait_for_healthy():
        """Wait for cluster to reach HEALTHY status."""
        start_time = time.time()
        while time.time() - start_time < 600:  # 10 minute timeout
            try:
                cluster_data = get_health()
                phase = (
                    cluster_data.get("cluster", {}).get("state", {}).get("phase", "")
                )

                logger.info(
                    json.dumps(
                        {
                            "action": "wait_for_healthy",
                            "phase": phase,
                            "account": env["QDRANT_ACCOUNT_ID"],
                            "cluster": env["QDRANT_CLUSTER_ID"],
                        }
                    )
                )

                if phase == "HEALTHY":
                    return True

                time.sleep(30)  # Poll every 30 seconds
            except Exception as e:
                logger.error(
                    json.dumps({"action": "wait_for_healthy", "error": str(e)})
                )
                time.sleep(30)

        raise TimeoutError("Cluster did not reach HEALTHY state within 600s")

    def update_last_hit(value):
        """Update LAST_HIT value in secret manager."""
        return update_secret("qdrant_idle_marker", value)

    try:
        # Get action from query params or request body
        action = request.args.get("action") or (
            request.get_json(silent=True) or {}
        ).get("action")

        logger.info(
            json.dumps(
                {
                    "action": action or "ping",
                    "account": env["QDRANT_ACCOUNT_ID"],
                    "cluster": env["QDRANT_CLUSTER_ID"],
                }
            )
        )

        if action == "start":
            # Resume cluster and wait for healthy state
            logger.info(json.dumps({"phase": "resuming_cluster"}))
            resume_cluster()
            wait_for_healthy()

            logger.info(
                json.dumps(
                    {
                        "action": "start",
                        "phase": "HEALTHY",
                        "account": env["QDRANT_ACCOUNT_ID"],
                        "cluster": env["QDRANT_CLUSTER_ID"],
                    }
                )
            )
            return "Cluster resumed and healthy", 200

        elif action == "stop":
            # Create backup then suspend cluster
            logger.info(json.dumps({"phase": "creating_snapshot"}))
            snap_response = create_snapshot()
            task_id = snap_response.get("task_id")

            if task_id:
                wait_backup(task_id)

            logger.info(json.dumps({"phase": "suspending_cluster"}))
            suspend_cluster()

            logger.info(
                json.dumps(
                    {
                        "action": "stop",
                        "phase": "suspended_after_snapshot",
                        "account": env["QDRANT_ACCOUNT_ID"],
                        "cluster": env["QDRANT_CLUSTER_ID"],
                    }
                )
            )
            return "Cluster suspended after snapshot", 200

        elif action == "touch":
            # Reset idle timer
            new_last_hit = int(time.time())
            if update_last_hit(new_last_hit):
                logger.info(
                    json.dumps(
                        {
                            "action": "touch",
                            "last_hit": new_last_hit,
                            "account": env["QDRANT_ACCOUNT_ID"],
                            "cluster": env["QDRANT_CLUSTER_ID"],
                        }
                    )
                )
                return "Idle timer reset", 200
            else:
                return "Failed to update idle timer", 500

        elif action == "status":
            # Get cluster status
            cluster_data = get_health()
            state = (
                cluster_data.get("cluster", {}).get("state", {}).get("phase", "UNKNOWN")
            )
            endpoint = cluster_data.get("cluster", {}).get("endpoint", "")

            logger.info(
                json.dumps(
                    {
                        "action": "status",
                        "phase": state,
                        "endpoint": endpoint,
                        "account": env["QDRANT_ACCOUNT_ID"],
                        "cluster": env["QDRANT_CLUSTER_ID"],
                    }
                )
            )

            return json.dumps({"state": state, "endpoint": endpoint}), 200

        elif action is None:
            # Scheduler ping - check if auto-stop needed
            current_time = int(time.time())
            idle_duration = current_time - env["LAST_HIT"]

            if idle_duration > env["AUTO_STOP_MINUTES"] * 60:
                logger.info(
                    json.dumps(
                        {
                            "phase": "auto_stop_triggered",
                            "idle_duration": idle_duration,
                            "auto_stop_minutes": env["AUTO_STOP_MINUTES"],
                        }
                    )
                )

                # Create backup then suspend
                snap_response = create_snapshot()
                task_id = snap_response.get("task_id")

                if task_id:
                    wait_backup(task_id)

                suspend_cluster()

                logger.info(
                    json.dumps(
                        {
                            "action": "auto_stop",
                            "phase": "suspended_after_snapshot",
                            "account": env["QDRANT_ACCOUNT_ID"],
                            "cluster": env["QDRANT_CLUSTER_ID"],
                        }
                    )
                )
                return "Auto suspended after idle", 200
            else:
                logger.info(
                    json.dumps(
                        {
                            "action": "ping",
                            "status": "active",
                            "idle_duration": idle_duration,
                            "auto_stop_minutes": env["AUTO_STOP_MINUTES"],
                        }
                    )
                )
                return "still active", 200

        else:
            return "invalid action", 400

    except TimeoutError as e:
        logger.error(
            json.dumps(
                {
                    "error": str(e),
                    "account": env["QDRANT_ACCOUNT_ID"],
                    "cluster": env["QDRANT_CLUSTER_ID"],
                }
            )
        )
        return f"Timeout: {str(e)}", 504
    except Exception as e:
        logger.error(
            json.dumps(
                {
                    "error": str(e),
                    "account": env["QDRANT_ACCOUNT_ID"],
                    "cluster": env["QDRANT_CLUSTER_ID"],
                }
            )
        )
        return f"Error: {str(e)}", 500
