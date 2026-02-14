import os
import json
import urllib.request
import urllib.error
import subprocess
import ssl
import sys

API_URL = "https://directus.incomexsaigoncorp.vn"
REQUIRED_PUBLIC_COLLECTIONS = [
    "pages", "navigation", "navigation_items", "globals", "forms", "seo",
    "pages_blocks", "block_hero", "block_faqs", "block_richtext", "block_testimonials", 
    "block_quote", "block_cta", "block_form", "block_logocloud", "block_team", 
    "block_html", "block_video", "block_gallery", "block_steps", "block_columns", 
    "block_divider", "block_button_groups", "block_buttons", "testimonials", "posts",
    "pages_blog", "pages_projects"
    # Exclude team/categories as they failed creation
]

def get_access_token_via_login():
    def fetch_secret(name):
        return subprocess.check_output(
             ["gcloud", "secrets", "versions", "access", "latest", f"--secret={name}"],
             text=True
         ).strip()
    
    print("Authenticating Admin...")
    email = os.environ.get("DIRECTUS_ADMIN_EMAIL") or fetch_secret("DIRECTUS_ADMIN_EMAIL_test")
    password = os.environ.get("DIRECTUS_ADMIN_PASSWORD") or fetch_secret("DIRECTUS_ADMIN_PASSWORD_test")
    
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

def check_public_read(collection):
    url = f"{API_URL}/items/{collection}?limit=1"
    req = urllib.request.Request(url)
    # NO AUTH HEADER
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            return response.getcode()
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:
        print(f"Error checking {collection}: {e}")
        return 500

def get_public_role_id(token):
    # Public role is usually null, or we can check via /roles?
    # Wait, in Directus permissions, role IS null for public.
    # But to apply permissions, we POST to /permissions.
    # If the role field is null, it means public.
    return None

def fetch_permissions(token):
    url = f"{API_URL}/permissions?limit=-1"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    with urllib.request.urlopen(req, context=ctx) as response:
         data = json.load(response)
         return data["data"]

def grant_public_read(token, collection):
    url = f"{API_URL}/permissions"
    payload = {
        "role": None, # Public
        "collection": collection,
        "action": "read",
        "permissions": {}, # Full access
        "fields": ["*"]
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            return True
    except urllib.error.HTTPError as e:
        print(f"   [ERROR] Grant read to {collection} failed: {e.code} - {e.read().decode()}")
        return False

def main():
    print("--- [Verify Public Permissions] ---")
    
    # 1. Smoke Test
    failing_collections = []
    
    for col in ["pages", "navigation"]:
        code = check_public_read(col)
        print(f"GET /items/{col} -> {code}")
        if code != 200:
            failing_collections.append(col)
            
    # Quick check logic: if pages/nav fail, likely all new ones fail
    if failing_collections:
        print("\n[AUTO-FIX] Detected 403 Forbidden. Applying Public READ permissions...")
        
        token = get_access_token_via_login()
        if not token:
            print("CRITICAL: Failed to get admin token for fix.")
            sys.exit(1)
            
        # Check existing permissions to avoid dupes (though POST might just dup or error)
        # Better to just try create.
        
        for col in REQUIRED_PUBLIC_COLLECTIONS:
            # We blindly try to add permission. 
            # Ideally we check existence first but simplified logic:
            print(f"   Granting READ to {col}...")
            grant_public_read(token, col)
            
        print("\n[RE-VERIFY] Checking access again...")
        for col in ["pages", "navigation"]:
            code = check_public_read(col)
            print(f"GET /items/{col} -> {code}")
    else:
        print("\n[SUCCESS] Public access verified.")

if __name__ == "__main__":
    main()
