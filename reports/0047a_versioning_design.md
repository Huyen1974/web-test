# Task 0047A - Content Versioning & Approval Workflow Design

**Task ID**: CLI.CLAUDE.0047A
**Phase**: E (Content Engine & Versioning)
**Date**: 2025-12-03
**Status**: Design Only (No Implementation)
**Related Tasks**: 0048 (Workflow Roles), 0049 (Diff UI)

---

## Executive Summary

This document defines a comprehensive **Content Versioning & Approval Workflow** for knowledge documents in the web-test project. The design establishes a 5-state workflow (Draft → Under Review → Approved → Published → Archived) with role-based permissions (Agent, Editor, Admin) and integrates with Directus Content Versioning as the single source of truth (SSOT).

**Key Decisions**:
- **Primary Collection**: `knowledge_documents` (existing) with added versioning fields
- **State Machine**: 5 states with strictly defined transitions
- **Roles**: 3 roles with hierarchical permissions
- **Version Retention**: Max 10 revisions OR 7 days (auto-purge)
- **No Custom System**: Leverage Directus built-in Content Versioning + custom state management

---

## 1. Context & Scope

### 1.1 Problem Statement

Currently, the `knowledge_documents` collection has basic states (`draft`, `published`, `archived`) but lacks:
1. A formal review/approval process before publication
2. Version history tracking and linking
3. Clear role-based permissions for content lifecycle
4. Automatic purging of old revisions to control database growth

### 1.2 Scope

**In Scope**:
- State machine design for knowledge document lifecycle
- Role definitions and permission matrix
- Directus schema extensions (fields only, no implementation)
- Version history retention and auto-purge policy
- Integration with existing taxonomy system (Task 0036/0037)

**Out of Scope** (deferred to future tasks):
- Implementation of Directus migrations/flows
- Nuxt UI changes for version display
- RBAC configuration in Directus
- Auto-purge job implementation

### 1.3 Governance Constraints

This design complies with:

**From docs/Law_of_data_and_connection.md**:
- **Điều 4 (Article 4) - Warehouse Layer**: Directus is SSOT for knowledge documents (line 93-102)
- **3 Zone Schema (Điều 3, line 65-70)**:
  - `knowledge_documents` is in **Core Zone** (system table, controlled schema)
  - Version metadata fields go in Core Zone
  - Agents CANNOT directly modify Core Zone tables
- **Điều 20 (Article 20) - Cost Control (line 475-484)**:
  - Max 10 revisions OR 7 days retention
  - Auto-purge required to prevent DB bloat
- **Growth Zone workflow (Điều 3, line 69)**: Draft → Review → Approved process required

**From docs/Web_List_to_do_01.md**:
- **Task 0047 (line 142)**:
  - Use Directus Content Versioning as primary versioning channel
  - Don't build custom versioning system
  - Config limits: Max 10 revisions OR 7 days
  - Enable auto-purge
- **Task 0048 (line 143)**:
  - Agent can only create/edit Draft
  - User (Editor/Approver) can Publish
  - RBAC: DENY Agent on Core Zone tables

**From docs/constitution.md**:
- **HP-02 (line 10)**: All infrastructure via IaC (Terraform for Directus config)
- **HP-CI-03 (line 50-52)**: Artifact retention: 14 days stale warning, 30 days cleanup

---

## 2. Requirements & Constraints

### 2.1 Functional Requirements

**FR-1**: Document lifecycle MUST follow: Draft → Under Review → Approved → Published → Archived

**FR-2**: Role-based state transitions:
- **Agent**: Can create Draft, cannot proceed to other states
- **Editor**: Can move Draft → Under Review → Approved (or reject to Draft)
- **Admin**: Can move Approved → Published → Archived, handle edge cases

**FR-3**: Version history:
- Each document MUST belong to a version group
- Version number MUST auto-increment within a group
- Previous version MUST be linkable
- Current "live" version MUST be identifiable

**FR-4**: Audit trail:
- WHO created/updated each version (user_created, user_updated)
- WHO reviewed (reviewer_id, reviewed_at)
- WHO approved (approver_id, approved_at)
- WHO published (publisher_id, published_at)

**FR-5**: Auto-purge:
- Revisions older than 7 days OR beyond 10 most recent MUST be eligible for purge
- Published versions MUST NOT be purged
- Current draft MUST NOT be purged

### 2.2 Non-Functional Requirements

**NFR-1**: Performance - Version queries MUST use indexed fields (version_group_id, status)

**NFR-2**: Data Integrity - Foreign key constraints MUST enforce referential integrity

**NFR-3**: Observability - All state transitions MUST be logged with timestamps

**NFR-4**: Compatibility - MUST integrate with existing taxonomy (category, zone, topic from Task 0036)

---

## 3. State Machine (States, Transitions, Role Permissions)

