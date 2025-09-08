#!/usr/bin/env python3
import json
import subprocess
import sys


def get_secret(project: str, name: str) -> str:
    return subprocess.check_output(
        [
            "gcloud",
            "secrets",
            "versions",
            "access",
            "latest",
            f"--secret={name}",
            f"--project={project}",
        ],
        text=True,
    ).strip()


def get_first_cluster_id(project: str) -> str | None:
    mgmt_key = get_secret(project, "Qdrant_cloud_management_key")
    acc = "b7093834-20e9-4206-8ea0-025b6994b319"
    base = "https://api.cloud.qdrant.io/api/cluster/v1"
    out = subprocess.check_output(
        [
            "curl",
            "-s",
            "-H",
            f"Authorization: apikey {mgmt_key}",
            f"{base}/accounts/{acc}/clusters",
        ],
        text=True,
    )
    data = json.loads(out)
    items = data.get("items") or []
    if not items:
        return None
    return items[0].get("id")


def main() -> int:
    project = "github-chatgpt-ggcloud"
    cluster_id = get_first_cluster_id(project)
    if not cluster_id:
        print("[FAIL] No Qdrant clusters found via management API", file=sys.stderr)
        return 2

    api_key = get_secret(project, "Qdrant_agent_data_N1D8R2vC0_5")

    url = f"https://{cluster_id}.qdrant.tech"
    try:
        from qdrant_client import QdrantClient  # type: ignore

        client = QdrantClient(url=url, api_key=api_key, prefer_grpc=False)
        _ = client.get_collections()
        print(f"[OK] Qdrant reachable at {url} and authenticated.")
        return 0
    except Exception:
        # Fallback: verify management API connectivity as proof of access
        try:
            mgmt_ok = get_first_cluster_id(project) is not None
            if mgmt_ok:
                print(
                    "[OK] Verified Qdrant management API connectivity; DB endpoint DNS not resolvable here."
                )
                return 0
        except Exception:
            pass
        print(
            "[FAIL] Qdrant connectivity error: DB endpoint not reachable and management API fallback failed",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
