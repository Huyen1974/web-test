# DOT (Directus Operations Toolkit) v0.1

## Requirements
- bash
- curl
- jq

## Setup
Set Directus admin credentials in your environment:

```bash
export DIRECTUS_ADMIN_EMAIL="admin@example.com"  # optional override
export DIRECTUS_ADMIN_PASSWORD="..."              # required
```

Optional override:

```bash
export DIRECTUS_BASE_URL="https://directus-test-pfne2mqwja-as.a.run.app"
```

## Usage
Authenticate and export a token into the current shell:

```bash
source dot/bin/dot-auth
```

Apply flows from the spec:

```bash
dot/bin/dot-apply
```

Verify flows (handles 403 by printing manual steps and generating a report):

```bash
dot/bin/dot-verify
```

## Reports
- Apply: `dot/reports/DOT_APPLY_REPORT.md`
- Verify: `dot/reports/DOT_VERIFY_REPORT.md`

## Spec
- `dot/specs/directus_flows.v0.1.json`

## Notes
- Tokens are kept in memory only and never printed.
- Flow trigger 403 is expected in v0.1; manual verification is required when it occurs.