### 3.1 State Definitions

| State | Code | Description | Exit Condition |
|-------|------|-------------|----------------|
| **Draft** | `draft` | Initial state. Document is being written/edited. Not visible to public. | Human Editor moves to Under Review, or Author continues editing |
| **Under Review** | `under_review` | Document submitted for review. Editor is evaluating content. | Editor approves → Approved, or rejects → Draft |
| **Approved** | `approved` | Content reviewed and approved for publication. Waiting for Admin to publish. | Admin publishes → Published, or Admin reverts → Draft |
| **Published** | `published` | Document live on website. Publicly accessible via Nuxt. | Admin archives → Archived, or Admin reverts for edits → Draft (creates new version) |
| **Archived** | `archived` | Document removed from public view but preserved for history. | Can be restored → Published (rare, Admin only) |

### 3.2 State Transition Diagram

```
     ┌─────────┐
     │  Draft  │ ◄────────┐
     └────┬────┘           │
          │ (Editor)       │ (Reject)
          ▼                │
   ┌──────────────┐        │
   │ Under Review │────────┘
   └──────┬───────┘
          │ (Editor)
          ▼
    ┌──────────┐
    │ Approved │
    └────┬─────┘
         │ (Admin)
         ▼
   ┌───────────┐
   │ Published │
   └─────┬─────┘
         │ (Admin)
         ▼
   ┌──────────┐
   │ Archived │
   └──────────┘
```

### 3.3 Role Definitions

#### Role 1: Agent (Internal AI Agent)

**Permissions**:
- ✅ **CAN** create new Draft documents
- ✅ **CAN** read Published documents (for context)
- ✅ **CAN** update existing Draft documents (only those created by Agent)
- ❌ **CANNOT** move Draft to Under Review
- ❌ **CANNOT** read/write documents in Under Review, Approved states
- ❌ **CANNOT** publish or archive documents

**Implementation Notes**:
- Agent MUST have a dedicated Directus role: `agent_writer`
- RBAC: DENY on Core Zone tables except INSERT/UPDATE on `knowledge_documents` where `status = 'draft'`
- Agent Data API MUST enforce: only Draft creation, never state transitions

#### Role 2: Editor (Human Reviewer)

**Permissions**:
- ✅ **CAN** read all documents (all states)
- ✅ **CAN** move Draft → Under Review
- ✅ **CAN** move Under Review → Approved (after review)
- ✅ **CAN** reject Under Review → Draft (with reason)
- ✅ **CAN** edit Draft documents (minor corrections)
- ❌ **CANNOT** publish documents (Approved → Published)
- ❌ **CANNOT** archive documents

**Implementation Notes**:
- Directus role: `content_editor`
- RBAC: READ all, UPDATE status to `under_review` or `approved`, UPDATE content only on drafts
- Must provide rejection reason when reverting to Draft

#### Role 3: Admin (Publisher & System Manager)

**Permissions**:
- ✅ **CAN** perform all Editor actions
- ✅ **CAN** move Approved → Published
- ✅ **CAN** move Published → Archived
- ✅ **CAN** restore Archived → Published (rare edge case)
- ✅ **CAN** create new Draft version from Published (rollback scenario)
- ✅ **CAN** delete documents (hard delete, with audit log)

**Implementation Notes**:
- Directus role: `administrator` (built-in) or custom `content_admin`
- Full access to all operations
- All destructive actions (delete, archive) MUST be logged

### 3.4 State Transition Matrix

| From State | To State | Allowed Role(s) | Preconditions | Postconditions |
|------------|----------|-----------------|---------------|----------------|
| Draft | Under Review | Editor, Admin | Content complete, no validation errors | Set `reviewed_by`, `reviewed_at` to NULL (reset) |
| Under Review | Approved | Editor, Admin | Review completed, no issues found | Set `reviewed_by`, `reviewed_at`, `approved_by`, `approved_at` |
| Under Review | Draft | Editor, Admin | Issues found during review | Set `rejection_reason`, clear `reviewed_by/at` |
| Approved | Published | Admin | Final checks passed | Set `publisher_id`, `published_at`, increment `version_number` |
| Approved | Draft | Admin | Need major revisions | Create new draft version, link to previous |
| Published | Archived | Admin | Content outdated or deprecated | Set `archived_at`, remove from public view |
| Archived | Published | Admin | Restoration requested | Clear `archived_at`, restore to public view |
| Published | Draft (new version) | Admin, Editor | Need to update published content | Create new draft with `version_number++`, link `previous_version_id` |

### 3.5 Forbidden Transitions

- ❌ Draft → Approved (MUST go through Under Review)
- ❌ Draft → Published (MUST go through Under Review → Approved)
- ❌ Under Review → Published (MUST go through Approved)
- ❌ Archived → Draft (MUST restore to Published first)
- ❌ Any state → Any state by Agent (Agent can only create/update Drafts)

