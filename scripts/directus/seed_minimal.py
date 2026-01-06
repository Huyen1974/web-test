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

# Global variable, set in main()
API_URL = None

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
    # Try environment variables first, fall back to gcloud secrets
    email = os.environ.get("DIRECTUS_ADMIN_EMAIL")
    password = os.environ.get("DIRECTUS_ADMIN_PASSWORD")

    if not email or not password:
        try:
            email = email or fetch_secret("DIRECTUS_ADMIN_EMAIL")
            password = password or fetch_secret("DIRECTUS_ADMIN_PASSWORD")
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

    if "error" not in res:
        print(f"[SKIP] Navigation '{nav_id}' exists.")
        return True

    print(f"[INFO] Check '{nav_id}' got {res.get('error')}. Attempting Creation...")

    # Create
    print(f"[CREATING] Navigation '{nav_id}'...")
    payload = {"id": nav_id}

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
        "id": str(uuid.uuid4()),
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
    print(f"[CREATING] Navigation Item for '{nav_id}'...")

    payload = {
        "id": str(uuid.uuid4()),
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


# =============================================================================
# LEGAL PAGES (APPENDIX 16 Compliance)
# =============================================================================

LEGAL_PAGES = [
    {
        "permalink": "/privacy",
        "title": "Privacy Policy",
        "summary": "Our commitment to protecting your privacy and personal data.",
        "content": """# Privacy Policy

**Last Updated:** January 2026

## 1. Introduction

Welcome to Agency OS. We respect your privacy and are committed to protecting your personal data.

## 2. Information We Collect

We may collect the following types of information:
- Contact information (name, email address)
- Usage data (pages visited, features used)
- Technical data (IP address, browser type)

## 3. How We Use Your Information

We use your information to:
- Provide and improve our services
- Communicate with you about updates
- Ensure security and prevent fraud

## 4. Data Security

We implement appropriate security measures to protect your personal data.

## 5. Your Rights

You have the right to:
- Access your personal data
- Request correction or deletion
- Opt-out of marketing communications

## 6. Contact Us

For privacy-related inquiries, please contact us through our website.
""",
    },
    {
        "permalink": "/terms",
        "title": "Terms of Service",
        "summary": "Terms and conditions governing the use of our platform.",
        "content": """# Terms of Service

**Last Updated:** January 2026

## 1. Acceptance of Terms

By accessing and using Agency OS, you agree to be bound by these Terms of Service.

## 2. Use of Service

You agree to use the service only for lawful purposes and in accordance with these Terms.

## 3. User Accounts

You are responsible for maintaining the confidentiality of your account credentials.

## 4. Intellectual Property

All content and materials on this platform are protected by intellectual property laws.

## 5. Limitation of Liability

We shall not be liable for any indirect, incidental, or consequential damages.

## 6. Modifications

We reserve the right to modify these terms at any time. Continued use constitutes acceptance.

## 7. Governing Law

These terms shall be governed by applicable laws.

## 8. Contact

For questions about these Terms, please contact us through our website.
""",
    },
]


def upsert_legal_page(token, fields, page_config):
    """Create or skip a legal page (privacy, terms) if it doesn't exist."""
    slug_field = "permalink" if "permalink" in fields else "slug"
    permalink = page_config["permalink"]

    # Check if page exists
    res = make_request(
        f"{API_URL}/items/pages?filter[{slug_field}][_eq]={permalink}",
        token=token
    )

    if "data" in res and len(res["data"]) > 0:
        print(f"[SKIP] Legal page '{permalink}' already exists.")
        return res["data"][0]["id"]

    # Create page
    print(f"[CREATING] Legal page '{permalink}'...")
    payload = {
        "id": str(uuid.uuid4()),
        slug_field: permalink,
    }

    if "title" in fields:
        payload["title"] = page_config["title"]
    if "summary" in fields:
        payload["summary"] = page_config["summary"]
    if "status" in fields:
        payload["status"] = "published"

    res_create = make_request(
        f"{API_URL}/items/pages",
        method="POST",
        data=payload,
        token=token
    )

    if "data" in res_create:
        print(f"   [SUCCESS] Created '{permalink}' (ID: {res_create['data']['id']})")
        return res_create["data"]["id"]
    else:
        print(f"   [ERROR] Failed to create '{permalink}': {res_create}")
        return None


def seed_legal_pages(token, fields):
    """Seed all required legal pages (Privacy Policy, Terms of Service)."""
    print("\n--- [Legal Pages] ---")

    for page_config in LEGAL_PAGES:
        upsert_legal_page(token, fields, page_config)

def find_or_create_logo(token):
    """Find or import the Agency OS logo asset."""
    query = urllib.parse.quote(LOGO_TITLE)
    res = make_request(f"{API_URL}/files?filter[title][_eq]={query}&limit=1", token=token)
    if "data" in res and res["data"]:
        print(f"[SKIP] Logo asset already exists (ID: {res['data'][0]['id']})")
        return res["data"][0]["id"]

    print(f"[CREATING] Importing logo asset...")
    payload = {
        "url": LOGO_URL,
        "data": {
            "title": LOGO_TITLE,
        },
    }
    res_create = make_request(f"{API_URL}/files/import", method="POST", data=payload, token=token)
    if "data" in res_create:
        print(f"   [SUCCESS] Imported logo asset (ID: {res_create['data']['id']})")
        return res_create["data"]["id"]

    print(f"   [WARN] Failed to import logo asset: {res_create}")
    return None

def set_branding(token):
    """
    Set Directus branding using PATCH /settings endpoint.

    IMPORTANT: This uses the correct /settings endpoint, NOT /items/directus_settings.
    The /settings endpoint is the proper API for updating Directus project settings.
    """
    print("\n--- [Branding Configuration] ---")

    # Get or create logo
    logo_id = find_or_create_logo(token)

    branding_payload = {
        "project_name": "Agency OS",
        "project_descriptor": "Multi-Tenant CMS Platform",
        "project_url": API_URL,
    }

    # Add logo if available
    if logo_id:
        branding_payload["project_logo"] = logo_id

    res = make_request(
        f"{API_URL}/settings",
        method="PATCH",
        data=branding_payload,
        token=token
    )

    if "error" in res:
        print(f"[ERROR] Failed to set branding: {res}")
        return False

    print(f"[SUCCESS] Branding set: Project Name = 'Agency OS'")
    return True

def verify_branding(token):
    """Verify branding is set correctly (authenticated request)."""
    print("\n--- [Branding Verification] ---")

    res = make_request(f"{API_URL}/settings", token=token)

    if "error" in res:
        print(f"[ERROR] Could not verify branding: {res}")
        return False

    settings = res.get("data", {})
    project_name = settings.get("project_name", "UNKNOWN")
    print(f"Current Project Name: '{project_name}'")

    if project_name == "Agency OS":
        print("[PASS] Branding verified!")
        return True
    else:
        print(f"[WARN] Expected 'Agency OS', got '{project_name}'")
        return False

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
    req.add_header("User-Agent", "Antigravity-Seed-Verifier/1.0")

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            html = response.read().decode('utf-8')
            print(f"Web Response: {response.code} OK")

            snippet = html[:500].replace("\n", " ")
            print(f"Snippet: {snippet}...")

            if "Home Page" in html or "Home" in html:
                print("   [FOUND] 'Home' text found in HTML.")
            else:
                print("   [WARN] 'Home' text NOT found. Page might still be blank or loading JS.")
    except Exception as e:
        print(f"Web Smoke Test Failed: {e}")


def main():
    global API_URL
    print("--- [Minimal Content Seed] ---")

    API_URL = get_api_url()

    # 1. Auth
    token = get_access_token_via_login()
    if not token:
        print("Auth failed.")
        sys.exit(1)

    # 2. Set Branding (CRITICAL: Uses PATCH /settings - the correct endpoint)
    set_branding(token)

    # 3. Introspection
    print("\nIntrospecting Schema...")
    fields_nav = get_collection_fields(token, "navigation")
    fields_page = get_collection_fields(token, "pages")
    fields_nav_items = get_collection_fields(token, "navigation_items")

    print(f"Fields (Navigation): {list(fields_nav)}")
    print(f"Fields (Pages): {list(fields_page)}")

    # 4. Create Navigation
    upsert_navigation(token, "main", fields_nav)
    upsert_navigation(token, "footer", fields_nav)

    # 5. Create Home Page
    page_id = upsert_home_page(token, fields_page)

    # 6. Connect Nav Items
    if fields_nav_items:
        create_nav_item(token, fields_nav_items, "main", page_id)
    else:
        print("[WARN] navigation_items collection not found or no fields.")

    # 7. Seed Legal Pages (Privacy Policy, Terms of Service)
    seed_legal_pages(token, fields_page)

    # 8. Verify
    check_public_health()
    verify_branding(token)

if __name__ == "__main__":
    main()
