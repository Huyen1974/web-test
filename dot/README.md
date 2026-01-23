# DOT (Directus Operations Toolkit)

DOT is a small set of shell tools for Directus operations: auth, flows, schema checks, and rollback.

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

## Tool map
| Tool | Purpose | Inputs (env) | Idempotent | Typical usage |
| --- | --- | --- | --- | --- |
| dot/bin/dot-auth | Auth to Directus and export DOT_TOKEN into current shell | DIRECTUS_ADMIN_PASSWORD, DIRECTUS_ADMIN_EMAIL, DIRECTUS_BASE_URL | Yes | `source dot/bin/dot-auth` |
| dot/bin/dot-apply | Create/refresh DOT flows from spec (clean slate) | DOT_TOKEN or DIRECTUS_ADMIN_PASSWORD (via dot-auth), DIRECTUS_BASE_URL | Yes (destructive to flow operations) | `dot/bin/dot-apply` |
| dot/bin/dot-verify | Trigger flows; handles 403 with manual steps and report | DOT_TOKEN or DIRECTUS_ADMIN_PASSWORD (via dot-auth), DIRECTUS_BASE_URL | Yes | `dot/bin/dot-verify` |
| dot/bin/dot-rollback | Delete DOT flows (prefix [DOT]) | DOT_TOKEN, DIRECTUS_BASE_URL | No (destructive) | `dot/bin/dot-rollback` |
| dot/bin/dot-schema-ensure | Ensure core collection agent_views + required fields | DOT_TOKEN or DIRECTUS_ADMIN_PASSWORD (via dot-auth), DIRECTUS_BASE_URL | Yes | `dot/bin/dot-schema-ensure` |
| dot/bin/dot-schema-blog-ensure | Ensure blog schema for posts/pages_blog (relations + fields) | DOT_TOKEN or DIRECTUS_ADMIN_PASSWORD (via dot-auth), DIRECTUS_BASE_URL | Yes (may recreate fields if misconfigured) | `dot/bin/dot-schema-blog-ensure` |
| dot/bin/dot-fix-gap3 | Compatibility alias for blog schema migration | DOT_TOKEN or DIRECTUS_ADMIN_PASSWORD (via dot-auth), DIRECTUS_BASE_URL | Yes | `dot/bin/dot-fix-gap3` |
| dot/bin/dot-schema-redirects-ensure | Ensure redirects collection + Public READ | DOT_TOKEN or DIRECTUS_ADMIN_PASSWORD (via dot-auth), DIRECTUS_BASE_URL | Yes | `dot/bin/dot-schema-redirects-ensure` |
| dot/bin/dot-schema-navigation-ensure | Convert navigation singleton to collection + Public READ | DOT_TOKEN or DIRECTUS_ADMIN_PASSWORD (via dot-auth), DIRECTUS_BASE_URL | Yes (safe if singleton empty) | `dot/bin/dot-schema-navigation-ensure` |
| dot/bin/dot-health-check | 4-layer health check (network, web, proxy, auth) | BASE_URL, DIRECTUS_ADMIN_EMAIL, DIRECTUS_ADMIN_PASSWORD | Yes | `dot/bin/dot-health-check` |
| dot/bin/dot-test-login | Run Playwright login tests against production | PLAYWRIGHT_BASE_URL, BASE_URL | Yes | `dot/bin/dot-test-login` |
| dot/bin/dot-cost-audit | Cloud Run configuration snapshot for cost review | GCP_PROJECT, GCP_REGION | Yes | `dot/bin/dot-cost-audit` |

## Safety and laws
- No UI automation. These tools use Directus API only.
- Do not print secrets or run with `set -x`.
- Tools are designed to be idempotent; re-runs should be safe within their scope.
- Verify changes via API before and after runs.

## Verification examples
Use `--globoff` to avoid shell globbing on bracketed query params.

```bash
# Core schema check
curl --globoff -sS -H "Authorization: Bearer $DOT_TOKEN" \
  "${DIRECTUS_BASE_URL}/collections/agent_views" | jq '.data.collection'

# Blog schema check (anonymous)
curl --globoff -sS \
  "${DIRECTUS_BASE_URL}/items/pages_blog?fields=featured_post.id,featured_post.slug" \
  | jq '.data.featured_post'
```

## Docs
- dot/docs/auth.md
- dot/docs/apply.md
- dot/docs/verify.md
- dot/docs/rollback.md
- dot/docs/schema-ensure.md
- dot/docs/schema-blog-ensure.md
- dot/docs/schema-redirects-ensure.md
- dot/docs/schema-navigation-ensure.md
- dot/docs/fix-gap3.md
- dot/docs/health-check.md
- dot/docs/test-login.md
- dot/docs/cost-audit.md

## Reports
- dot/reports/DOT_APPLY_REPORT.md
- dot/reports/DOT_VERIFY_REPORT.md