---

## 4. Directus Data Model (Collections & Fields)

### 4.1 Collection: `knowledge_documents` (Modified)

**Existing Fields** (from directus_schema_gd1.md):
- `id` (UUID, PK)
- `status` (String, currently: draft/published/archived) → **EXPAND to 5 states**
- `title`, `slug`, `summary`, `content` (existing)
- `language`, `tags`, `category` (existing, from taxonomy)
- `date_created`, `date_updated`, `user_created`, `user_updated` (Directus system fields)
- `published_at`, `archived_at` (existing)
- `version` (Integer, existing but underutilized)

**New Fields to Add**:

| Field Name | Type | Nullable | Default | Description |
|------------|------|----------|---------|-------------|
| **`workflow_status`** | String (dropdown) | No | `draft` | **NEW 5-state workflow**: `draft`, `under_review`, `approved`, `published`, `archived` |
| **`version_group_id`** | UUID (FK to self) | Yes | NULL | Links all versions of the same document. Points to the ID of the first/root version. |
| **`version_number`** | Integer | No | 1 | Version number within the group (1, 2, 3, ...). Auto-increment on new version. |
| **`is_current_version`** | Boolean | No | TRUE | TRUE if this is the latest version in the group. Only one TRUE per group. |
| **`previous_version_id`** | UUID (FK to self) | Yes | NULL | Links to the immediately previous version (optional, for diff/history). |
| **`reviewed_by`** | UUID (FK to directus_users) | Yes | NULL | User ID of Editor who reviewed this version. |
| **`reviewed_at`** | Timestamp | Yes | NULL | When the document was reviewed (moved to Under Review → Approved/Rejected). |
| **`approved_by`** | UUID (FK to directus_users) | Yes | NULL | User ID of Editor who approved this version. |
| **`approved_at`** | Timestamp | Yes | NULL | When the document was approved (moved to Approved state). |
| **`publisher_id`** | UUID (FK to directus_users) | Yes | NULL | User ID of Admin who published this version. |
| **`rejection_reason`** | Text | Yes | NULL | Reason for rejection (if moved from Under Review → Draft). |
| **`purge_after`** | Timestamp | Yes | Auto-calculated | Timestamp after which this revision is eligible for auto-purge. `date_created + 7 days` for Drafts. NULL for Published. |

**Modified Existing Fields**:

| Field Name | Change | Reason |
|------------|--------|--------|
| **`status`** | **DEPRECATE** in favor of `workflow_status` | Old field had only 3 states (draft/published/archived). Keep for backward compatibility but rename to `legacy_status` if needed. New field `workflow_status` uses 5 states. |
| **`version`** | **DEPRECATE** in favor of `version_number` | Old field was manually managed. New `version_number` is auto-incremented and tied to `version_group_id`. |

### 4.2 Field Details & Constraints

#### `version_group_id` (UUID, FK to self)

**Purpose**: Groups all versions of the same logical document.

**Logic**:
- When creating the **first version** of a new document, `version_group_id` is NULL initially.
- After save, set `version_group_id = id` (self-reference, this is the root version).
- When creating a **new version** from existing, copy `version_group_id` from parent.

**Example**:
```
Document A (version 1): id=a1, version_group_id=a1, version_number=1
Document A (version 2): id=a2, version_group_id=a1, version_number=2, previous_version_id=a1
Document A (version 3): id=a3, version_group_id=a1, version_number=3, previous_version_id=a2
```

**Constraint**: `version_group_id` MUST reference a valid `knowledge_documents.id`.

#### `is_current_version` (Boolean)

**Purpose**: Marks the latest/active version in a version group.

**Logic**:
- Only ONE record per `version_group_id` can have `is_current_version = TRUE`.
- When creating a new version, set old version's `is_current_version = FALSE` and new version's `is_current_version = TRUE`.
- Published documents: `is_current_version` identifies the live version shown on Nuxt.

**Constraint**: Enforce via Directus Flow or database trigger: `COUNT(*) WHERE version_group_id = X AND is_current_version = TRUE` MUST BE ≤ 1.

#### `purge_after` (Timestamp, Auto-calculated)

**Purpose**: Marks when a revision becomes eligible for auto-purge.

**Logic**:
- **For Drafts**: `purge_after = date_created + 7 days`
- **For Under Review**: `purge_after = reviewed_at + 7 days` (if not approved)
- **For Approved (unpublished)**: `purge_after = approved_at + 7 days` (if not published)
- **For Published**: `purge_after = NULL` (never purge published versions)
- **For Archived**: `purge_after = NULL` (keep archived for audit trail)

**Implementation**: Calculate on record creation/status change via Directus Flow hook.

### 4.3 Indexes for Performance

