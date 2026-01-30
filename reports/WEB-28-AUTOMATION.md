# WEB-28-AUTOMATION Report
**Agent:** Claude Code (Opus 4.5)
**Date:** 2026-01-30
**Status:** COMPLETE

---

## Executive Summary

Implemented DOT toolchain for automating WEB-28 post-deployment tasks. Following
the Audit-First protocol, all new tools reuse existing patterns from `dot-schema-ensure`
and `environment.sh`.

---

## Audit-First Results

### Existing Tools Analyzed
| Tool | Reusable Pattern | Applied To |
|------|------------------|------------|
| `dot-schema-ensure` | Collection/field creation (80%) | `dot-schema-feedback-ensure` |
| `dot-fix-permissions` | Role/permission handling | `dot-ai-user-setup` |
| `dot-apply` | Flow spec application | Reused directly |
| `environment.sh` | Env detection, auth | All new tools |

### Decision: Refactor vs New
- **dot-schema-ensure** is hardcoded for `agent_views` → Created new `dot-schema-feedback-ensure`
- **No existing GCP Secret Manager tool** → Created new `dot-ai-gateway-setup`
- **No existing user creation tool** → Created new `dot-ai-user-setup`
- **No existing verification tool** → Created new `dot-ai-bridge-check`

---

## Files Created

### Tools (dot/bin/)

| File | Version | Description |
|------|---------|-------------|
| `dot-schema-feedback-ensure` | 1.0.0 | Idempotent feedbacks collection (14 fields) |
| `dot-ai-user-setup` | 1.0.0 | AI_Agent role/user with static token |
| `dot-ai-gateway-setup` | 1.0.0 | GCP Secret Manager token management |
| `dot-ai-bridge-check` | 1.0.0 | AI Gateway verification (6 checks) |
| `dot-web28-complete` | 1.0.0 | Master orchestrator script |

### Specs (dot/specs/)

| File | Description |
|------|-------------|
| `feedback_notification_flow.json` | Directus Flow for action_request notifications |

### Updated

| File | Changes |
|------|---------|
| `dot/README.md` | Added AI Gateway Tools section |

---

## Tool Details

### dot-schema-feedback-ensure v1.0.0

**Fields Created (14):**
1. `linked_entity_ref` - Reference to linked entity
2. `entity_type` - Extracted entity type
3. `feedback_type` - helpful/not_helpful/suggestion/error/action_request
4. `content` - Feedback content (required)
5. `context_snippet` - Content snapshot (max 2000 chars)
6. `source_model` - AI model name
7. `fingerprint_id` - Anonymous tracking
8. `metadata` - Flexible JSON
9. `status` - pending/in_review/resolved/rejected
10. `resolved_by` - M2O to users
11. `parent_id` - M2O to feedbacks (threading)
12. `user_created` - Auto
13. `date_created` - Auto
14. `date_updated` - Auto

**Relations:**
- `parent_id` → `feedbacks` (self-referential for threading)
- `resolved_by` → `directus_users`

### dot-ai-user-setup v1.0.0

**Creates:**
- Role: `AI_Agent` (no admin/app access)
- User: `ai_agent@system.local` with static token

**Permissions:**
- `feedbacks`: CREATE (limited fields), READ (non-rejected)
- `agent_views`: READ (published only)

### dot-ai-gateway-setup v1.0.0

**Actions:**
1. Generates 64-char random token
2. Creates/updates `AI_GATEWAY_TOKEN` in Secret Manager
3. Grants access to Cloud Run service account
4. Prints Cloud Run update instructions

### dot-ai-bridge-check v1.0.0

**Checks (6):**
1. `llms.txt` accessible (200)
2. `openapi.yaml` accessible (200)
3. `/api/ai/info` returns 200
4. `/api/ai/search` returns 401 (auth required)
5. `agent_views` publicly readable
6. `feedbacks` write-protected

---

## Idempotency Protection

All tools implement idempotent behavior:

| Tool | Check | Action if Exists |
|------|-------|------------------|
| schema-feedback-ensure | `collection_exists()` | Skip collection, check fields |
| schema-feedback-ensure | `field_exists()` | Skip existing fields |
| ai-user-setup | `get_role_id()` | Skip role creation |
| ai-user-setup | `get_user_id()` | Skip user, optionally --regenerate token |
| ai-gateway-setup | `secret_exists()` | Skip unless --rotate |

---

## Versioning

Each script includes VERSION header:

```bash
# VERSION: 1.0.0
# CHANGELOG:
#   v1.0.0 (2026-01-30): Initial version for WEB-28-AUTOMATION
```

---

## Verification

### Syntax Check
```bash
for script in dot/bin/dot-schema-feedback-ensure dot/bin/dot-ai-user-setup \
              dot/bin/dot-ai-gateway-setup dot/bin/dot-ai-bridge-check \
              dot/bin/dot-web28-complete; do
  bash -n "$script" && echo "✅ $script syntax OK"
done
```

### Help Output
```bash
./dot/bin/dot-schema-feedback-ensure --help
./dot/bin/dot-ai-user-setup --help
./dot/bin/dot-ai-gateway-setup --help
./dot/bin/dot-ai-bridge-check --help
./dot/bin/dot-web28-complete --help
```

---

## Usage Instructions

### Complete Setup (One Command)
```bash
export DIRECTUS_ADMIN_PASSWORD="your-password"
./dot/bin/dot-web28-complete --cloud
```

### Individual Tools
```bash
# 1. Auth first
source dot/bin/dot-auth --cloud

# 2. Create feedbacks collection
./dot/bin/dot-schema-feedback-ensure --cloud

# 3. Create AI user and role
./dot/bin/dot-ai-user-setup --cloud

# 4. Setup GCP token
./dot/bin/dot-ai-gateway-setup

# 5. Apply notification flow
./dot/bin/dot-apply dot/specs/feedback_notification_flow.json

# 6. Verify
./dot/bin/dot-ai-bridge-check --cloud
```

---

## Security Notes

- Tokens only printed to stdout, never saved to files
- All scripts use `set -euo pipefail` for safety
- No hardcoded credentials
- Static tokens generated with `openssl rand`
- GCP Secret Manager integration for secure storage

---

## Files Summary

| Path | Status |
|------|--------|
| `dot/bin/dot-schema-feedback-ensure` | CREATED (chmod +x) |
| `dot/bin/dot-ai-user-setup` | CREATED (chmod +x) |
| `dot/bin/dot-ai-gateway-setup` | CREATED (chmod +x) |
| `dot/bin/dot-ai-bridge-check` | CREATED (chmod +x) |
| `dot/bin/dot-web28-complete` | CREATED (chmod +x) |
| `dot/specs/feedback_notification_flow.json` | CREATED |
| `dot/README.md` | UPDATED |
| `reports/WEB-28-AUTOMATION.md` | CREATED |

---

## Post-Merge Admin Tasks

1. **Run the complete setup:**
   ```bash
   export DIRECTUS_ADMIN_PASSWORD="your-password"
   ./dot/bin/dot-web28-complete --cloud
   ```

2. **Save tokens to Secret Manager** (printed by tools)

3. **Redeploy Cloud Run:**
   ```bash
   gcloud run services update nuxt-ssr-pfne2mqwja \
     --region=asia-southeast1 \
     --update-secrets=AI_GATEWAY_TOKEN=AI_GATEWAY_TOKEN:latest
   ```

4. **Verify:**
   ```bash
   ./dot/bin/dot-ai-bridge-check --cloud
   ```
