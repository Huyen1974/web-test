# Task 0047C: Schema Analysis & Migration Plan

**CLI ID**: CLI.ANTI.0047C-PROPOSE
**Date**: 2025-12-04
**Target DB**: mysql-directus-web-test (Cloud SQL)
**Target Table**: `knowledge_documents`

## 1. Summary

This report analyzes the gap between the current schema of `knowledge_documents` and the requirements defined in `reports/0047a_versioning_design.md`.

**Status**:
- **Current Schema Source**: `docs/directus_schema_gd1.md` (Directus Schema for Giai đoạn 1). Direct DB access was not possible due to network restrictions, so this documentation is used as the authoritative baseline as per the design document.
- **Design Baseline**: `reports/0047a_versioning_design.md` (Task 0047).

**Findings**:
- **Missing Fields**: 14 fields required for workflow, versioning, and parent-child hierarchy are missing.
- **Legacy Fields**: `status` and `version` exist but will be superseded by `workflow_status` and `version_number`/`version_group_id`.
- **Missing Indexes**: 6 new indexes are required to support the new query patterns.

## 2. Current Schema (`knowledge_documents`)

Based on `docs/directus_schema_gd1.md`:

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `status` | String | Legacy workflow status |
| `sort` | Integer | |
| `date_created` | Timestamp | System |
| `date_updated` | Timestamp | System |
| `user_created` | UUID | System |
| `user_updated` | UUID | System |
| `title` | String | |
| `slug` | String | |
| `summary` | Text | |
| `content` | Rich Text | |
| `content_ref` | String | |
| `language` | String | |
| `tags` | JSON | |
| `category` | String | |
| `visibility` | String | |
| `source_of_truth` | String | |
| `source_system` | String | |
| `source_url` | String | |
| `edit_permission` | String | |
| `owner_team` | String | |
| `published_at` | Timestamp | |
| `archived_at` | Timestamp | |
| `version` | Integer | Legacy version counter |
| `notes` | Text | |

## 3. Design Requirements (Diff)

### 3.1 Missing Fields (To Be Added)

The following fields are defined in `reports/0047a_versioning_design.md` but missing in the current schema:

| Field Name | Type | Nullable | Default | Purpose |
|------------|------|----------|---------|---------|
| `workflow_status` | String (32) | No | 'draft' | Replaces `status` for 5-state workflow |
| `version_group_id` | UUID | No | - | Groups versions of same doc |
| `version_number` | Integer | No | 1 | Replaces `version` for sequential numbering |
| `is_current_version` | Boolean | No | FALSE | Flags the active version |
| `previous_version_id` | UUID | Yes | NULL | Linked list of versions |
| `reviewed_by` | UUID | Yes | NULL | Audit |
| `reviewed_at` | Timestamp | Yes | NULL | Audit |
| `approved_by` | UUID | Yes | NULL | Audit |
| `approved_at` | Timestamp | Yes | NULL | Audit |
| `publisher_id` | UUID | Yes | NULL | Audit |
| `rejection_reason` | Text | Yes | NULL | Workflow feedback |
| `purge_after` | Timestamp | Yes | NULL | Retention policy |
| `parent_document_id` | UUID | Yes | NULL | Hierarchy (Parent) |
| `child_order` | Integer | Yes | NULL | Hierarchy (Child Order) |

### 3.2 Missing Indexes

The following indexes are required by the design:

1.  `idx_current_published`: `(workflow_status, is_current_version, category, language, visibility)`
2.  `idx_version_history`: `(version_group_id, version_number DESC)`
3.  `idx_purge_candidates`: `(purge_after)`
4.  `idx_workflow_dashboard`: `(workflow_status, date_updated DESC)`
5.  `idx_approval_tracking`: `(approved_by, approved_at DESC)`
6.  `idx_parent_child_hierarchy`: `(parent_document_id, child_order)`

## 4. Recommendations

The SQL proposal (`sql/0047c_antigravity_proposal.sql`) contains the necessary DDL statements to:

1.  **Add Columns**: `ALTER TABLE knowledge_documents ADD COLUMN ...` for all 14 missing fields.
2.  **Add Indexes**: `CREATE INDEX ...` for all 6 required indexes.

**Note on Legacy Fields**:
- `status` and `version` are NOT dropped. They are retained for backward compatibility during migration.
- Data migration (populating new fields from old ones) is OUT OF SCOPE for this SQL proposal (which is DDL only). Data migration should be handled by a separate script or Directus operation.

## 5. Limitations

- **Read-Only Access**: Direct database inspection was not possible. Analysis relies on `docs/directus_schema_gd1.md`. If the actual DB schema has drifted from this documentation, the `ALTER TABLE` statements might need adjustment (e.g., if a field already exists).
- **Directus Metadata**: This proposal assumes standard Directus-to-MySQL type mapping (e.g., String -> VARCHAR(255), UUID -> CHAR(36)).