**Required Indexes**:
1. `(version_group_id, version_number)` - For fetching version history
2. `(workflow_status, is_current_version)` - For filtering published/current documents
3. `(purge_after)` - For auto-purge job queries
4. `(user_created, workflow_status)` - For "my drafts" queries

### 4.4 Foreign Key Relationships

```sql
ALTER TABLE knowledge_documents
  ADD CONSTRAINT fk_version_group
    FOREIGN KEY (version_group_id) REFERENCES knowledge_documents(id)
    ON DELETE SET NULL;

ALTER TABLE knowledge_documents
  ADD CONSTRAINT fk_previous_version
    FOREIGN KEY (previous_version_id) REFERENCES knowledge_documents(id)
    ON DELETE SET NULL;

ALTER TABLE knowledge_documents
  ADD CONSTRAINT fk_reviewed_by
    FOREIGN KEY (reviewed_by) REFERENCES directus_users(id)
    ON DELETE SET NULL;

ALTER TABLE knowledge_documents
  ADD CONSTRAINT fk_approved_by
    FOREIGN KEY (approved_by) REFERENCES directus_users(id)
    ON DELETE SET NULL;

ALTER TABLE knowledge_documents
  ADD CONSTRAINT fk_publisher_id
    FOREIGN KEY (publisher_id) REFERENCES directus_users(id)
    ON DELETE SET NULL;
```

**Note**: These SQL statements are for illustration. Actual implementation in Task 0047C will use Directus UI or migrations.

---

## 5. Version History & Purge Policy

### 5.1 Retention Rules

**Rule 1: Max 10 Revisions per Version Group**

- Keep at most the **10 most recent revisions** per `version_group_id`.
- If a version group has 11+ revisions, the oldest non-Published revisions are eligible for purge.
- Count only: Draft, Under Review, Approved (unpublished) states.

**Rule 2: Max 7 Days for Unpublished Revisions**

- Any Draft, Under Review, or Approved revision older than 7 days is eligible for purge.
- Calculation: `CURRENT_TIMESTAMP > purge_after`

**Rule 3: Never Purge**

- ✅ **Published** versions (workflow_status = 'published') are NEVER purged
- ✅ **Archived** versions are kept for audit trail (can be purged manually by Admin after 1 year)
- ✅ **Current version** (`is_current_version = TRUE`) is never purged even if > 7 days

### 5.2 Purge Eligibility Query

```sql
SELECT id, title, workflow_status, version_number, date_created, purge_after
FROM knowledge_documents
WHERE
  -- Eligible for purge if:
  (
    -- Condition 1: Older than 7 days
    (purge_after IS NOT NULL AND CURRENT_TIMESTAMP > purge_after)

    OR

    -- Condition 2: Beyond 10 most recent in version group
    (
      version_number <= (
        SELECT MAX(version_number) - 10
        FROM knowledge_documents AS kd2
        WHERE kd2.version_group_id = knowledge_documents.version_group_id
      )
    )
  )

  -- Never purge these
  AND workflow_status NOT IN ('published', 'archived')
  AND is_current_version = FALSE

ORDER BY version_group_id, version_number;
```

### 5.3 Purge Execution Methods

**Option A: Directus Flow (Recommended)**

- Create a scheduled Directus Flow that runs daily at 2 AM UTC.
- Flow steps:
  1. Query eligible records (using filter similar to SQL above)
  2. For each record, move to a `purged` collection (soft delete) or hard delete
  3. Log purge action to `purge_log` collection (audit trail)

**Option B: Google Cloud Workflows (Alternative)**

- If Directus Flows cannot handle complex queries, use Google Cloud Workflows.
- Schedule: Daily cron job
- Workflow calls Directus API to:
  1. Fetch eligible records (GET /items/knowledge_documents with filter)
  2. Delete each record (DELETE /items/knowledge_documents/:id)
  3. Log to Cloud Logging

**Option C: Manual Review (Phase 1 Fallback)**

- For MVP/Phase 1, Admin manually reviews and purges old drafts weekly.
- Use Directus UI filter: `workflow_status IN (draft, under_review) AND purge_after < NOW()`
- Automate in Task 0047C once Directus/Workflows are stable.

**Recommended Approach**: Start with **Option C** (manual) in Phase 1, implement **Option A** (Directus Flow) in Phase 2 after Task 0043/0044 are done.

### 5.4 Purge Audit Log

**Collection**: `content_purge_log` (NEW)

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `purged_document_id` | UUID | ID of the purged knowledge_document |
| `purged_document_title` | String | Title (for reference, since record is deleted) |
| `version_group_id` | UUID | Version group (for tracking) |
| `version_number` | Integer | Version number (for tracking) |
| `purged_by` | UUID (FK to directus_users) | User or system that triggered purge |
| `purged_at` | Timestamp | When the purge occurred |
| `purge_reason` | String | Reason: `expired_7_days`, `beyond_10_revisions`, `manual_admin` |
| `purged_content_snapshot` | JSON | Optional: snapshot of full record for recovery (if space allows) |

