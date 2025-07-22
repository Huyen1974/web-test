import json
import os
import time

import requests
from google.cloud import secretmanager


def handle(request):
    """Cloud Function entry point for managing Qdrant cluster."""

    # Initialize Secret Manager client
    client = secretmanager.SecretManagerServiceClient()

    def get_secret(name):
        """Get secret value from Secret Manager."""
        try:
            response = client.access_secret_version(
                name=f"projects/{os.getenv('PROJECT_ID')}/secrets/{name}/versions/latest"
            )
            return response.payload.data.decode("UTF-8")
        except Exception:
            return "0"  # Default for LAST_HIT

    # Environment configuration
    env = {
        "PROJECT_ID": os.getenv("PROJECT_ID", "github-chatgpt-ggcloud"),
        "QDRANT_ACCOUNT_ID": os.getenv("QDRANT_ACCOUNT_ID"),
        "QDRANT_CLUSTER_ID": os.getenv(
            "QDRANT_CLUSTER_ID", "529a17a6-01b8-4304-bc5c-b936aec8fca9"
        ),
        "QDRANT_API_KEY": get_secret("Qdrant_agent_data_N1D8R2vC0_5"),
        "LAST_HIT": int(get_secret("qdrant_idle_marker") or "0"),
        "COLLECTION_PROD": os.getenv("COLLECTION_PROD", "production_documents"),
        "COLLECTION_TEST": os.getenv("COLLECTION_TEST", "test_documents"),
        "AUTO_STOP_MINUTES": int(os.getenv("AUTO_STOP_MINUTES", "60")),
    }

    # Mock mode for testing
    if env["QDRANT_CLUSTER_ID"] == "MOCK":
        return json.dumps({"state": "RUNNING"}), 200

    headers = {"Authorization": f"Bearer {env['QDRANT_API_KEY']}"}

    def _post(path, payload=None):
        """Make authenticated POST request to Qdrant API with retry logic."""
        if payload is None:
            payload = {}
        for _ in range(3):
            try:
                r = requests.post(
                    "https://cloud.qdrant.io/api/v1" + path,
                    headers=headers,
                    json=payload,
                    timeout=60,
                )
                if r.status_code == 503:
                    time.sleep(5)
                    continue
                r.raise_for_status()
                return r.json()
            except requests.exceptions.RequestException as e:
                print(json.dumps({"error": str(e)}))
                raise
        raise Exception("Retry exhausted")

    def _wait_backup(bid):
        """Wait for backup to complete with timeout."""
        start = time.time()
        while time.time() - start < 600:
            try:
                b = requests.get(
                    f"https://cloud.qdrant.io/api/v1/cluster/backup/v1/accounts/{env['QDRANT_ACCOUNT_ID']}/backups/{bid}",
                    headers=headers,
                ).json()
                if b["backup"]["state"] == "SUCCEEDED":
                    return
                time.sleep(10)
            except Exception:
                pass
        raise TimeoutError("Backup timeout 600s")

    def _wait_phase(target):
        """Wait for cluster to reach target phase with timeout."""
        start = time.time()
        while time.time() - start < 600:
            try:
                c = requests.get(
                    f"https://cloud.qdrant.io/api/v1/cluster/v1/accounts/{env['QDRANT_ACCOUNT_ID']}/clusters/{env['QDRANT_CLUSTER_ID']}",
                    headers=headers,
                ).json()
                if c["cluster"]["state"]["phase"] == target:
                    return
                time.sleep(30)
            except Exception:
                pass
        raise TimeoutError("Poll phase timeout 600s")

    def update_last_hit(value):
        """Update LAST_HIT value in Secret Manager."""
        try:
            client.add_secret_version(
                parent=f"projects/{env['PROJECT_ID']}/secrets/qdrant_idle_marker",
                payload={"data": str(value).encode("UTF-8")},
            )
        except Exception:
            pass

    try:
        # Get action from query params or request body
        action = request.args.get("action") or (
            request.get_json(silent=True) or {}
        ).get("action")

        if action == "start":
            # Restart cluster and wait for healthy state
            _post(
                f"/cluster/v1/accounts/{env['QDRANT_ACCOUNT_ID']}/clusters/{env['QDRANT_CLUSTER_ID']}/restart"
            )
            _wait_phase("HEALTHY")
            print(json.dumps({"action": "start", "phase": "HEALTHY"}))
            return "Cluster resumed and healthy", 200

        elif action == "stop":
            # Create backup then suspend cluster
            snap = _post(
                f"/cluster/backup/v1/accounts/{env['QDRANT_ACCOUNT_ID']}/backups",
                {
                    "backup": {
                        "account_id": env["QDRANT_ACCOUNT_ID"],
                        "cluster_id": env["QDRANT_CLUSTER_ID"],
                        "name": f"autostop-{int(time.time())}",
                    }
                },
            )
            _wait_backup(snap["backup"]["id"])
            _post(
                f"/cluster/v1/accounts/{env['QDRANT_ACCOUNT_ID']}/clusters/{env['QDRANT_CLUSTER_ID']}/suspend"
            )
            print(json.dumps({"action": "stop", "status": "suspended after snapshot"}))
            return "Cluster suspended after snapshot", 200

        elif action == "touch":
            # Reset idle timer
            new_last_hit = time.time() + env["AUTO_STOP_MINUTES"] * 60
            update_last_hit(new_last_hit)
            print(json.dumps({"action": "touch", "last_hit": new_last_hit}))
            return "Idle timer reset", 200

        elif action == "status":
            # Get cluster status
            c = requests.get(
                f"https://cloud.qdrant.io/api/v1/cluster/v1/accounts/{env['QDRANT_ACCOUNT_ID']}/clusters/{env['QDRANT_CLUSTER_ID']}",
                headers=headers,
            ).json()
            print(
                json.dumps(
                    {
                        "action": "status",
                        "state": c["cluster"]["state"]["phase"],
                        "endpoint": c["cluster"]["endpoint"],
                    }
                )
            )
            return (
                json.dumps(
                    {
                        "state": c["cluster"]["state"]["phase"],
                        "endpoint": c["cluster"]["endpoint"],
                    }
                ),
                200,
            )

        elif action is None:
            # Scheduler ping - check if auto-stop needed
            if time.time() - env["LAST_HIT"] > env["AUTO_STOP_MINUTES"] * 60:
                print(json.dumps({"auto": "stop due to idle"}))
                # Create backup then suspend
                snap = _post(
                    f"/cluster/backup/v1/accounts/{env['QDRANT_ACCOUNT_ID']}/backups",
                    {
                        "backup": {
                            "account_id": env["QDRANT_ACCOUNT_ID"],
                            "cluster_id": env["QDRANT_CLUSTER_ID"],
                            "name": f"autostop-{int(time.time())}",
                        }
                    },
                )
                _wait_backup(snap["backup"]["id"])
                _post(
                    f"/cluster/v1/accounts/{env['QDRANT_ACCOUNT_ID']}/clusters/{env['QDRANT_CLUSTER_ID']}/suspend"
                )
                return "Auto suspended after idle", 200
            else:
                print(json.dumps({"ping": "active"}))
                return "still active", 200

        else:
            return "invalid action", 400

    except TimeoutError as e:
        print(json.dumps({"error": str(e)}))
        return f"Timeout: {str(e)}", 504
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        return f"Error: {str(e)}", 500


# TODO: Off-load long backup to Workflows if >540s Gen2 limit
# TODO: Resume+resize for scale-zero later
# TODO: Unit test helpers in utils.py
# TODO: Snapshot time ~2-3min
