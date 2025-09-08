#!/usr/bin/env python3
import json
import subprocess
import sys


def run(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, text=True).strip()


def main() -> int:
    project = "github-chatgpt-ggcloud"
    region = "asia-southeast1"
    service = "agent-data-test"

    # Get Cloud Run service description
    svc_json = run(
        [
            "gcloud",
            "run",
            "services",
            "describe",
            service,
            "--region",
            region,
            "--project",
            project,
            "--format",
            "json",
        ]
    )
    svc = json.loads(svc_json)
    sa = (((svc.get("spec") or {}).get("template") or {}).get("spec") or {}).get(
        "serviceAccount"
    ) or None
    if not sa:
        # Default compute service account
        proj_number = run(
            [
                "gcloud",
                "projects",
                "describe",
                project,
                "--format",
                "value(projectNumber)",
            ]
        )
        sa = f"{proj_number}-compute@developer.gserviceaccount.com"

    # Check IAM roles on project policy
    policy_json = run(
        ["gcloud", "projects", "get-iam-policy", project, "--format", "json"]
    )
    policy = json.loads(policy_json)
    want_roles = {
        "roles/secretmanager.secretAccessor",
    }
    have_roles = set()
    for b in policy.get("bindings", []):
        if f"serviceAccount:{sa}" in set(b.get("members", [])):
            have_roles.add(b.get("role"))

    missing = want_roles - have_roles
    if missing:
        print(
            f"[FAIL] SA {sa} missing roles: {', '.join(sorted(missing))}",
            file=sys.stderr,
        )
        return 1

    print(f"[OK] Service Account {sa} has required roles.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