**Purpose**: Maintain audit trail of all purges for compliance and debugging.

---

## 6. Integration with Taxonomy & Knowledge UI

### 6.1 Taxonomy Compatibility (Task 0036/0037)

**Existing Taxonomy Fields** (from Task 0036):
- `category` (String) → maps to **Zone** in taxonomy
- `tags[0]` (String) → maps to **Topic** in taxonomy
- `tags[1..n]` (Strings) → secondary keywords

**Versioning Impact**:
- Taxonomy fields (`category`, `tags`) are **copied** when creating a new version.
- If category/topic changes between versions, the new version gets the updated taxonomy.
- Taxonomy menu (from Task 0037) ONLY displays **Published** documents: `workflow_status = 'published' AND is_current_version = TRUE`.

**Integration Points**:
1. `useTaxonomyTree` composable (from Task 0037) MUST filter by `workflow_status = 'published'`.
2. `useKnowledgeList` composable MUST respect `is_current_version = TRUE` to avoid duplicate documents.
3. When displaying version history on Nuxt, group by `version_group_id` and show `category`/`tags` per version.

### 6.2 Nuxt Knowledge Page Integration

**Current State** (from Task 0037):
- `web/pages/knowledge/index.vue` displays knowledge cards filtered by zone/topic.
- Uses `useKnowledgeList` composable → calls Directus API with filter `status = 'published'`.

**Required Changes** (deferred to Task 0047D):
1. Update filter: `workflow_status = 'published' AND is_current_version = TRUE`
2. Add "Version History" link on document detail page: `/knowledge/[id]` → show all versions where `version_group_id = current_doc.version_group_id`
3. Display version badge: "Version 3" or "v3" next to title
4. Add "View Previous Versions" dropdown (read-only, no editing)

**No Breaking Changes**:
- Existing knowledge cards continue to work (just need filter update).
- Taxonomy menu (Task 0037) continues to work (already filters Published).

---

## 7. Workflow Examples & Edge Cases

### 7.1 Happy Path: Agent Draft → Editor Review → Admin Publish

**Scenario**: Agent creates a new knowledge document, Editor reviews and approves, Admin publishes.

**Steps**:
1. **Agent** creates new document via Agent Data API:
   - POST /items/knowledge_documents
   - Fields: `title`, `content`, `category`, `tags`, `language`
   - Auto-set: `workflow_status = 'draft'`, `version_number = 1`, `version_group_id = id` (after creation), `is_current_version = TRUE`
   - Result: Document in Draft state, visible only to Editors/Admins

2. **Editor** reviews document in Directus UI:
   - Views draft, checks content quality
   - Click "Submit for Review" button (custom action in Directus)
   - Transition: Draft → Under Review
   - Auto-set: `reviewed_by = current_user_id`, `reviewed_at = NOW()`

3. **Editor** approves document:
   - Reviews again, confirms no issues
   - Click "Approve" button
   - Transition: Under Review → Approved
   - Auto-set: `approved_by = current_user_id`, `approved_at = NOW()`

4. **Admin** publishes document:
   - Final check, confirms metadata correct
   - Click "Publish" button
   - Transition: Approved → Published
   - Auto-set: `workflow_status = 'published'`, `publisher_id = current_user_id`, `published_at = NOW()`
   - Result: Document live on Nuxt, visible at `/knowledge/[slug]`

### 7.2 Rejection Path: Editor Rejects During Review

**Scenario**: Editor finds issues during review and sends back to Draft.

**Steps**:
1. Document in **Under Review** state
2. **Editor** finds errors (typos, missing info, incorrect category)
3. Click "Reject" button, provide reason: "Missing references section"
4. Transition: Under Review → Draft
5. Auto-set: `rejection_reason = "Missing references section"`, `reviewed_by = NULL`, `reviewed_at = NULL`
6. Notification sent to original author (Agent or human)
7. Author fixes issues, re-submits (goto 7.1 step 2)

### 7.3 Update Published Document: Create New Version

**Scenario**: A Published document needs updates (outdated info, corrections).

**Steps**:
1. Document currently **Published** (version 1, `is_current_version = TRUE`)
2. **Editor** or **Admin** clicks "Create New Version" in Directus
3. System creates new draft:
   - Copy all fields from version 1
   - New record: `id = new_uuid`, `workflow_status = 'draft'`
   - Set: `version_group_id = v1.version_group_id`, `version_number = 2`, `previous_version_id = v1.id`
   - Set: `is_current_version = FALSE` (not current until published)
