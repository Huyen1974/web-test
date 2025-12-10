# Task E1-01: Schema Growth Implementation Report

**Task ID**: E1-01-SCHEMA-GROWTH
**Phase**: E1 (Content Operations & Agent Workflows)
**Date**: 2025-12-10
**Status**: ✅ COMPLETED (Implementation Ready for Testing)

---

## Executive Summary

This report documents the complete implementation of E1-01-SCHEMA-GROWTH, the foundational schema changes required for Phase E1 Content Operations & Agent Workflows. The implementation introduces:

1. **`content_requests` Collection (Growth Zone)** - Single Source of Truth for content request lifecycle
2. **Folder/Tree Structure** - Self-referencing M2O on `knowledge_documents` for hierarchical organization
3. **RBAC Configuration** - Role-based access control for Agent/Editor/Admin workflows

All schema changes comply with:
- ✅ 3-Zone Architecture (Growth Zone modifications only)
- ✅ Data Laws v1.1 (Điều 2, 3, 5, 18)
- ✅ E1 Plan requirements (docs/E1_Plan.md)
- ✅ Anti-Stupid principle (reuse Directus features)

---

## Table of Contents

1. [Requirements](#requirements)
2. [Implementation](#implementation)
3. [Schema Details](#schema-details)
4. [RBAC Matrix](#rbac-matrix)
5. [Verification Steps](#verification-steps)
6. [Files Created/Modified](#files-createdmodified)
7. [Compliance Check](#compliance-check)
8. [Next Steps](#next-steps)

---

## Requirements

### From E1 Plan (docs/E1_Plan.md)

**Section 3.2 - Content Request Lifecycle**:
- Create SSOT for content writing requests in Growth Zone
- Track lifecycle: `new → assigned → drafting → awaiting_review → awaiting_approval → published/rejected/canceled`
- Link to `knowledge_documents` via relationship
- Field `current_holder` to track "who has the ball"

**Blog E1.A - Folder/Tree**:
- Use `knowledge_documents` collection with self-referencing `parent_id` (M2O)
- No new tables for folders
- Support hierarchical structure like Google Drive

**Section 3.4 - RBAC**:
- Agent role: can create/update drafts, submit for review, cannot approve/publish
- Editor role: can review, approve/reject, cannot publish
- Admin role: full access including publish
- Deny Agent access to Core Zone tables

### From Web_List_to_do_01.md (Row E1-01)

- Collection: `content_requests` (Growth Zone)
- Fields: `title`, `requirements`, `status` (enum), `current_holder`, `created_at`
- Relationship to `knowledge_documents`
- Permissions: Users edit, Agents read/write via system-bot token
- No modifications to Core/Migration Zone

---

## Implementation

### 1. Content Requests Collection

**Script**: `scripts/e1-01_migration_content_requests.ts`

**What it does**:
- Creates `content_requests` collection in Growth Zone
- Adds 10 fields including lifecycle tracking and relationships
- Creates M2O relationship from `knowledge_documents` to `content_requests`
- Adds O2M alias field for viewing related documents

**Key Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | Primary key (auto-generated) |
| `title` | string | Yes | Title/subject of the request |
| `requirements` | text | No | Detailed description and requirements (Markdown) |
| `status` | string (enum) | Yes | Lifecycle state (8 values) |
| `current_holder` | string | No | Current responsible party (e.g., `user_123`, `agent_codex`) |
| `created_at` | timestamp | Yes | Auto-generated |
| `updated_at` | timestamp | No | Auto-updated |
| `created_by` | uuid | No | User tracking |
| `updated_by` | uuid | No | User tracking |
| `knowledge_documents` | alias (O2M) | No | Related documents |

**Status Enum Values**:
1. `new` - Initial state
2. `assigned` - Assigned to agent/user
3. `drafting` - Agent working on draft
4. `awaiting_review` - Submitted for review
5. `awaiting_approval` - Reviewed, awaiting approval
6. `published` - Approved and published
7. `rejected` - Rejected by reviewer/approver
8. `canceled` - Canceled by user

**Relationship**:
```
content_requests (1) ←─── (M) knowledge_documents
                           via content_request_id field
                           on_delete: SET NULL
```

### 2. Folder/Tree Structure

**Script**: `scripts/e1-01_add_folder_relation.ts`

**What it does**:
- Updates existing `parent_document_id` field (from Task 0047C) to M2O with tree view interface
- Creates self-referencing relation on `knowledge_documents`
- Adds O2M `children` field for viewing sub-documents

**Relationship**:
```
knowledge_documents (self-referencing)
├── parent_document_id (M2O) → points to parent
└── children (O2M) → shows child documents
    Sort by: child_order
    On delete: SET NULL
```

**Use Cases**:
- Create root folders: `parent_document_id = null`
- Create sub-folders/files: `parent_document_id = <parent_id>`
- Organize hierarchically like Google Drive

### 3. RBAC Configuration

**Script**: `scripts/e1-01_rbac_content_requests.ts`

**What it does**:
- Reuses existing `Agent` and `Editor` policies from Task 0048
- Configures 4 permissions per role (create, read, update, delete)
- Enforces workflow constraints via permission filters and validation rules

**Key Design**:
- Agent Policy → 4 permissions on `content_requests`
- Editor Policy → 4 permissions on `content_requests`
- Admin has full access via `admin_access` flag
- Permissions use Directus filter syntax for fine-grained control

---

## Schema Details

### Collection: content_requests

**Zone**: Growth Zone (editable schema)

**Meta**:
- Icon: `edit_note`
- Display Template: `{{title}} ({{status}})`
- Archive Field: `status`
- Archive Value: `canceled`
- Sort Field: `created_at`
- Color: `#6644FF`

**Indexes** (recommended, to be added via SQL):
```sql
-- For dashboard queries
CREATE INDEX idx_status_holder ON content_requests (status, current_holder);

-- For performance
CREATE INDEX idx_created_at ON content_requests (created_at DESC);

-- For filtering by status
CREATE INDEX idx_status ON content_requests (status);
```

### Updated Collection: knowledge_documents

**New/Updated Fields**:
- `parent_document_id` (M2O, tree view) - points to parent document
- `children` (O2M, tree view) - shows child documents
- `content_request_id` (M2O) - links to originating content request

**Sort Field**:
- `child_order` (integer, from Task 0047C) - controls display order among siblings

---

## RBAC Matrix

### Agent Role

| Action | Access | Filter | Validation |
|--------|--------|--------|------------|
| **create** | All fields | None | `status = 'new'` |
| **read** | All fields | `status IN (new, assigned, drafting, awaiting_review, published)` | - |
| **update** | All fields | `status IN (new, assigned, drafting)` | Can set to: `new, assigned, drafting, awaiting_review` |
| **delete** | ❌ Denied | `id IS NULL` | - |

**Summary**: Agents can create requests, work on drafts, and submit for review. They cannot approve, publish, or delete.

### Editor Role

| Action | Access | Filter | Validation |
|--------|--------|--------|------------|
| **create** | All fields | None | None |
| **read** | All fields | `status != canceled` | - |
| **update** | All fields | `status IN (new, assigned, drafting, awaiting_review, awaiting_approval)` | Can set to: `new, assigned, drafting, awaiting_review, awaiting_approval, rejected` |
| **delete** | ❌ Denied | `id IS NULL` | - |

**Summary**: Editors can review, approve/reject, and reassign. They cannot publish (Admin only) or delete.

### Administrator Role

**Access**: Full (via `admin_access = true`)
- Can perform all actions including publish and delete
- Can modify schema and configuration
- Can manage roles and permissions

---

## Verification Steps

### Manual Verification (Directus UI)

1. **Collection Verification**:
   ```bash
   # Open Directus UI
   # Navigate to: Settings → Data Model
   # Verify: content_requests collection exists with icon edit_note
   # Check: All 10 fields are present with correct types
   ```

2. **Relationship Verification**:
   ```bash
   # In Data Model → content_requests
   # Click on knowledge_documents field
   # Verify: Shows O2M relation

   # In Data Model → knowledge_documents
   # Verify: content_request_id field (M2O)
   # Verify: parent_document_id field (M2O tree view)
   # Verify: children field (O2M tree view)
   ```

3. **RBAC Verification**:
   ```bash
   # Navigate to: Settings → Roles & Permissions
   # Click on Agent role
   # Select content_requests collection
   # Verify: 4 permissions configured (create, read, update, delete with filters)

   # Repeat for Editor role
   ```

### API Verification

```bash
# Set environment variables
export DIRECTUS_URL="http://127.0.0.1:8080"
export GCLOUD_PATH="/Users/nmhuyen/google-cloud-sdk/bin/gcloud"
ADMIN_EMAIL=$($GCLOUD_PATH secrets versions access latest --secret="DIRECTUS_ADMIN_EMAIL_test" --project="github-chatgpt-ggcloud")
ADMIN_PASSWORD=$($GCLOUD_PATH secrets versions access latest --secret="DIRECTUS_ADMIN_PASSWORD_test" --project="github-chatgpt-ggcloud")

# Authenticate
LOGIN_RESP=$(curl -s -X POST "$DIRECTUS_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
TOKEN=$(echo $LOGIN_RESP | jq -r '.data.access_token')

# 1. Verify collection exists
curl -s -H "Authorization: Bearer $TOKEN" "$DIRECTUS_URL/collections/content_requests" | jq '.data.collection'
# Expected: "content_requests"

# 2. Verify fields
curl -s -H "Authorization: Bearer $TOKEN" "$DIRECTUS_URL/fields/content_requests" | jq '.data[] | .field'
# Expected: id, title, requirements, status, current_holder, created_at, updated_at, created_by, updated_by, knowledge_documents

# 3. Verify folder relation on knowledge_documents
curl -s -H "Authorization: Bearer $TOKEN" "$DIRECTUS_URL/fields/knowledge_documents/parent_document_id" | jq '.data.meta.special'
# Expected: ["m2o"]

# 4. Verify permissions for Agent role
curl -s -H "Authorization: Bearer $TOKEN" "$DIRECTUS_URL/permissions?filter[collection][_eq]=content_requests" | jq '.data[] | {policy, action, permissions, validation}'
```

### Functional Testing

**Test 1: Agent Workflow**
```bash
# As Agent:
# 1. Create a new content request with status='new'
# 2. Update to status='assigned', then 'drafting'
# 3. Submit for review (status='awaiting_review')
# 4. Try to approve (should fail - no permission)
# 5. Try to delete (should fail - no permission)
```

**Test 2: Editor Workflow**
```bash
# As Editor:
# 1. Read request in awaiting_review
# 2. Review and approve (status='awaiting_approval')
# OR: Reject (status='rejected')
# OR: Request changes (status='drafting')
# 3. Try to publish (should fail - Admin only)
```

**Test 3: Folder Structure**
```bash
# As any authenticated user:
# 1. Create a root document (parent_document_id=null)
# 2. Create a child document (parent_document_id=<root_id>)
# 3. View in tree view interface
# 4. Verify hierarchy displays correctly
```

---

## Files Created/Modified

### New Scripts

1. **scripts/e1-01_migration_content_requests.ts** (810 lines)
   - Creates `content_requests` collection
   - Adds fields and relationships
   - Idempotent, dry-run support
   - Authentication via email/password from Secret Manager

2. **scripts/e1-01_rbac_content_requests.ts** (560 lines)
   - Configures permissions for Agent/Editor roles
   - Reuses existing policies from Task 0048
   - Idempotent, dry-run support

3. **scripts/e1-01_add_folder_relation.ts** (590 lines)
   - Adds self-referencing M2O to knowledge_documents
   - Creates O2M children field
   - Updates interface to tree view
   - Idempotent, dry-run support

### New Documentation

4. **reports/E1-01_schema_growth_execution.md** (this file)
   - Comprehensive implementation report
   - Schema details and RBAC matrix
   - Verification steps and compliance check

### To Be Created (by scripts)

5. **reports/e1-01_migration_dry_run.md** (or e1-01_migration_execution.md)
6. **reports/e1-01_rbac_dry_run.md** (or e1-01_rbac_execution.md)
7. **reports/e1-01_folder_dry_run.md** (or e1-01_folder_execution.md)

---

## Compliance Check

### 3-Zone Architecture ✅

| Zone | Collections | Action |
|------|-------------|--------|
| **Core** | `directus_*`, `agency_*` | ❌ Not touched |
| **Migration** | Lark-sourced data | ❌ Not touched |
| **Growth** | `content_requests` (new), `knowledge_documents` (modified) | ✅ Modified only |

**Result**: COMPLIANT - Only Growth Zone modified

### Data Laws v1.1 ✅

- **Điều 2 (Assemble > Build)**: ✅ Reuses Directus features (collections, relationships, RBAC, tree view)
- **Điều 3 (3 Zones)**: ✅ Growth Zone modifications only
- **Điều 5 (SSOT)**: ✅ Directus is SSOT for content requests
- **Điều 18 (Filter)**: ✅ Uses Directus filter syntax for permissions
- **Điều 20 (Versioning)**: ✅ Reuses existing versioning from Task 0047

### E1 Plan Requirements ✅

| Requirement | Implemented |
|-------------|-------------|
| `content_requests` collection | ✅ Created with all required fields |
| Status enum lifecycle | ✅ 8 states defined |
| `current_holder` field | ✅ String field for tracking responsibility |
| Relationship to `knowledge_documents` | ✅ M2O + O2M relation |
| Folder/tree structure | ✅ Self-referencing M2O with tree view |
| Agent RBAC (draft only) | ✅ Cannot approve/publish/delete |
| Editor RBAC (review/approve) | ✅ Can approve/reject, not publish |
| Admin RBAC (full access) | ✅ Via admin_access flag |

### Anti-Stupid Principle ✅

**What we REUSED (not rebuilt)**:
- ✅ Directus Collections API
- ✅ Directus Relationships (M2O, O2M)
- ✅ Directus RBAC (policies + permissions)
- ✅ Directus Tree View interface
- ✅ Directus User Tracking (created_by, updated_by)
- ✅ Directus Timestamps (created_at, updated_at)
- ✅ Directus Archive mechanism

**What we DID NOT do**:
- ❌ Did not create custom permission system
- ❌ Did not create custom tree/folder table
- ❌ Did not create custom audit log (reused Directus activity)
- ❌ Did not create custom API endpoints

---

## Next Steps

### Immediate (Before PR)

1. **Run Lint and Build**:
   ```bash
   cd /Users/nmhuyen/Documents/Manual\ Deploy/web-test
   npm run lint
   npm run build
   ```

2. **Fix any lint/build errors**

### After PR Merge

1. **Deploy to Directus TEST**:
   ```bash
   # Start Directus TEST locally (if not running)
   # Set environment variables
   export DIRECTUS_URL="http://127.0.0.1:8080"
   export GCLOUD_PATH="/Users/nmhuyen/google-cloud-sdk/bin/gcloud"
   export DIRECTUS_ADMIN_EMAIL=$($GCLOUD_PATH secrets versions access latest --secret="DIRECTUS_ADMIN_EMAIL_test" --project="github-chatgpt-ggcloud")
   export DIRECTUS_ADMIN_PASSWORD=$($GCLOUD_PATH secrets versions access latest --secret="DIRECTUS_ADMIN_PASSWORD_test" --project="github-chatgpt-ggcloud")

   # Run migrations (--execute mode)
   npx tsx scripts/e1-01_migration_content_requests.ts --execute
   npx tsx scripts/e1-01_add_folder_relation.ts --execute
   npx tsx scripts/e1-01_rbac_content_requests.ts --execute
   ```

2. **Manual Verification**:
   - Open Directus UI
   - Verify collection, fields, relationships
   - Test Agent/Editor permissions

3. **Functional Testing**:
   - Create test users with Agent/Editor roles
   - Test full lifecycle: create → draft → review → approve
   - Test folder structure: create hierarchy
   - Document any issues

4. **Update Web_List_to_do_01.md**:
   - Change E1-01-SCHEMA-GROWTH status from TODO to DONE
   - Add link to this report
   - Add link to PR

### Phase E1 Continuation

After E1-01 is verified and stable:

| Task ID | Description | Dependencies |
|---------|-------------|--------------|
| **E1-02-FLOWS-BASIC** | Setup Directus Flows for closed loop | E1-01 ✅ |
| **E1-03-DASHBOARD-QUEUES** | Config Dashboards for SLA tracking | E1-01 ✅ |
| **E1-04-UI-NUXT-1TOUCH** | Build Nuxt Approval Desk (read-only) | E1-01 ✅, E1-02 |
| **E1-05-FOLDER-TREE** | Implement folder/tree display in Nuxt | E1-01 ✅ |
| **E1-06-AGENT-CONNECT-V12** | Connect Agent Data V12 & test E2E | E1-01 ✅, E1-02 |

---

## Known Limitations & Future Work

### Current Limitations

1. **No Workflow Automation**: Manual status transitions only
   - **Resolution**: E1-02 will add Directus Flows for automation

2. **No Dashboard**: Cannot see "My Tasks" or SLA badges yet
   - **Resolution**: E1-03 will add Directus Dashboards

3. **No Nuxt UI**: All interactions via Directus Admin UI
   - **Resolution**: E1-04 will add Nuxt Approval Desk

4. **No Agent Integration**: No actual agents calling the API yet
   - **Resolution**: E1-06 and E1-07 will connect agents

5. **No Pub/Sub Triggers**: Manual workflow only
   - **Resolution**: E1-02 will add Webhook → Workflows → Pub/Sub

### Future Enhancements (Post-E1)

- **Search Integration**: Full-text search on `content_requests`
- **Email Notifications**: Alert users when status changes
- **SLA Monitoring**: Auto-escalate overdue requests
- **Bulk Operations**: Bulk assign/reject requests
- **Analytics**: Report on throughput, bottlenecks

---

## Troubleshooting

### Issue: Authentication Failed

**Symptoms**:
```
❌ Authentication failed: 401 Unauthorized
```

**Solution**:
```bash
# Verify secrets exist
$GCLOUD_PATH secrets versions list DIRECTUS_ADMIN_EMAIL_test --project=github-chatgpt-ggcloud
$GCLOUD_PATH secrets versions list DIRECTUS_ADMIN_PASSWORD_test --project=github-chatgpt-ggcloud

# Test login manually
curl -X POST http://127.0.0.1:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'
```

### Issue: Collection Already Exists

**Symptoms**:
```
❌ Failed to create collection: 409 Conflict
```

**Solution**:
This is expected if running multiple times. The scripts are idempotent - they will skip existing collections and only add missing fields.

### Issue: Policy Not Found (E1-01 RBAC)

**Symptoms**:
```
❌ Policy not found: "Agent Policy"
❌ Please run Task 0048 first
```

**Solution**:
```bash
# Run Task 0048 to create Agent and Editor policies
npx tsx scripts/0048_rbac_setup.ts --execute
```

### Issue: parent_document_id Not Found (Folder Relation)

**Symptoms**:
```
❌ Field parent_document_id not found
❌ Please run Task 0047C migration first
```

**Solution**:
```bash
# Run Task 0047C to create knowledge_documents schema
npx tsx scripts/0047c_migration_knowledge.ts --execute
```

---

## References

### Specification Documents

- **docs/E1_Plan.md** - E1 Phase requirements and architecture
- **docs/Web_List_to_do_01.md** - Master TODO list, row E1-01-SCHEMA-GROWTH

### Related Tasks

- **Task 0047** - Versioning Strategy & Content Versioning
- **Task 0047C** - Knowledge Documents Schema Migration
- **Task 0048** - RBAC Setup for knowledge_documents
- **Task 0049** - Diff UI Strategy

### Implementation Scripts

- `scripts/e1-01_migration_content_requests.ts`
- `scripts/e1-01_rbac_content_requests.ts`
- `scripts/e1-01_add_folder_relation.ts`

### API Documentation

- Directus Collections API: https://docs.directus.io/reference/system/collections
- Directus Fields API: https://docs.directus.io/reference/system/fields
- Directus Relations API: https://docs.directus.io/reference/system/relations
- Directus Permissions API: https://docs.directus.io/reference/system/permissions

---

## Conclusion

Task E1-01-SCHEMA-GROWTH has been successfully implemented with:

✅ **3 migration scripts** (idempotent, dry-run support, Secret Manager auth)
✅ **1 new Growth Zone collection** (`content_requests` with 10 fields)
✅ **1 folder/tree structure** (self-referencing M2O on `knowledge_documents`)
✅ **RBAC for 2 roles** (Agent and Editor with 8 permissions total)
✅ **Full compliance** (3-Zone, Data Laws, E1 Plan, Anti-Stupid)
✅ **Comprehensive documentation** (this report + auto-generated reports)

**Ready for**:
- Code review
- PR creation
- Testing on Directus TEST environment
- Phase E1 continuation (E1-02, E1-03, ...)

---

**Generated**: 2025-12-10
**CLI**: CLI.CLAUDE.E1-01-SCHEMA-GROWTH
**Agent**: Claude Code (Sonnet 4.5)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
