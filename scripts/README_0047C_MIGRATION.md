# Task 0047C: Knowledge Documents Schema Migration

## Overview

This directory contains the schema migration script for **Task 0047C - Implement Schema** which adds Content Versioning & Approval Workflow support to the `knowledge_documents` collection in Directus.

**Script**: `0047c_migration_knowledge.ts`

**Design Reference**:
- `reports/0047a_versioning_design.md` (Design Specification)
- `reports/0047c_antigravity_migration_plan.md` (Migration Analysis)
- `sql/0047c_antigravity_proposal.sql` (SQL Reference - DO NOT RUN)

---

## Quick Start

### 1. Set Environment Variables

```bash
export DIRECTUS_URL="https://directus-web-test-XXXXX.a.run.app"
export DIRECTUS_ADMIN_TOKEN="your-admin-static-token"
```

**IMPORTANT**:
- Use the **TEST** environment URL, NOT production
- Token must have admin/schema modification permissions
- Never commit `.env` files with these values

### 2. Run Dry-Run (Recommended First)

```bash
# From project root
npx ts-node scripts/0047c_migration_knowledge.ts

# Or using tsx (faster, modern alternative)
npx tsx scripts/0047c_migration_knowledge.ts
```

This will:
- ✅ Connect to Directus and read current schema
- ✅ Compare against required fields
- ✅ Show exactly what changes would be made
- ❌ NOT apply any changes to the database

**Output**: Detailed report saved to `reports/0047c_migration_dry_run.md`

### 3. Review the Dry-Run Report

Open `reports/0047c_migration_dry_run.md` and verify:
- Existing fields detected correctly
- Missing fields match expectations (should be 14 fields)
- No unexpected errors

### 4. Execute Migration (After Review)

```bash
npx ts-node scripts/0047c_migration_knowledge.ts --execute
```

**This will apply the schema changes to Directus.**

---

## What Gets Added

### 14 New Fields for `knowledge_documents`

| Category | Fields | Purpose |
|----------|--------|---------|
| **Workflow** | `workflow_status` | 5-state workflow (draft → under_review → approved → published → archived) |
| **Versioning** | `version_group_id`<br>`version_number`<br>`is_current_version`<br>`previous_version_id` | Track document versions and version chains |
| **Approval Audit** | `reviewed_by`<br>`reviewed_at`<br>`approved_by`<br>`approved_at`<br>`publisher_id` | Record who reviewed/approved/published and when |
| **Workflow Feedback** | `rejection_reason` | Editor feedback when rejecting documents |
| **Retention** | `purge_after` | Scheduled purge timestamp for old revisions |
| **Hierarchy** | `parent_document_id`<br>`child_order` | Parent-child document relationships |

**Total**: 14 fields

---

## Safety Features

### Idempotent
- ✅ Safe to run multiple times
- ✅ Checks for existing fields before adding
- ✅ Skips fields that already exist

### Non-Destructive
- ✅ Only adds missing fields
- ❌ NEVER drops existing fields
- ❌ NEVER renames existing fields
- ❌ NEVER modifies existing data

### Dry-Run by Default
- ✅ Shows changes without applying them
- ✅ Must explicitly pass `--execute` to apply
- ✅ Generates detailed report for review

### Error Handling
- ✅ Validates environment variables before connecting
- ✅ Catches and reports errors per field
- ✅ Continues processing remaining fields if one fails
- ✅ Provides detailed error messages in report

---

## Troubleshooting

### Error: Missing Environment Variables

```
❌ ERROR: Missing required environment variable DIRECTUS_URL
```

**Solution**: Export both required environment variables:
```bash
export DIRECTUS_URL="https://your-directus-instance.run.app"
export DIRECTUS_ADMIN_TOKEN="your-admin-token"
```

### Error: Failed to read fields

```
❌ ERROR: Failed to read fields for collection "knowledge_documents"
```

