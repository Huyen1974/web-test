# DOT Apply

Purpose
- Create or refresh DOT flows from the spec using a clean slate strategy.

Requirements
- bash, curl, jq

Environment
- DOT_TOKEN or DIRECTUS_ADMIN_PASSWORD (via dot-auth)
- DIRECTUS_BASE_URL (optional)

Usage
```bash
./dot/bin/dot-apply
```

Notes
- Deletes existing operations in matching flows before creating new ones.
