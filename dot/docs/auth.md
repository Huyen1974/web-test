# DOT Auth

Purpose
- Authenticate to Directus and export DOT_TOKEN into the current shell.

Requirements
- bash, curl, jq

Environment
- DIRECTUS_ADMIN_PASSWORD (required)
- DIRECTUS_ADMIN_EMAIL (optional, default: admin@example.com)
- DIRECTUS_BASE_URL (optional)

Usage
```bash
source dot/bin/dot-auth
```

Notes
- The script prints token length only; it does not print the token value.
