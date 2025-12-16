import os
import json
import urllib.request
import urllib.error
import subprocess
import ssl
import sys
import hashlib

API_URL = "https://directus-test-812872501910.asia-southeast1.run.app"
OUTPUT_FILE = "directus/snapshot.json"

def get_access_token_via_login():
    def fetch_secret(name):
        return subprocess.check_output(
             ["gcloud", "secrets", "versions", "access", "latest", f"--secret={name}"],
             text=True
         ).strip()
    
    # Try fetching token secret first? No, explicit instruction was "Prefer token... If needed login". 
    # But we know token secret is stale. Let's just go straight to login for reliability.
    print("Authenticating...")
    try:
        email = os.environ.get("DIRECTUS_ADMIN_EMAIL") or fetch_secret("DIRECTUS_ADMIN_EMAIL_test")
        password = os.environ.get("DIRECTUS_ADMIN_PASSWORD") or fetch_secret("DIRECTUS_ADMIN_PASSWORD_test")
    except Exception as e:
        print(f"Error fetching secrets: {e}")
        return None
    
    url = f"{API_URL}/auth/login"
    data = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    
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

def fetch_snapshot(token):
    url = f"{API_URL}/schema/snapshot"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            return json.load(response)
    except Exception as e:
        print(f"Error fetching snapshot: {e}")
        return None

def main():
    print("--- [Directus Schema Snapshot] ---")
    
    # 1. Auth
    token = get_access_token_via_login()
    if not token:
        print("CRITICAL: Auth failed.")
        sys.exit(1)
        
    # 2. Fetch
    print("Fetching snapshot...")
    snapshot = fetch_snapshot(token)
    if not snapshot:
        print("CRITICAL: Failed to download snapshot.")
        sys.exit(1)
        
    # 3. Save
    with open(OUTPUT_FILE, "w") as f:
        json.dump(snapshot, f, indent=2)
    print(f"Snapshot saved to {OUTPUT_FILE}")
    
    # 4. Verify
    print("Verifying content...")
    
    # It's a snapshot, structure is usually { "version": ..., "collections": [...], "fields": [...], ... }
    # Let's check for key collections in the list of collections or fields
    
    content_str = json.dumps(snapshot)
    required_keys = ["pages", "navigation", "pages_blocks", "block_hero"]
    
    missing = []
    for key in required_keys:
        if key not in content_str:
            missing.append(key)
            
    if missing:
        print(f"[FAIL] Sanity check failed. Missing keys in snapshot: {missing}")
        sys.exit(1)
    else:
        print(f"[PASS] Sanity check passed. Found: {required_keys}")
        
    # Stats
    size = os.path.getsize(OUTPUT_FILE)
    with open(OUTPUT_FILE, "rb") as f:
        sha = hashlib.sha256(f.read()).hexdigest()
        
    print(f"File Size: {size} bytes")
    print(f"SHA256: {sha}")

if __name__ == "__main__":
    main()