4. Editor makes changes to version 2 draft
5. Follow normal workflow: Draft → Under Review → Approved → Published
6. When version 2 is **Published**:
   - Set: `v2.is_current_version = TRUE`
   - Set: `v1.is_current_version = FALSE` (old version still Published but not current)
7. Nuxt now displays version 2 as the default. Version 1 accessible via "Version History" link.

### 7.4 Rollback: Revert to Previous Published Version

**Scenario**: Version 2 was published but has critical errors. Need to rollback to version 1.

**Steps**:
1. Version 2 is **Published** and `is_current_version = TRUE`
2. Version 1 is **Published** but `is_current_version = FALSE`
3. **Admin** identifies issue in version 2
4. Admin clicks "Rollback" action in Directus (custom action)
5. System updates:
   - Set: `v2.workflow_status = 'archived'`, `v2.is_current_version = FALSE`, `v2.archived_at = NOW()`
   - Set: `v1.is_current_version = TRUE` (restore as current)
6. Nuxt now displays version 1 again (rollback complete)
7. Admin can create version 3 to fix version 2's issues (follow 7.3)

### 7.5 Edge Case: Abandoned Draft Auto-Purge

**Scenario**: Agent creates a draft but never completes it. After 7 days, auto-purge triggers.

**Steps**:
1. Agent creates draft on Day 0: `workflow_status = 'draft'`, `purge_after = Day 7`
2. Draft sits untouched for 7 days
3. Day 8: Auto-purge job runs (Directus Flow or Cloud Workflow)
4. Job queries: `WHERE workflow_status = 'draft' AND purge_after < NOW() AND is_current_version = FALSE`
5. Draft is eligible for purge (no Published version, not current)
6. Job deletes draft or moves to `purged_documents` collection
7. Log entry created in `content_purge_log`: `purge_reason = 'expired_7_days'`

---

## 8. Future Tasks & Rollout Plan

### 8.1 Task Breakdown

**Task 0047B: Codex Review & LAW Alignment** (Next)
- Codex reviews this design document
- Verifies compliance with docs/constitution.md and docs/Law_of_data_and_connection.md
- Identifies any conflicts or gaps
- Proposes amendments if needed
- Approves design before implementation begins

**Task 0047C: Implement Directus Configuration** (Implementation)
- Add new fields to `knowledge_documents` collection via Directus UI
- Create `content_purge_log` collection
- Set up indexes for performance
- Configure Directus roles: `agent_writer`, `content_editor`, `content_admin`
- Configure RBAC permissions per role
- Test state transitions manually
- Document configuration steps

**Task 0047D: Implement Directus Flows** (Automation)
- Create Flow: Auto-calculate `purge_after` on record create/update
- Create Flow: Enforce `is_current_version` uniqueness constraint
- Create Flow: Send notifications on state transitions (Draft → Under Review, etc.)
- Create Flow (Phase 2): Auto-purge job (if using Directus Flows)
- Test all flows in Directus sandbox

**Task 0047E: Nuxt UI Updates** (Frontend)
- Update `useKnowledgeList` filter: `workflow_status = 'published' AND is_current_version = TRUE`
- Add version badge to knowledge cards
- Create `/knowledge/[id]/versions` page (version history view)
- Add "View Previous Versions" dropdown on detail page
- Integrate with taxonomy menu (no changes needed, already filters Published)

**Task 0047F: Agent Data Integration** (API)
- Update Agent Data API to use `workflow_status` instead of `status`
- Enforce Agent role: only allow Draft creation via API
- Update Qdrant indexing: only index Published documents
- Update search composables: `useAgentDataSearch` to respect `workflow_status`

**Task 0047G: Auto-Purge Implementation** (Cloud Workflows or Directus Flow)
- Implement auto-purge job (choose Option A or B from Section 5.3)
- Schedule daily execution (2 AM UTC)
- Add monitoring/alerting for purge job failures
- Test purge logic in sandbox environment
- Deploy to production with dry-run mode first

### 8.2 Rollout Phases

**Phase 1: Manual Workflow (Weeks 1-2)**
- Implement Task 0047C (Directus config)
- Manual state transitions via Directus UI
- Manual purge by Admin (no auto-purge yet)
- Focus: Validate workflow, gather feedback

**Phase 2: Automated Transitions (Weeks 3-4)**
- Implement Task 0047D (Directus Flows)
- Auto-calculate `purge_after`, enforce constraints
- Notifications on state transitions
- Still manual purge

**Phase 3: Full Automation (Week 5+)**
- Implement Task 0047G (auto-purge)
- Deploy monitoring/alerting
- Integrate with Nuxt UI (Task 0047E)
- Production rollout

### 8.3 Testing Strategy

**Unit Tests** (Task 0047C):
- Test state transition logic (Draft → Under Review → Approved → Published)
- Test rejection flow (Under Review → Draft)
- Test version creation (copy fields, link previous version)
- Test `is_current_version` uniqueness constraint

