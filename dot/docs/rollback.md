# DOT Rollback

Purpose
- Delete DOT-managed flows (prefix [DOT]).

Requirements
- bash, curl, jq

Environment
- DOT_TOKEN (required)
- DIRECTUS_BASE_URL (optional)

Usage
```bash
./dot/bin/dot-rollback
```

Notes
- Destructive. Use only when you need to remove DOT flows.
