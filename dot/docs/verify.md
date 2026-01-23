# DOT Verify

Purpose
- Trigger DOT flows and generate verification reports.

Requirements
- bash, curl, jq

Environment
- DOT_TOKEN or DIRECTUS_ADMIN_PASSWORD (via dot-auth)
- DIRECTUS_BASE_URL (optional)

Usage
```bash
./dot/bin/dot-verify
```

Notes
- Handles 403 on trigger by providing manual instructions.