**Integration Tests** (Task 0047E):
- Test Nuxt knowledge page with new filter
- Test version history display
- Test taxonomy integration (ensure only Published documents show in menu)

**E2E Tests** (Task 0047F):
- Test Agent creates Draft via API
- Test Editor reviews/approves via Directus UI
- Test Admin publishes via Directus UI
- Test document appears on Nuxt after publish

**Performance Tests** (Task 0047C):
- Test query performance with 1000+ documents
- Test version history queries (grouped by `version_group_id`)
- Test purge job performance (delete 100+ records)

---

## 9. Governance Compliance Verification

### 9.1 Constitution Compliance

| Principle | Compliance | Evidence |
|-----------|------------|----------|
| **HP-02: Absolute IaC** | ✅ Yes | Directus config will be via UI (Task 0047C), then exported to migrations for IaC (Task 0047C2). Terraform not applicable for Directus schema. |
| **HP-CI-03: Artifact Retention** | ✅ Yes | Auto-purge policy (7 days, 10 revisions) aligns with 30-day artifact cleanup principle. |

### 9.2 Law of Data & Connection Compliance

| Article | Requirement | Compliance | Evidence |
|---------|-------------|------------|----------|
| **Điều 3: 3 Zone Schema** | Core Zone tables cannot be modified by Agents | ✅ Yes | `knowledge_documents` is Core Zone. Agent role has DENY on UPDATE except Draft status. Version fields are system-managed. |
| **Điều 3: Growth Zone Workflow** | New tables/features must go through Draft → Review → Published | ✅ Yes | Content workflow enforces Draft → Under Review → Approved → Published. |
| **Điều 4: Directus as SSOT** | Directus is single source of truth for knowledge documents | ✅ Yes | All versioning metadata stored in Directus. Agent Data reads from Directus, never writes Published content. |
| **Điều 20: Cost Control** | Max 10 revisions OR 7 days, auto-purge enabled | ✅ Yes | Purge policy enforces both limits. Auto-purge job (Task 0047G) prevents DB bloat. |

### 9.3 Task 0047 Requirements Compliance

| Requirement | Compliance | Evidence |
|-------------|------------|----------|
| Use Directus Content Versioning as primary channel | ✅ Yes | `version_group_id`, `version_number`, `previous_version_id` fields leverage Directus structure. |
| Don't build custom versioning system | ✅ Yes | No separate versioning service. All versioning logic in Directus via fields + Flows. |
| Config limits: Max 10 revisions OR 7 days | ✅ Yes | Section 5.1 defines both retention rules. |
| Enable auto-purge | ✅ Yes | Section 5.3 defines purge methods. Task 0047G implements. |
| Schema versioning uses Directus or Git | ✅ Yes | Content versioning uses Directus. Schema changes (Task 0047C) will use Git PR + migrations. |

---

## 10. Open Questions & Risks

### 10.1 Open Questions

**Q1**: Should we support branching (multiple Draft versions simultaneously)?
- **Answer**: No, for Phase 1. Only one active Draft per version group. If needed later, add `branch_name` field.

**Q2**: How to handle concurrent edits (two Editors editing same Draft)?
- **Answer**: Directus has built-in conflict detection. Use `date_updated` optimistic locking. If conflict, show warning and force manual merge.

**Q3**: Should archived documents be purged after X months?
- **Answer**: Not automatically. Admin can manually purge archived documents after 1 year (policy TBD in Task 0048).

**Q4**: How to notify Agent when Draft is rejected?
- **Answer**: Task 0047D (Directus Flow) sends webhook to Agent Data API with rejection reason. Agent logs event, no auto-retry.

### 10.2 Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **R1**: Purge job deletes wrong records (bug in query) | High | Low | Implement dry-run mode first. Log all purge actions. Manual review of purge log weekly (Phase 1). |
| **R2**: `is_current_version` constraint not enforced, duplicates occur | Medium | Medium | Implement database trigger or Directus Flow to enforce uniqueness. Add monitoring alert if duplicates detected. |
| **R3**: Agent bypasses Draft-only restriction via API | High | Low | Enforce at API level (Agent Data) AND Directus RBAC. Double layer of security. |
| **R4**: Version history UI causes performance issues (1000+ versions) | Medium | Low | Add pagination to version history page. Limit display to 50 versions, provide "Load more" button. |
| **R5**: Directus Flows too slow for auto-purge (100+ records) | Low | Medium | If Flows timeout, switch to Google Cloud Workflows (Option B) which has no timeout limit. |

---

## 11. Appendix

### 11.1 Glossary

