import os
import json
import urllib.request
import urllib.error
import urllib.parse
import subprocess
import ssl
import sys
import uuid

API_URL = "https://directus-test-812872501910.asia-southeast1.run.app"
WEB_URL = "https://github-chatgpt-ggcloud.web.app"

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
            return {"error": e.code, "message": err_body}
        except:
             return {"error": e.code, "message": err_body}
    except Exception as e:
        return {"error": 500, "message": str(e)}

def get_collection_fields(token, collection):
    res = make_request(f"{API_URL}/fields/{collection}", token=token)
    if "data" in res:
        return {f["field"] for f in res["data"]}
    return set()

def upsert_navigation(token, nav_id, fields):
    # Check existence
    res = make_request(f"{API_URL}/items/navigation/{nav_id}", token=token)
    
    exists = False
    if "error" not in res:
         print(f"[SKIP] Navigation '{nav_id}' exists.")
         return True
    
    # If 404 (Not Found) or 403 (Forbidden - maybe implying not found/no access to missing item), try Create.
    # Note: 403 on specific item GET usually implies RLS or item doesn't exist and we lack create? 
    # But we are Admin.
    print(f"[INFO] Check '{nav_id}' got {res.get('error')}. Attempting Creation...")
    
    # Create
    print(f"[CREATING] Navigation '{nav_id}'...")
    payload = {"id": nav_id}
    
    # Add basic fields if they exist
    if "title" in fields:
        payload["title"] = nav_id.capitalize() + " Navigation"
    if "status" in fields:
        payload["status"] = "published"
        
    res_create = make_request(f"{API_URL}/items/navigation", method="POST", data=payload, token=token)
    if "data" in res_create:
        print(f"   [SUCCESS] Created navigation '{nav_id}'")
        return True
    else:
        print(f"   [ERROR] Failed to create: {res_create}")
        return False

def upsert_home_page(token, fields):
    slug_field = "permalink" if "permalink" in fields else "slug"
    if slug_field not in fields:
        print(f"[WARN] No suitable slug field found in pages (have: {fields})")
        return None
        
    # Search
    res = make_request(f"{API_URL}/items/pages?filter[{slug_field}][_eq]=/", token=token)
    
    if "data" in res and len(res["data"]) > 0:
        print(f"[SKIP] Home Page ('{slug_field}'='/') exists.")
        return res["data"][0]["id"]
    
    # Create
    print(f"[CREATING] Home Page...")
    payload = {
        "id": str(uuid.uuid4()), # Generate explicit UUID
        slug_field: "/",
    }
    if "title" in fields:
        payload["title"] = "Home Page"
    if "status" in fields:
        payload["status"] = "published"
    
    res_create = make_request(f"{API_URL}/items/pages", method="POST", data=payload, token=token)
    if "data" in res_create:
        print(f"   [SUCCESS] Created Home Page (ID: {res_create['data']['id']})")
        return res_create['data']['id']
    else:
        print(f"   [ERROR] Failed to create Home Page: {res_create}")
        return None

def create_nav_item(token, fields, nav_id, page_id=None):
    # Check duplicates? For now just create.
    print(f"[CREATING] Navigation Item for '{nav_id}'...")
    
    payload = {
        "id": str(uuid.uuid4()), # Explicit UUID
        "navigation": nav_id, 
    }
    
    if "title" in fields:
        payload["title"] = "Home"
    if "label" in fields:
        payload["label"] = "Home"
        
    if page_id and "page" in fields:
        payload["page"] = page_id
    elif "url" in fields:
        payload["url"] = "/"
    else:
        print(f"   [WARN] No 'page' or 'url' field. Metadata: {fields}")
    
    if "sort" in fields:
        payload["sort"] = 1
        
    res_create = make_request(f"{API_URL}/items/navigation_items", method="POST", data=payload, token=token)
    if "data" in res_create:
        print(f"   [SUCCESS] Created Nav Item (ID: {res_create['data']['id']})")
        return True
    else:
        print(f"   [ERROR] Create Nav Item failed: {res_create}")
        return True

def check_public_health():
    print("\n--- [Public Verification] ---")
    
    # 1. API Smoke
    for col in ["pages", "navigation"]:
        url = f"{API_URL}/items/{col}?limit=5"
        try:
            req = urllib.request.Request(url)
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            with urllib.request.urlopen(req, context=ctx) as response:
                data = json.load(response)
                count = len(data.get("data", []))
                print(f"GET /items/{col} -> 200 OK (Count: {count})")
        except Exception as e:
            print(f"GET /items/{col} -> FAILED: {e}")

    # 2. Web Smoke
    print(f"\nChecking Web URL: {WEB_URL}")
    req = urllib.request.Request(WEB_URL)
    # fake user agent to be nice
    req.add_header("User-Agent", "Antigravity-Seed-Verifier/1.0")
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            html = response.read().decode('utf-8')
            print(f"Web Response: {response.code} OK")
            
            # Check for indications of content
            snippet = html[:500].replace("\n", " ")
            print(f"Snippet: {snippet}...")
            
            if "Home Page" in html or "Home" in html:
                print("   [FOUND] 'Home' text found in HTML.")
            else:
                print("   [WARN] 'Home' text NOT found. Page might still be blank or loading JS.")
    except Exception as e:
        print(f"Web Smoke Test Failed: {e}")


def main():
    print("--- [Minimal Content Seed] ---")
    
    # 1. Auth
    token = get_access_token_via_login()
    if not token:
        print("Auth failed.")
        sys.exit(1)
        
    # 2. Introspection
    print("\nIntrospecting Schema...")
    fields_nav = get_collection_fields(token, "navigation")
    fields_page = get_collection_fields(token, "pages")
    fields_nav_items = get_collection_fields(token, "navigation_items")
    
    print(f"Fields (Navigation): {list(fields_nav)}")
    print(f"Fields (Pages): {list(fields_page)}")
    
    # 3. Create Navigation
    upsert_navigation(token, "main", fields_nav)
    upsert_navigation(token, "footer", fields_nav)
    
    # 4. Create Home Page
    page_id = upsert_home_page(token, fields_page)
    
    # 5. Connect Nav Items
    if fields_nav_items:
        # Check if items already exist for 'main'? 
        # For minimal seed, assume if we created main, we should create item?
        # Or Just create one.
        create_nav_item(token, fields_nav_items, "main", page_id)
    else:
        print("[WARN] navigation_items collection not found or no fields.")

    # 6. Verify
    check_public_health()

if __name__ == "__main__":
    main()