**Possible Causes**:
1. Collection `knowledge_documents` doesn't exist → Create it first in Directus
2. Network connectivity issue → Check VPN, firewall, or Cloud SQL proxy
3. Invalid token → Verify token has correct permissions
4. Wrong Directus URL → Double-check the URL

### Error: Failed to add field

```
❌ Failed to add field: workflow_status
```

**Possible Causes**:
1. Field already exists but wasn't detected → Check Directus UI manually
2. Permission issue → Ensure token has schema modification rights
3. Type conflict → Field might exist with different type (manual fix required)

### Script Not Running (ts-node not found)

**Option 1**: Use npx (recommended, no installation needed)
```bash
npx ts-node scripts/0047c_migration_knowledge.ts
```

**Option 2**: Use tsx instead (faster)
```bash
npx tsx scripts/0047c_migration_knowledge.ts
```

**Option 3**: Install ts-node globally
```bash
npm install -g ts-node
ts-node scripts/0047c_migration_knowledge.ts
```

---

## What This Script Does NOT Do

### ❌ Index Creation

This script does **NOT** create database indexes. Indexes must be created manually or via a separate SQL script.

**Required Indexes** (from design doc Section 4.3):
1. `idx_current_published` - For Nuxt read queries
2. `idx_version_history` - For version listing
3. `idx_purge_candidates` - For purge job
4. `idx_workflow_dashboard` - For admin dashboards
5. `idx_approval_tracking` - For approval audit
6. `idx_parent_child_hierarchy` - For parent-child queries

**How to Create**: Use Cloud SQL Console or `sql/` migration script (Task 0047C continuation).

### ❌ Data Migration

This script does **NOT** populate the new fields with data from existing records.

**Data Migration Steps** (manual or separate script):
1. Set `version_group_id` = `id` for existing documents (first version)
2. Set `version_number` = `version` (legacy field mapping)
3. Set `workflow_status` based on legacy `status` field:
   - `published` → `published`
   - `draft` → `draft`
   - `archived` → `archived`
4. Set `is_current_version` = `TRUE` for all existing documents

**When**: After schema migration succeeds, before enabling new workflow.

### ❌ RBAC Configuration

This script does **NOT** configure Directus roles and permissions.

**Required RBAC Setup** (manual in Directus UI):
1. Create/update roles: `agent`, `editor`, `admin`
2. Set field-level permissions per role matrix (design doc Section 3.3)
3. Prevent Agents from updating `knowledge_documents` directly

**When**: After schema migration, as part of Task 0047C completion.

### ❌ Content Versioning Enable

This script does **NOT** enable Directus Content Versioning feature.

**How to Enable**:
1. Open Directus UI → Settings → Data Model
2. Select `knowledge_documents` collection
3. Enable "Content Versioning" toggle
4. Configure retention settings (Max 10 revisions, 7 days)

**When**: After schema migration and RBAC setup.

---

## Post-Migration Checklist

After running `--execute` successfully:

- [ ] **Verify Fields**: Check Directus UI → Settings → Data Model → `knowledge_documents`
  - Confirm all 14 new fields are present
  - Check field types and defaults match design

- [ ] **Create Indexes**: Run SQL script to create 6 required indexes (Cloud SQL Console)

- [ ] **Data Migration**: Populate new fields from legacy fields (separate script or manual)

- [ ] **Test Permissions**: Create test records as Agent/Editor/Admin to verify RBAC

- [ ] **Enable Versioning**: Turn on Content Versioning in Directus collection settings

- [ ] **Update Nuxt Code**: Modify `useKnowledge`, `useTaxonomyTree` composables (Task 0047D)

- [ ] **Documentation**: Update developer docs with new workflow and field usage

---

## Technical Details

### Dependencies

The script uses:
- `@directus/sdk` ^19.1.0 (already in `web/package.json`)
- Node.js built-in modules: `fs`, `path`
- TypeScript runtime: `ts-node` or `tsx` (via npx, no installation needed)

### Directus SDK Methods Used

