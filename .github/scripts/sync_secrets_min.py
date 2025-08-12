#!/usr/bin/env python3
"""
Minimal secrets sync script for agent-data repos.
Reads PAT from file, fetches target repo public key, seals secrets with libsodium, and syncs via GitHub API.
"""

import argparse
import json
import os
import sys

import requests
from nacl import public


def load_manifest(manifest_path):
    """Load secrets manifest from JSON file."""
    with open(manifest_path) as f:
        return json.load(f)


def load_pat(pat_file_path):
    """Load PAT from file."""
    with open(pat_file_path) as f:
        return f.read().strip()


def get_repo_public_key(repo, pat):
    """Get repository's public key for secrets encryption."""
    url = f"https://api.github.com/repos/{repo}/actions/secrets/public-key"
    headers = {
        "Authorization": f"token {pat}",
        "Accept": "application/vnd.github.v3+json",
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise Exception(
            f"Failed to get public key: {response.status_code} {response.text}"
        )

    return response.json()


def encrypt_secret(public_key, secret_value):
    """Encrypt secret value using repository's public key."""
    from base64 import b64decode

    public_key_bytes = b64decode(public_key)
    public_key_obj = public.PublicKey(public_key_bytes)
    box = public.SealedBox(public_key_obj)
    encrypted = box.encrypt(secret_value.encode("utf-8"))
    from base64 import b64encode

    return b64encode(encrypted).decode("utf-8")


def upsert_secret(repo, secret_name, encrypted_value, key_id, pat):
    """Upsert a secret to the repository."""
    url = f"https://api.github.com/repos/{repo}/actions/secrets/{secret_name}"
    headers = {
        "Authorization": f"token {pat}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
    }

    data = {"encrypted_value": encrypted_value, "key_id": key_id}

    response = requests.put(url, headers=headers, data=json.dumps(data))
    return response.status_code, response.text


def main():
    parser = argparse.ArgumentParser(description="Sync secrets to target repository")
    parser.add_argument("--repo", required=True, help="Target repository (owner/name)")
    parser.add_argument("--manifest", required=True, help="Secrets manifest JSON file")
    parser.add_argument("--pat-file", required=True, help="File containing GitHub PAT")

    args = parser.parse_args()

    try:
        # Load configuration
        manifest = load_manifest(args.manifest)
        pat = load_pat(args.pat_file)

        # Get target repository's public key
        public_key_info = get_repo_public_key(args.repo, pat)
        public_key = public_key_info["key"]
        key_id = public_key_info["key_id"]

        # Sync each secret
        results = {}
        for secret_name, secret_value in manifest["secrets"].items():
            try:
                # Handle special case for reading from file
                if secret_value.startswith(
                    "<READ_FROM_FILE:"
                ) and secret_value.endswith(">"):
                    file_path = secret_value[16:-1]  # Remove <READ_FROM_FILE: and >
                    with open(file_path) as f:
                        secret_value = f.read().strip()

                # Encrypt and upsert
                encrypted_value = encrypt_secret(public_key, secret_value)
                status_code, response_text = upsert_secret(
                    args.repo, secret_name, encrypted_value, key_id, pat
                )

                results[secret_name] = {
                    "status_code": status_code,
                    "success": status_code in [201, 204],
                    "response": response_text,
                }

                if status_code not in [201, 204]:
                    print(
                        f"Failed to sync {secret_name}: {status_code} {response_text}"
                    )

            except Exception as e:
                results[secret_name] = {
                    "status_code": None,
                    "success": False,
                    "error": str(e),
                }
                print(f"Error syncing {secret_name}: {e}")

        # Write results
        result_file = f".ci/p169h/sync_result_{args.repo.replace('/', '_')}.json"
        os.makedirs(os.path.dirname(result_file), exist_ok=True)
        with open(result_file, "w") as f:
            json.dump(results, f, indent=2)

        # Exit with error if any secret failed
        if not all(result["success"] for result in results.values()):
            sys.exit(1)

        print(f"Successfully synced {len(results)} secrets to {args.repo}")

    except Exception as e:
        print(f"Fatal error: {e}")
        # Write error to file
        error_file = ".ci/p169h/sync_error.json"
        os.makedirs(os.path.dirname(error_file), exist_ok=True)
        with open(error_file, "w") as f:
            json.dump({"error": str(e)}, f, indent=2)
        sys.exit(1)


if __name__ == "__main__":
    main()
