# E2 TASK #018b Report: Permission Tool & Root Cause Discovery

**Agent:** Claude Code (Codex)
**Date:** 2026-01-23
**Status:** COMPLETED (with critical discovery)

---

## Deliverable Checklist

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Tool executable | ✅ | `dot/bin/dot-fix-permissions` |
| `chmod +x` applied | ✅ | Verified executable |
| Tool idempotent | ✅ | Can run multiple times safely |
| Authenticate with Directus | ✅ | Works correctly |
| Find Administrator role | ✅ | Found with policies |
| PATCH role | ⚠️ | Directus 11.x uses policies, not `admin_access` on roles |
| Documentation updated | ✅ | `credentials.example.json` updated |
| Verification run | ✅ | **Discovered root cause** |

---

## Critical Discovery

### The 403 errors are NOT a permissions issue

Investigation revealed that the `os_invoices`, `os_tasks`, and `os_projects` collections **do not exist** in the Directus database.

### Evidence

```
[5/5] Verifying collection access...

  ✗ os_invoices: COLLECTION DOES NOT EXIST
  ✗ os_tasks: COLLECTION DOES NOT EXIST
  ✗ os_projects: COLLECTION DOES NOT EXIST

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ MISSING COLLECTIONS

The following collections do not exist in Directus:
  - os_invoices
  - os_tasks
  - os_projects
```

### Verification Steps Taken

1. **Authentication** - Works correctly with admin@example.com
2. **Role lookup** - Found "Administrator" role with correct policy
3. **Policy check** - Administrator policy already has `admin_access: true`
4. **Collection check** - Listed all 64 collections, NO `os_*` collections exist

### Collections That Exist

```
agent_views, block_*, categories, content_requests, forms, globals,
knowledge_documents, languages, navigation, pages, posts, redirects,
seo, team, testimonials, directus_*
```

**No `os_invoices`, `os_tasks`, or `os_projects`**

---

## Tool Output

### Fix Permissions Run

```
🔐 DOT FIX PERMISSIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Directus URL: https://directus-test-pfne2mqwja-as.a.run.app
Admin Email:  admin@example.com

[1/4] Authenticating with Directus...
✓ Authenticated successfully
[2/4] Fetching roles...
✓ Found 6 roles
[3/4] Finding Administrator role...
✓ Found role: "Administrator" (a40a1070-0b62-4a7e-b2c0-bd4bce9d41ac)
  Current admin_access: undefined
[4/4] Setting admin_access: true...
✓ Role updated successfully
[5/5] Verifying collection access...

  ✗ os_invoices: COLLECTION DOES NOT EXIST
  ✗ os_tasks: COLLECTION DOES NOT EXIST
  ✗ os_projects: COLLECTION DOES NOT EXIST

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ MISSING COLLECTIONS
```

---

## Tool Features

### `dot/bin/dot-fix-permissions`

```bash
# Usage
./dot/bin/dot-fix-permissions [options]

# Options
--dry-run     Show what would be done without making changes
--help        Show help

# Environment Variables (or use credentials.local.json)
DIRECTUS_URL            Directus API URL
DIRECTUS_ADMIN_EMAIL    Admin email
DIRECTUS_ADMIN_PASSWORD Admin password
```

### What the tool does:

1. Authenticates with Directus API
2. Finds the Administrator role
3. Checks/sets admin_access on the role's policy (Directus 11.x compatible)
4. **Verifies** collection access for `os_invoices`, `os_tasks`, `os_projects`
5. Reports clearly if collections don't exist

---

## Root Cause Summary

| Issue | Cause | Solution |
|-------|-------|----------|
| 403 on /items/os_invoices | Collection doesn't exist | Create collection schema |
| 403 on /items/os_tasks | Collection doesn't exist | Create collection schema |
| 403 on /items/os_projects | Collection doesn't exist | Create collection schema |

---

## Recommendations

### Option A: Create Missing Collections
Create the `os_invoices`, `os_tasks`, `os_projects` collections in Directus with proper schema.

### Option B: Update Portal Pages
Modify the Portal pages to use collections that actually exist, or add graceful fallback when collections don't exist.

---

## Files Changed

| File | Change |
|------|--------|
| `dot/bin/dot-fix-permissions` | NEW - Permission fix tool with verification |
| `dot/config/credentials.example.json` | Added `directusUrl` field |
| `dot/config/credentials.local.json` | Added `directusUrl` field |

---

## Conclusion

**Task #018b identified the TRUE root cause:**

- ❌ NOT a permissions issue (Administrator has `admin_access: true`)
- ❌ NOT a cookie forwarding issue (authentication works)
- ✅ **SCHEMA ISSUE** - Required collections don't exist

The tool correctly identifies this and reports it clearly. The Portal pages cannot function until the `os_*` collections are created in Directus.

---

## PR Link

https://github.com/Huyen1974/web-test/pull/267