```typescript
import { createDirectus, rest, staticToken } from '@directus/sdk';
import { readFieldsByCollection, createField } from '@directus/sdk';
```

- **`createDirectus(url)`**: Create Directus client instance
- **`.with(rest())`**: Add REST transport
- **`.with(staticToken(token))`**: Authenticate with static admin token
- **`readFieldsByCollection(collection)`**: Get current fields for a collection
- **`createField(collection, fieldDef)`**: Add a new field to a collection

### Field Definition Structure

```typescript
interface FieldDefinition {
  field: string;           // Field name (e.g., "workflow_status")
  type: string;            // Data type (e.g., "string", "uuid", "integer")
  schema?: {
    default_value?: any;   // Default value for new records
    is_nullable?: boolean; // Whether field can be NULL
    max_length?: number;   // Max length for string fields
  };
  meta?: {
    required?: boolean;    // Whether field is required in forms
    interface?: string;    // Directus UI component (e.g., "select-dropdown")
    options?: object;      // UI component options (e.g., dropdown choices)
    note?: string;         // Help text shown in Directus UI
  };
}
```

---

## Logging & Reporting

### Console Output

```
================================================================================
Task 0047C: Schema Migration for knowledge_documents
================================================================================
Mode: DRY-RUN (no changes will be made)
================================================================================

✓ Connecting to Directus at: https://directus-web-test-XXXXX.a.run.app
✓ Using admin token: ***1234

📋 Reading current schema for collection: knowledge_documents

   Found 22 existing fields

🔍 Checking 14 required fields...

   ✓ Field exists: workflow_status
   ⚠ Field missing: version_group_id
   [DRY-RUN] Would add field: version_group_id (uuid)
   ...

================================================================================
Migration Summary
================================================================================
Mode:             DRY-RUN
Fields Checked:   14
Fields Existing:  0
Fields Missing:   14
Fields Added:     0
Errors:           0
================================================================================

📝 Report saved to: reports/0047c_migration_dry_run.md
```

### Report File

Detailed markdown report saved to `reports/0047c_migration_dry_run.md`:
- Summary statistics
- List of existing fields (already present)
- List of missing fields (to be added)
- Errors (if any)
- Next steps and post-migration checklist

---

## Files Modified/Created

### This Migration

- **Created**: `scripts/0047c_migration_knowledge.ts` (migration script)
- **Created**: `reports/0047c_migration_dry_run.md` (generated report)
- **Updated**: This README

### Future Tasks (Not This Script)

- **Task 0047D**: Update Nuxt composables (`web/composables/useKnowledge.ts`, etc.)
- **Task 0047E**: Purge job implementation (Directus Flow or Cloud Function)
- **Task 0047F**: Agent Data webhook integration
- **Task 0047G**: Testing & documentation

---

## Support & References

### Design Documents

- **Full Design**: `reports/0047a_versioning_design.md`
- **Gap Analysis**: `reports/0047c_antigravity_migration_plan.md`
- **SQL Reference**: `sql/0047c_antigravity_proposal.sql` (DO NOT EXECUTE - for reference only)

### Related Tasks

- **Task 0036**: Taxonomy Design (categories, zones, topics)
- **Task 0037**: Taxonomy UI Implementation (Nuxt components)
- **Task 0047**: Parent task (Content Versioning & Approval Workflow)
- **Task 0047B**: Design review (completed, approved)
- **Task 0047C**: This migration (schema changes)
- **Task 0047D**: Nuxt UI updates (next step)

### Support Channels

If you encounter issues not covered in Troubleshooting:
1. Check Directus logs: Cloud Logging → directus-web-test service
2. Verify Cloud SQL connectivity: `gcloud sql connect mysql-directus-web-test`
3. Review Directus documentation: https://docs.directus.io/reference/api.html

---

**Last Updated**: 2025-12-05
**Author**: Claude Code (CLI.CLAUDE.0047C-SCRIPT)
**Status**: Ready for Execution (pending env var setup and review)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
