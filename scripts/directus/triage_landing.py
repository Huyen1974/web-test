import os
import json
import urllib.request
import urllib.error
import urllib.parse
import subprocess
import ssl
import sys

API_URL = "https://directus-test-812872501910.asia-southeast1.run.app"

def get_access_token_via_login():
    def fetch_secret(name):
        return subprocess.check_output(
             ["gcloud", "secrets", "versions", "access", "latest", f"--secret={name}"],
             text=True
         ).strip()

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

def make_request(url, method="GET", data=None, token=None, check_ssl=False):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if data:
        headers["Content-Type"] = "application/json"
        
    req = urllib.request.Request(url, method=method, headers=headers)
    if data:
        req.data = json.dumps(data).encode("utf-8")
        
    ctx = ssl.create_default_context()
    if not check_ssl:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            if response.status == 204:
                return {}
            content_type = response.getheader("Content-Type", "")
            if "application/json" in content_type:
                 return json.load(response)
            return response.read().decode('utf-8')
            
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        try:
             json_err = json.loads(err_body)
             return {"error": e.code, "message": json_err}
        except:
             return {"error": e.code, "message": err_body}
    except Exception as e:
        return {"error": 500, "message": str(e)}

def get_settings(token):
    # Try fetching settings to find default role
    res = make_request(f"{API_URL}/items/directus_settings?limit=1", token=token)
    if "data" in res:
        return res["data"]
    return {}

def get_roles(token):
    res = make_request(f"{API_URL}/roles", token=token)
    if "data" in res:
        return {r["id"]: r for r in res["data"]}
    return {}

def get_user_sample(token):
    res = make_request(f"{API_URL}/users?limit=5&fields=id,email,role", token=token)
    if "data" in res:
        return res["data"]
    return []

def get_permissions(token, role_id):
    # If role_id is None, it's public. Filter needs null check or manual iteration if filter fails.
    # API filter for null: filter[role][_null]=true
    
    filter_query = ""
    if role_id:
        filter_query = f"?filter[role][_eq]={role_id}&limit=-1"
    else:
        filter_query = f"?filter[role][_null]=true&limit=-1"
        
    res = make_request(f"{API_URL}/permissions{filter_query}", token=token)
    if "data" in res:
        return res["data"]
    return []

def check_data_sanity(token):
    print("\n--- [Data Sanity Check] ---")
    
    # 1. Check Navigation IDs (Admin)
    for nav_id in ["main", "footer"]:
        res = make_request(f"{API_URL}/items/navigation/{nav_id}", token=token)
        if "data" in res:
            print(f"Navigation '{nav_id}': EXISTS (ID: {res['data'].get('id')})")
        else:
            print(f"Navigation '{nav_id}': MISSING or Error ({res})")

    # 2. Check Public Access (No Token)
    print("\n[Public Access Check]")
    for col in ["pages", "navigation"]:
        res = make_request(f"{API_URL}/items/{col}?limit=5")
        if "data" in res:
            count = len(res["data"])
            print(f"GET /items/{col}: 200 OK (Count: {count})")
        else:
             print(f"GET /items/{col}: ERROR {res.get('error')} - {res.get('message')}")

def analyze_role(token, role_name, role_id):
    print(f"\nAnalyzing Role: {role_name} (ID: {role_id})")
    perms = get_permissions(token, role_id)
    
    collections_interested = ["pages", "navigation", "navigation_items", "directus_files", "directus_users"]
    
    found_perms = {}
    for p in perms:
        col = p.get("collection")
        if col in collections_interested:
            found_perms[col] = p
            
    for col in collections_interested:
        p = found_perms.get(col)
        if p:
            action = p.get("action")
            fields = p.get("fields", [])
            print(f"  - {col}: {action.upper()} (Fields: {fields})")
        else:
            print(f"  - {col}: [NO PERMISSION]")

def main():
    print("--- [Directus Triage Audit] ---")
    
    token = get_access_token_via_login()
    if not token:
        print("Auth failed.")
        sys.exit(1)
        
    # 1. Discover Roles
    print("\n[Role Discovery]")
    settings = get_settings(token)
    public_registration_role = settings.get("public_registration_role")
    project_name = settings.get("project_name")
    
    print(f"Project Name: {project_name}")
    print(f"Public Registration Role (from settings): {public_registration_role}")
    
    all_roles = get_roles(token)
    # Print role names
    # for rid, rdata in all_roles.items():
    #    print(f"Role: {rdata.get('name')} ({rid})")
        
    user_sample = get_user_sample(token)
    print(f"User Sample: {len(user_sample)} users")
    for u in user_sample:
        rid = u.get("role")
        rname = all_roles.get(rid, {}).get("name", "Unknown")
        print(f"  - User {u.get('email')}: Role {rname} ({rid})")
        
    # 2. Analyze Permissions
    print("\n[Permission Audit]")
    
    # Public (Role None)
    analyze_role(token, "PUBLIC (Unauthenticated)", None)
    
    # Default User Role (if known)
    if public_registration_role:
        rname = all_roles.get(public_registration_role, {}).get("name", "Default Role")
        analyze_role(token, f"DEFAULT USER ({rname})", public_registration_role)
    elif user_sample:
        # Pick first non-admin? assuming admin has full access anyway.
        # Directus Admin role is usually strictly 'admin' property true, checking role permissions might be empty.
        # Let's verify a standard user role.
        target_uid = None
        target_rid = None
        for u in user_sample:
            # We don't easily know if it's admin role without checking role details 'admin_access'
            rid = u.get("role")
            rdata = all_roles.get(rid, {})
            if not rdata.get("admin_access", False):
                target_uid = u.get("id")
                target_rid = rid
                break
        
        if target_rid:
             rname = all_roles.get(target_rid, {}).get("name", "Sample User Role")
             analyze_role(token, f"SAMPLE USER ({rname})", target_rid)
        else:
            print("  Could not identify a non-admin user role to audit.")

    # 3. Data Sanity
    check_data_sanity(token)

if __name__ == "__main__":
    main()
