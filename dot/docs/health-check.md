# DOT Health Check

Purpose
- Run a 4-layer health check against the production site and Directus proxy.

Requirements
- Node.js 18+
- Network access to the target URL

Environment
- BASE_URL (optional, default: https://ai.incomexsaigoncorp.vn)
- NUXT_PUBLIC_SITE_URL (optional fallback)
- DIRECTUS_ADMIN_EMAIL, DIRECTUS_ADMIN_PASSWORD (optional for auth layer)
- DIRECTUS_LOGIN_PATH (optional, default: /api/directus/auth/login)
- DIRECTUS_HEALTH_PATH (optional, default: /api/directus/server/health)

Usage
```bash
./dot/bin/dot-health-check
```

Output
- Network (DNS)
- Web Server (GET /)
- API Proxy (GET /api/directus/server/health)
- Auth Flow (POST /api/directus/auth/login)

Exit Codes
- 0: PASS or WARN (auth skipped)
- 1: FAIL
