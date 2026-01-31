# WEB-34B: Fix Gaps - Summary Layer + Auto Review Gates

**Date:** 2026-01-31
**Agent:** Claude Code (Opus 4.5)
**Status:** PARTIALLY COMPLETE

---

## Executive Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Summary Layer Endpoint | CREATED | `web/server/api/docs/context.get.ts` |
| Schema Apply Script | CREATED | `dot/bin/dot-schema-apply` (works with admin token) |
| Review Gates Fields | BLOCKED | AI Agent token lacks schema permissions |

---

## Phase A: Summary Layer Endpoint

### Created: `/api/docs/context`

**File:** `web/server/api/docs/context.get.ts`

**Features:**
- Returns knowledge base structure without full content
- Vietnamese-aware topic extraction (handles short meaningful words)
- Groups documents by doc_type
- Shows recent updates (last 7 days)
- Extracts key topics from titles and tags
- Uses Identity Token for Cloud Run auth (when available)
- Handles empty data gracefully

**Response Structure:**
```json
{
  "success": true,
  "summary": {
    "total_documents": 26,
    "last_updated": "2026-01-31T...",
    "description": "Knowledge base structure for Incomex Saigon Corp"
  },
  "structure": {
    "zones": [
      { "name": "policy", "count": 10, "sample_titles": [...] },
      { "name": "process", "count": 8, "sample_titles": [...] }
    ],
    "doc_types": { "policy": 10, "process": 8 },
    "zone_count": 5
  },
  "recent_updates": {
    "period_days": 7,
    "count": 5,
    "items": [...]
  },
  "key_topics": [
    { "topic": "quản", "count": 8 },
    { "topic": "lý", "count": 6 }
  ],
  "_meta": {
    "endpoint": "/api/docs/context",
    "purpose": "AI Summary Layer",
    "usage": "Call first to understand KB structure"
  }
}
```

**Vietnamese Support:**
- Preserves diacritics in topic extraction
- Keeps short meaningful business terms: kho, sơn, hà, đơn, xe, bán, mua, thu, chi
- Filters Vietnamese stop words: và, của, cho, các, là, trong, etc.

---

## Phase B: Schema Apply Automation

### Created: `dot/bin/dot-schema-apply`

**Features:**
- Reads JSON spec file and creates fields via Directus API
- Idempotent: skips existing fields
- Supports `--dry-run` for testing
- Works with `--cloud` or `--local` environments
- Clear logging with success/skip/fail counts

**Usage:**
```bash
# Dry run first
./dot/bin/dot-schema-apply dot/specs/feedbacks_review_gates.json --dry-run

# Apply with admin token
DIRECTUS_ADMIN_TOKEN="your-admin-token" \
./dot/bin/dot-schema-apply dot/specs/feedbacks_review_gates.json --cloud
```

### Schema Apply Test Results

**Dry Run:** SUCCESS (12 fields would be created)

**Live Run:** BLOCKED

| Field | Status | Reason |
|-------|--------|--------|
| reviewer_1_id | 403 | Requires admin permission |
| reviewer_1_status | 403 | Requires admin permission |
| reviewer_1_comment | 403 | Requires admin permission |
| ... (all 12 fields) | 403 | Requires admin permission |

**Root Cause:**
The `DIRECTUS_AI_AGENT_TOKEN` has read/write access to **items** but not to **schema** (fields/collections). Schema modification requires the Administrator role.

**Resolution Options:**
1. **Option A:** Create `DIRECTUS_ADMIN_TOKEN` secret with full admin access
2. **Option B:** Run script locally with admin credentials
3. **Option C:** Add fields manually via Directus Admin UI (fallback)

---

## Files Created

| File | Purpose |
|------|---------|
| `web/server/api/docs/context.get.ts` | Summary Layer endpoint |
| `dot/bin/dot-schema-apply` | Automated field creation script |
| `dot/specs/feedbacks_review_gates.json` | Updated spec with 12 fields |
| `reports/WEB-34B-GAPS-FIXED.md` | This report |

---

## Verification Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | context.get.ts created | ✅ PASS | File exists |
| 2 | Vietnamese support | ✅ PASS | Short words preserved |
| 3 | Identity Token used | ✅ PASS | Cloud Run auth integrated |
| 4 | dot-schema-apply executable | ✅ PASS | chmod +x applied |
| 5 | Dry run works | ✅ PASS | 12 fields detected |
| 6 | 12 fields created | ❌ BLOCKED | Need admin token |
| 7 | Deploy to production | ⏳ PENDING | PR in progress |

---

## Next Steps

### Immediate (Admin Action Required)

1. **Create Admin Token Secret:**
   ```bash
   # Create admin static token in Directus Admin UI
   # Then store in Secret Manager:
   echo -n "ADMIN_TOKEN_VALUE" | gcloud secrets create DIRECTUS_ADMIN_TOKEN \
     --data-file=- --project=github-chatgpt-ggcloud
   ```

2. **Run Schema Apply with Admin Token:**
   ```bash
   DIRECTUS_ADMIN_TOKEN="ADMIN_TOKEN_VALUE" \
   ./dot/bin/dot-schema-apply dot/specs/feedbacks_review_gates.json --cloud
   ```

3. **Verify Fields Exist:**
   ```bash
   curl -s "$DIRECTUS_URL/fields/feedbacks" \
     -H "Authorization: Bearer $ADMIN_TOKEN" | \
     jq '[.data[].field] | map(select(startswith("reviewer") or startswith("approver")))'
   ```

### Post-Deploy Verification

Once the endpoint is deployed:
```bash
# Test Summary Layer
curl -s "https://ai.incomexsaigoncorp.vn/api/docs/context" | jq .

# Expected: HTTP 200 with structure data
```

---

## Technical Notes

### Why AI Agent Token Can't Create Fields

Directus has two permission levels:
1. **Item-level permissions:** Read/write to collection items (configurable per role)
2. **Schema-level permissions:** Create/modify fields, collections (Admin only)

The AI Agent role has item-level access but not schema-level access. This is correct for security - AI agents shouldn't be able to modify the database schema.

### Identity Token Integration

The context endpoint uses the same `getIdentityToken()` utility from WEB-32:
- On Cloud Run: Uses metadata server for service-to-service auth
- Locally: Falls back to public access (agent_views is public read)

This ensures consistent authentication across all AI Gateway endpoints.

---

*Report generated by Claude Code as part of WEB-34B mission.*