| Term | Definition |
|------|------------|
| **Version Group** | Set of all versions of the same logical document, linked by `version_group_id`. |
| **Current Version** | The latest version in a version group, marked by `is_current_version = TRUE`. |
| **Revision** | A single record in `knowledge_documents` representing one version. Synonym for "version" in this document. |
| **Purge** | Permanent deletion of a revision from the database (after eligibility criteria met). |
| **SSOT** | Single Source of Truth - the authoritative data source for a given entity. |
| **Core Zone** | System-critical tables in Directus that Agents cannot modify (from Law Article 3). |
| **Growth Zone** | New tables/features created during operation, must follow approval workflow (from Law Article 3). |

### 11.2 Related Documents

- **docs/constitution.md** - Supreme principles for infrastructure
- **docs/Law_of_data_and_connection.md** - Data flow and connectivity rules
- **docs/Web_List_to_do_01.md** - Master task backlog (Tasks 0047, 0048, 0049)
- **docs/directus_schema_gd1.md** - Current Directus schema (knowledge_documents definition)
- **reports/0036a_taxonomy_design.md** - Taxonomy design (Category/Zone/Topic)
- **reports/0037_taxonomy_ui_implementation.md** - Taxonomy menu implementation
- **reports/0037c_doc_update.md** - Phase pivot (deferring C/D, prioritizing E)

### 11.3 SQL Schema Summary (For Reference)

```sql
-- NEW FIELDS to add to knowledge_documents
ALTER TABLE knowledge_documents
  ADD COLUMN workflow_status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (workflow_status IN ('draft', 'under_review', 'approved', 'published', 'archived')),
  ADD COLUMN version_group_id UUID REFERENCES knowledge_documents(id) ON DELETE SET NULL,
  ADD COLUMN version_number INT NOT NULL DEFAULT 1,
  ADD COLUMN is_current_version BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN previous_version_id UUID REFERENCES knowledge_documents(id) ON DELETE SET NULL,
  ADD COLUMN reviewed_by UUID REFERENCES directus_users(id) ON DELETE SET NULL,
  ADD COLUMN reviewed_at TIMESTAMP NULL,
  ADD COLUMN approved_by UUID REFERENCES directus_users(id) ON DELETE SET NULL,
  ADD COLUMN approved_at TIMESTAMP NULL,
  ADD COLUMN publisher_id UUID REFERENCES directus_users(id) ON DELETE SET NULL,
  ADD COLUMN rejection_reason TEXT NULL,
  ADD COLUMN purge_after TIMESTAMP NULL;

-- INDEXES
CREATE INDEX idx_version_group_version ON knowledge_documents(version_group_id, version_number);
CREATE INDEX idx_workflow_status_current ON knowledge_documents(workflow_status, is_current_version);
CREATE INDEX idx_purge_after ON knowledge_documents(purge_after);
CREATE INDEX idx_user_drafts ON knowledge_documents(user_created, workflow_status);

-- NEW COLLECTION: content_purge_log
CREATE TABLE content_purge_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purged_document_id UUID NOT NULL,
  purged_document_title VARCHAR(255) NOT NULL,
  version_group_id UUID,
  version_number INT,
  purged_by UUID REFERENCES directus_users(id) ON DELETE SET NULL,
  purged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  purge_reason VARCHAR(50) NOT NULL,
  purged_content_snapshot JSON
);

CREATE INDEX idx_purge_log_group ON content_purge_log(version_group_id);
CREATE INDEX idx_purge_log_date ON content_purge_log(purged_at);
```

**Note**: Actual implementation will be via Directus UI (Task 0047C), not raw SQL.

---

## 12. Conclusion

This design document establishes a comprehensive **Content Versioning & Approval Workflow** that:
- ✅ Defines 5-state workflow (Draft → Under Review → Approved → Published → Archived)
- ✅ Assigns clear roles (Agent, Editor, Admin) with enforced permissions
- ✅ Extends Directus schema with minimal new fields (version_group_id, workflow_status, etc.)
- ✅ Implements retention policy (10 revisions OR 7 days) with auto-purge
- ✅ Integrates with existing taxonomy system (Task 0036/0037)
- ✅ Complies with Constitution (HP-02, HP-CI-03) and Law of Data & Connection (Articles 3, 4, 20)
- ✅ Provides clear rollout plan (Tasks 0047B → 0047G)

**Next Steps**:
1. Codex reviews this design (Task 0047B)
2. Implement Directus configuration (Task 0047C)
3. Build automation (Tasks 0047D, 0047G)
4. Update Nuxt UI (Task 0047E)

**Success Criteria**:
- All knowledge documents follow the 5-state workflow
- No manual versioning (all automated via Directus)
- Database size stable (auto-purge prevents bloat)
- Clear audit trail for all content lifecycle events

---

**Document Status**: ✅ Design Complete (No Implementation)
**Author**: Claude Code (AI Assistant)
**Date**: 2025-12-03
**Review Required**: Codex (Task 0047B)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
