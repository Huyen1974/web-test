# [CURSOR] Directus CORS Matrix
**CLI Name:** CLI.CURSOR.PARALLEL-VERIFY-BROWSERLIKE-CORS.v1.0
**Date:** 2025-12-15
**Directus URL:** https://directus-test-812872501910.asia-southeast1.run.app

## Summary
Parallel CORS verification for Directus `/auth/login` endpoint across multiple origins. Results show selective CORS allowance.

## Test Origins
1. `https://github-chatgpt-ggcloud.web.app` (Firebase web.app domain)
2. `https://github-chatgpt-ggcloud.firebaseapp.com` (Firebase firebaseapp.com domain)

## CORS Matrix Results

| Origin | OPTIONS Status | OPTIONS Allow-Origin | POST Status | POST Allow-Origin | Verdict |
|--------|----------------|---------------------|-------------|-------------------|---------|
| `https://github-chatgpt-ggcloud.web.app` | 204 No Content ✅ | ✅ `https://github-chatgpt-ggcloud.web.app` | 400 Bad Request ✅ | ✅ `https://github-chatgpt-ggcloud.web.app` | **ALLOWED** |
| `https://github-chatgpt-ggcloud.firebaseapp.com` | 204 No Content ✅ | ❌ `https://github-chatgpt-ggcloud.web.app` (not requested origin) | 400 Bad Request ✅ | ❌ `https://github-chatgpt-ggcloud.web.app` (not requested origin) | **BLOCKED** |

## Key Findings

### ✅ Working Origin
- `https://github-chatgpt-ggcloud.web.app`: Fully allowed with proper CORS headers

### ❌ Blocked Origin
- `https://github-chatgpt-ggcloud.firebaseapp.com`: CORS headers return wrong origin (`web.app` instead of requested `firebaseapp.com`)

### CORS Configuration Issue
Directus appears to be configured with a **single allowed origin** (`https://github-chatgpt-ggcloud.web.app`) rather than supporting multiple Firebase hosting domains.

## Detailed Response Analysis

### Origin 1: github-chatgpt-ggcloud.web.app

**OPTIONS Response Headers:**
```
HTTP/2 204
access-control-allow-origin: https://github-chatgpt-ggcloud.web.app
access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
access-control-allow-headers: Content-Type,Authorization
access-control-allow-credentials: true
```

**POST Response Headers:**
```
HTTP/2 400
access-control-allow-origin: https://github-chatgpt-ggcloud.web.app
access-control-allow-credentials: true
```

### Origin 2: github-chatgpt-ggcloud.firebaseapp.com

**OPTIONS Response Headers:**
```
HTTP/2 204
access-control-allow-origin: https://github-chatgpt-ggcloud.web.app
access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
access-control-allow-headers: Content-Type,Authorization
access-control-allow-credentials: true
```

**POST Response Headers:**
```
HTTP/2 400
access-control-allow-origin: https://github-chatgpt-ggcloud.web.app
access-control-allow-credentials: true
```

## Browser Impact Assessment

If the browser is actually using `https://github-chatgpt-ggcloud.firebaseapp.com` as the origin:
- **CORS preflight will fail** due to origin mismatch
- **Login requests will be blocked** by browser CORS policy
- **"Failed to fetch" error** will occur in browser console

If the browser is using `https://github-chatgpt-ggcloud.web.app`:
- **CORS will work correctly**
- **Login should succeed**

## Recommendation

**Update Directus CORS configuration** to support both Firebase hosting domains:

```javascript
// Directus config
cors: {
  origin: [
    'https://github-chatgpt-ggcloud.web.app',
    'https://github-chatgpt-ggcloud.firebaseapp.com'
  ],
  credentials: true
}
```

Or use environment variables:
```env
CORS_ORIGIN=https://github-chatgpt-ggcloud.web.app,https://github-chatgpt-ggcloud.firebaseapp.com
CORS_CREDENTIALS=true
```

## Files Generated
- `reports/cursor_OPTIONS_github-chatgpt-ggcloud-web-app.txt`
- `reports/cursor_POST_github-chatgpt-ggcloud-web-app.txt`
- `reports/cursor_OPTIONS_github-chatgpt-ggcloud-firebaseapp-com.txt`
- `reports/cursor_POST_github-chatgpt-ggcloud-firebaseapp-com.txt`
