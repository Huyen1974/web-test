# Fix Directus CORS Report

## 1. Execution Summary
- **Date**: 2025-12-15
- **Service**: directus-test (Region: asia-southeast1)
- **Goal**: Enable CORS for `https://github-chatgpt-ggcloud.web.app`

## 2. Environment Update (Hotfix)
**Command Used:**
```bash
gcloud run services update directus-test --region=asia-southeast1 \
  --update-env-vars "^;^CORS_ENABLED=true;CORS_ORIGIN=https://github-chatgpt-ggcloud.web.app;CORS_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS;CORS_ALLOWED_HEADERS=Content-Type,Authorization;CORS_CREDENTIALS=true"
```
*Note: Used `^;^` delimiter to avoid parsing issues with commas and colons in the environment variable values.*

**Result:**
- Revision: `directus-test-00006-kwm`
- Status: Deployed and serving 100% traffic.

## 3. Verification Details
**Command:**
```bash
curl -i -X OPTIONS "https://directus-test-812872501910.asia-southeast1.run.app/auth/login" \
     -H "Origin: https://github-chatgpt-ggcloud.web.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: content-type"
```

**Output:**
```http
HTTP/2 204 
content-security-policy: script-src 'self' 'unsafe-eval';worker-src 'self' blob:;child-src 'self' blob:;img-src 'self' data: blob: https://raw.githubusercontent.com https://avatars.githubusercontent.com;media-src 'self';connect-src 'self' https://* wss://*;default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';object-src 'none';script-src-attr 'none';style-src 'self' https: 'unsafe-inline'
x-powered-by: Directus
access-control-allow-origin: https://github-chatgpt-ggcloud.web.app
vary: Origin
access-control-allow-credentials: true
access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
access-control-allow-headers: Content-Type,Authorization
access-control-max-age: 18000
access-control-expose-headers: Content-Range
x-cloud-trace-context: 5369b79139ac169b301d3f2c1d200231;o=1
date: Mon, 15 Dec 2025 08:27:16 GMT
content-type: text/html
server: Google Frontend
alt-svc: h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
```

## 4. Conclusion
CORS headers are correctly responding to the allowlisted origin. The issue should be resolved.
