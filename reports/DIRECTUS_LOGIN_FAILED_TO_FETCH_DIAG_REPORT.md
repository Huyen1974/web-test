# Directus Login "Failed to fetch" Diagnostic Report
**CLI Name:** CLI.CURSOR.DIAGNOSE-DIRECTUS-AUTH-LOGIN-FAILED_TO_FETCH.v1.0
**Date:** 2025-12-15
**Repo:** Huyen1974/web-test

## Problem Summary
Browser shows "Failed to fetch / no response" when attempting login to Directus `/auth/login` endpoint from Firebase domain `https://github-chatgpt-ggcloud.web.app`.

## Evidence-Based Diagnosis

### A. Runtime Configuration Check ✅
**Status:** PASSED
- Directus base URL correctly configured in `nuxt.config.ts`:
  ```typescript
  rest: {
    baseUrl: process.env.NUXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL || 'https://directus-test-812872501910.asia-southeast1.run.app'
  }
  ```
- Production URL matches the failing endpoint: `https://directus-test-812872501910.asia-southeast1.run.app`

### B. Server Reachability Tests ✅
**Status:** PASSED

**`/server/ping` Test:**
```
HTTP/2 200
x-powered-by: Directus
content-type: text/html; charset=utf-8
content-length: 4

pong
```

**`/server/health` Test:**
```
HTTP/2 200
x-powered-by: Directus
content-type: application/health+json; charset=utf-8
content-length: 15

{"status":"ok"}
```

### C. CORS Preflight Test ⚠️
**Status:** FAILED - Missing CORS Headers

**OPTIONS Request:**
```bash
curl -i -X OPTIONS "https://directus-test-812872501910.asia-southeast1.run.app/auth/login" \
  -H "Origin: https://github-chatgpt-ggcloud.web.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

**Response:**
```
HTTP/2 200
x-powered-by: Directus
allow: POST
content-type: text/html; charset=utf-8
content-length: 4

POST
```

**Issue:** No CORS headers present (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, etc.)

### D. POST Request Test ⚠️
**Status:** FAILED - Missing CORS Headers

**POST Request:**
```bash
curl -i -X POST "https://directus-test-812872501910.asia-southeast1.run.app/auth/login" \
  -H "Origin: https://github-chatgpt-ggcloud.web.app" \
  -H "Content-Type: application/json" \
  --data '{"email":"x","password":"y"}'
```

**Response:**
```
HTTP/2 400
x-powered-by: Directus
content-type: application/json; charset=utf-8
content-length: 159

{"errors":[{"message":"Invalid payload. \"email\" must be a valid email.","extensions":{"reason":"\"email\" must be a valid email","code":"INVALID_PAYLOAD"}}]}
```

**Issue:** Response contains validation error (expected), but no CORS headers present.

### E. Cloud Run Service Configuration ✅
**Status:** PASSED

**Service List:**
```
✔  directus-test    asia-southeast1  https://directus-test-812872501910.asia-southeast1.run.app    nmhuyen@gmail.com  2025-11-27T11:08:05.727023Z
```

**Service Description:**
- Ingress: `all` (allows all traffic)
- Status: Active and running

### F. Cloud Run IAM Policy ✅
**Status:** PASSED

**Invoker Permissions:**
```json
["allUsers", "user:nmhuyen@gmail.com"]
```
- `allUsers` has `roles/run.invoker` permission (public access allowed)

## Root Cause Analysis

### Primary Issue: CORS Configuration Missing
**Root Cause:** Directus server is not configured to allow cross-origin requests from Firebase domain `https://github-chatgpt-ggcloud.web.app`.

**Evidence Chain:**
1. Server is reachable and responding normally ✅
2. Cloud Run ingress and IAM allow public access ✅
3. OPTIONS preflight request succeeds (200 OK) ✅
4. **BUT:** No CORS headers in any response ❌
5. Browser CORS preflight check fails → "Failed to fetch" error ❌

### Why "Failed to fetch" Occurs
1. Browser sends OPTIONS preflight request to check CORS permissions
2. Directus responds with 200 OK but missing required CORS headers
3. Browser interprets missing CORS headers as "not allowed"
4. Browser blocks the actual POST request
5. Browser throws "Failed to fetch" error with no response details

### Not the Issue
- ❌ Cloud Run access control (IAM/ingress working correctly)
- ❌ Service availability (Directus responding normally)
- ❌ Network connectivity (successful curl tests)
- ❌ Runtime configuration (correct Directus URL)

## Recommended Fix

### Directus CORS Configuration
Configure Directus to allow cross-origin requests from Firebase domain. This typically involves:

1. **Environment Variables (if using Directus config):**
   ```env
   CORS_ORIGIN=https://github-chatgpt-ggcloud.web.app
   CORS_METHODS=GET,POST,PUT,PATCH,DELETE
   CORS_CREDENTIALS=true
   ```

2. **Directus Config File (if using directus.config.js):**
   ```javascript
   module.exports = {
     cors: {
       origin: ['https://github-chatgpt-ggcloud.web.app'],
       methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
       credentials: true
     }
   };
   ```

3. **Redeploy Directus** to Cloud Run with CORS configuration.

### Verification Steps
After fix deployment:
1. Repeat OPTIONS preflight test - should include CORS headers
2. Repeat POST test - should include CORS headers
3. Test actual browser login - should succeed

### Risk Assessment
**Low Risk:** This is a configuration-only change that adds CORS headers. No code changes required. Directus CORS configuration is well-documented and standard.

---

**Conclusion:** CORS configuration issue in Directus server. Cloud Run and network access are functioning correctly.
