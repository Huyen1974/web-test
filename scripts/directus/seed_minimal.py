import os
import json
import urllib.request
import urllib.error
import urllib.parse
import subprocess
import ssl
import sys
import uuid

LOGO_TITLE = "Agency OS Logo"
LOGO_URL = "https://placehold.co/400x100/ffffff/000000/png?text=Agency+OS"

def normalize_url(url):
    return url.rstrip("/")

def get_api_url():
    url = os.environ.get("DIRECTUS_URL") or os.environ.get("NUXT_PUBLIC_DIRECTUS_URL")
    if not url:
        print("Missing required environment variable: DIRECTUS_URL or NUXT_PUBLIC_DIRECTUS_URL")
        sys.exit(1)
    return normalize_url(url)

def get_web_url():
    return os.environ.get("NUXT_PUBLIC_WEB_URL") or os.environ.get("NUXT_PUBLIC_SITE_URL")

def fetch_secret(name):
    try:
        value = subprocess.check_output(
            ["gcloud", "secrets", "versions", "access", "latest", f"--secret={name}"],
            text=True,
        ).strip()
        if not value:
            raise RuntimeError("Secret is empty")
        return value
    except Exception as e:
        raise RuntimeError(f"Failed to fetch secret {name}: {e}")

def get_access_token_via_login():
    print("Authenticating...")
    try:
        email = fetch_secret("DIRECTUS_ADMIN_EMAIL")
        password = fetch_secret("DIRECTUS_ADMIN_PASSWORD")
    except Exception as e:
        print(f"Error fetching secrets: {e}")
        return None

    api_url = get_api_url()
    url = f"{api_url}/auth/login"
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
    web_url = get_web_url()
    if not web_url:
        print("\n[WARN] WEB_URL not set; skipping web smoke check.")
        return

    print(f"\nChecking Web URL: {web_url}")
    req = urllib.request.Request(web_url)
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

def find_or_create_logo(token):
    query = urllib.parse.quote(LOGO_TITLE)
    res = make_request(f"{API_URL}/files?filter[title][_eq]={query}&limit=1", token=token)
    if "data" in res and res["data"]:
        return res["data"][0]["id"]

    payload = {
        "url": LOGO_URL,
        "data": {
            "title": LOGO_TITLE,
        },
    }
    res_create = make_request(f"{API_URL}/files/import", method="POST", data=payload, token=token)
    if "data" in res_create:
        print(f"[SUCCESS] Imported logo asset (ID: {res_create['data']['id']})")
        return res_create["data"]["id"]

    print(f"[ERROR] Failed to import logo asset: {res_create}")
    sys.exit(1)

def update_directus_settings(token):
    project_url = get_api_url()
    logo_id = find_or_create_logo(token)

    payload = {
        "project_name": "Agency OS",
        "project_url": project_url,
        "project_logo": logo_id,
    }

    res = make_request(f"{API_URL}/items/directus_settings?limit=1", token=token)
    settings = res.get("data")
    if isinstance(settings, list) and settings:
        settings_id = settings[0].get("id")
        if settings_id:
            res_update = make_request(
                f"{API_URL}/items/directus_settings/{settings_id}",
                method="PATCH",
                data=payload,
                token=token,
            )
            if "data" in res_update:
                print("[SUCCESS] Updated directus_settings branding.")
                return
            print(f"[ERROR] Failed to update settings: {res_update}")
            sys.exit(1)

    res_update = make_request(f"{API_URL}/items/directus_settings", method="PATCH", data=payload, token=token)
    if "data" in res_update:
        print("[SUCCESS] Updated directus_settings branding (singleton).")
        return

    res_create = make_request(f"{API_URL}/items/directus_settings", method="POST", data=payload, token=token)
    if "data" in res_create:
        print("[SUCCESS] Created directus_settings branding.")
        return

    print(f"[ERROR] Failed to apply branding to directus_settings: {res_create}")
    sys.exit(1)


def main():
    print("--- [Minimal Content Seed] ---")
    global API_URL
    API_URL = get_api_url()
    
    # 1. Auth
    token = get_access_token_via_login()
    if not token:
        print("Auth failed.")
        sys.exit(1)

    # 1b. Branding
    update_directus_settings(token)
        
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
