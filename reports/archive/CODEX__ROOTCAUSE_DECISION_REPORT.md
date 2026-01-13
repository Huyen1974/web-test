[CODEX] Root-cause decision

## Evidence reviewed
- CURSOR__CORS_MATRIX_REPORT.md: shows CORS works for `github-chatgpt-ggcloud.web.app` but fails for `github-chatgpt-ggcloud.firebaseapp.com` (Allow-Origin returns web.app even when firebaseapp.com is requester).
- DIRECTUS_LOGIN_FAILED_TO_FETCH_DIAG_REPORT.md: confirms OPTIONS/POST to /auth/login lack CORS headers; runtime config/ingress/IAM are fine; concludes CORS misconfig.
- No Antigravity/Claude reports found.

## Alignment between reports
- Both available reports point to CORS misconfiguration on Directus: missing/limited origins, leading to browser preflight failure (“Failed to fetch”).
- No evidence of backend outage, IAM block, or runtime URL miswiring.

## Final root cause (single)
Directus CORS configuration is incomplete: responses to /auth/login lack proper `Access-Control-Allow-*` headers and only allow `github-chatgpt-ggcloud.web.app`, blocking firebaseapp.com (and any other origin), causing browser login failures.

## Minimal safe fix
Infra-only (no repo PR): redeploy Directus with explicit CORS origins including both Firebase domains and credentials enabled, e.g.:
```
CORS_ORIGIN=https://github-chatgpt-ggcloud.web.app,https://github-chatgpt-ggcloud.firebaseapp.com
CORS_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization
CORS_CREDENTIALS=true
```
Then redeploy Cloud Run `directus-test` with these env vars.

## Gate criteria
- OPTIONS/POST to /auth/login from both web.app and firebaseapp.com return proper CORS headers (Allow-Origin echoes requesting origin; credentials allowed).
- Browser login succeeds from both hosting domains.
- No PR needed unless we later choose to document the CORS settings; current fix is infra-only.

## Next CLI to run (verification after fix)
```
# replace ORIGIN accordingly
curl -i -X OPTIONS "https://directus-test-812872501910.asia-southeast1.run.app/auth/login" \
  -H "Origin: https://github-chatgpt-ggcloud.firebaseapp.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```
Expect 204/200 with Access-Control-Allow-Origin matching the Origin header and credentials allowed.
