#!/usr/bin/env python3
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


def main() -> int:
    project = "github-chatgpt-ggcloud"
    api_key = get_secret(project, "OPENAI_API_KEY")

    try:
        from openai import OpenAI  # type: ignore

        client = OpenAI(api_key=api_key)
        models = list(client.models.list())
        if not models:
            print("[FAIL] OpenAI models list is empty", file=sys.stderr)
            return 2
        print("[OK] OpenAI connectivity verified (models.list).")
        return 0
    except Exception as e:  # pragma: no cover
        print(f"[FAIL] OpenAI connectivity error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

