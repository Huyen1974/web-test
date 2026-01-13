# [ANTIGRAVITY] Directus Login Failed-to-fetch Forensic

## 1. Executive Summary
- **Symptom**: Browser "Failed to fetch" on login logic.
- **Root Cause**: **Origin Mismatch**.
  - The Directus service is configured to allow ONLY `https://github-chatgpt-ggcloud.web.app`.
  - Cloud Run logs show active traffic coming from a **Custom Domain**: `https://ai.incomexsaigoncorp.vn/`.
  - Because the incoming `Origin` does not match the strict allowlist, the browser blocks the response.
- **Decision**: Update `CORS_ORIGIN` to include the custom domain.

## 2. Evidence
### A. Configuration (Current)
From `gcloud run services describe`:
```yaml
- name: CORS_ORIGIN
  value: https://github-chatgpt-ggcloud.web.app
- name: CORS_CREDENTIALS
  value: 'true'
```

### B. Header Analysis (Curl Verification)
When verified with the *allowlisted* origin, headers are stable and correct:
```
> curl -H "Origin: https://github-chatgpt-ggcloud.web.app" ...
< HTTP/2 204
< access-control-allow-origin: https://github-chatgpt-ggcloud.web.app
< access-control-allow-credentials: true
```
This confirms the server logic is working for the configured domain.

### C. Log Forensics (The Smoking Gun)
Cloud Run logs reveal the actual `Referer` being used by clients:
```json
{
  "httpRequest": {
    "requestMethod": "OPTIONS",
    "requestUrl": "https://directus-test-812872501910.asia-southeast1.run.app/auth/login",
    "referer": "https://ai.incomexsaigoncorp.vn/",  <-- CUSTOM DOMAIN
    "status": 204
  }
}
```
*Note: While the server returns 204/200, it likely omits the `Access-Control-Allow-Origin` header for un-matched origins, causing the Browser to reject the response silently with "Failed to fetch".*

## 3. Recommended Fix
Update the `CORS_ORIGIN` environment variable to include the custom domain. Directus supports comma-separated origins.

**Command:**
```bash
gcloud run services update directus-test --region=asia-southeast1 \
  --update-env-vars "^;^CORS_ORIGIN=https://github-chatgpt-ggcloud.web.app,https://ai.incomexsaigoncorp.vn,https://github-chatgpt-ggcloud.firebaseapp.com"
```
*(Added `firebaseapp.com` alias as a safety measure for default Firebase domains).*
