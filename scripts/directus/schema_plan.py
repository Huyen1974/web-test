import os
import re
import json
import urllib.request
import urllib.error

# Config
REPORT_PATH = "reports/CLAUDE__FRONTEND_AUTOPSY_SCHEMA_SPEC_REPORT.md"
API_URL = "https://directus.incomexsaigoncorp.vn"

def get_access_token_via_login():
    import ssl
    import json
    import urllib.request
    import subprocess
    
    # helper to fetch secret
    def fetch_secret(name):
        return subprocess.check_output(
             ["gcloud", "secrets", "versions", "access", "latest", f"--secret={name}"],
             text=True
         ).strip()

    email = os.environ.get("DIRECTUS_ADMIN_EMAIL") or fetch_secret("DIRECTUS_ADMIN_EMAIL_test")
    password = os.environ.get("DIRECTUS_ADMIN_PASSWORD") or fetch_secret("DIRECTUS_ADMIN_PASSWORD_test")
    
    url = f"{API_URL}/auth/login"
    data = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    
    # Bypass SSL
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            resp_data = json.load(response)
            return resp_data["data"]["access_token"]
    except Exception as e:
        print(f"Error logging in: {e}")
        return None

def read_spec(path):
    with open(path, "r") as f:
        content = f.read()
    
    # Extract JSON between ```json and ```
    match = re.search(r"```json\s*(.*?)\s*```", content, re.DOTALL)
    if not match:
        print(f"Error: No JSON block found in {path}")
        return None
    
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON spec: {e}")
        return None

import ssl

def fetch_live_collections(token):
    url = f"{API_URL}/collections"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    
    # Bypass SSL verification
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.load(response)
            return {c["collection"] for c in data["data"]}
    except Exception as e:
        print(f"Error fetching collections: {e}")
        return set()

def main():
    print("--- [Plan Directus Schema Apply] ---")
    
    # 1. Get Token
    token = get_access_token_via_login()
    if not token:
        print("CRITICAL: Failed to get Access Token via login.")
        return

    # 2. Read Spec
    spec = read_spec(REPORT_PATH)
    if not spec:
        return
    
    # Save extracted spec
    with open("scripts/directus/schema_spec.extracted.json", "w") as f:
        json.dump(spec, f, indent=2)
    print("Saved extracted spec to scripts/directus/schema_spec.extracted.json")

    # 3. Fetch Live
    live_collections = fetch_live_collections(token)
    print(f"Live Collections Found: {len(live_collections)}")
    
    # 4. Compare & Plan
    # Flatten spec collections from categories
    spec_collections = []
    categories = ["core", "blocks", "supporting_collections"]
    
    for cat in categories:
        if cat in spec:
            for collection_name, details in spec[cat].items():
                # Some keys might be objects with "collection" property, verify
                target = details.get("collection", collection_name)
                spec_collections.append(target)
    
    missing = []
    present = []
    
    # Categorize
    for name in spec_collections:
        if name in live_collections:
            present.append(name)
        else:
            missing.append(name)
            
    # 5. Dependency Ordering (Simple Heuristic: blocks_* first, then others)
    # Ref: M2A usually requires the related collection to exist.
    # Actually, Directus API allows creating collection without fields first, but M2A fields need related collection.
    # Plan: Create "blocks_*" first (level 1), then "pages"/"navigation" (level 2), then junction (if separate).
    
    plan = {
        "missing_count": len(missing),
        "present_count": len(present),
        "missing_collections": missing,
        "execution_phases": [
            {
                "phase": 1, 
                "description": "Create Block Collections (Dependencies)",
                "collections": [c for c in missing if c.startswith("block_")]
            },
            {
                "phase": 2, 
                "description": "Create Core Collections",
                "collections": [c for c in missing if not c.startswith("block_")]
            }
        ]
    }
    
    print(json.dumps(plan, indent=2))
    
    # Write Plan Output
    with open("scripts/directus/schema_plan.json", "w") as f:
        json.dump(plan, f, indent=2)

if __name__ == "__main__":
    main()
