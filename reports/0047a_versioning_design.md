# Task 0047 – Content Versioning & Approval Workflow Design

**Task ID**: CLI.CLAUDE.0047
**Document Type**: Design Specification (Phase E – Content Engine & Versioning)
**Status**: DESIGN ONLY – No Implementation
**Date**: 2025-12-03
**Author**: Claude (AI Assistant)

---

## Executive Summary

This document specifies the design for implementing Content Versioning and Approval Workflow for knowledge documents in the web-test project. The solution leverages Directus's native Content Versioning feature, extended with custom workflow states and role-based access control (RBAC) to enforce a structured approval pipeline.

**Key Design Decisions**:
- **5-State Workflow**: Draft → Under Review → Approved → Published → Archived
- **3 Roles**: Agent (create/edit drafts), Editor (review/approve), Admin (publish/archive)
- **11 New Fields**: Workflow state, version grouping, approval tracking, purge scheduling
- **Retention Policy**: Max 10 revisions OR 7 days for unpublished; Published/Archived + is_current_version=TRUE never purge
- **Read-Path Filter**: `workflow_status='published' AND is_current_version=TRUE`
- **Compliance**: Agents cannot write to Core Zone; Directus remains Single Source of Truth (SSOT)

**This is DESIGN ONLY** – no code implementation, migration scripts, or Directus configuration changes are included. Implementation will follow in subsequent tasks (0047C-0047G) pending approval of this design.

---

## 1. Context & Scope

### 1.1 Background

**Problem Statement**:
The current `knowledge_documents` collection in Directus has basic draft/published/archived states but lacks:
- Formal approval workflow with intermediate review/approval states
- Version grouping to track document history across major revisions
- Retention policy to prevent database bloat from revision accumulation
- Role-based controls to prevent Agents from publishing content directly

**Business Requirements** (from Task 0047, Web_List_to_do_01.md):
1. Knowledge documents must use Directus Content Versioning as the primary versioning & approval channel
2. Nuxt displays only published versions (read-only)
3. Do NOT build a custom versioning system
4. Configure retention limits: Max 10 revisions OR 7 days retention
5. Enable auto-purge to prevent database bloat (Law of Data & Connection, Điều 20)

**Governance Constraints**:
- **Constitution HP-02**: All design changes must be documented and auditable
- **Constitution HP-CI-03**: Artifact retention policy must be enforced (14 days stale, 30 days cleanup)
- **Law of Data & Connection, Điều 3**: Agents CANNOT write to Core Zone collections (knowledge_documents is Core)
- **Law of Data & Connection, Điều 4**: Directus is the Single Source of Truth (SSOT) for knowledge documents
- **Law of Data & Connection, Điều 20**: Max 10 revisions OR 7 days retention; auto-purge required

### 1.2 Scope

**In Scope**:
- State machine design for 5 workflow states
- Role matrix defining which roles can perform which transitions
- Data model extensions (11 new fields) for the `knowledge_documents` collection
- Index recommendations for query performance
- Retention and purge policy specification
- Integration points with existing taxonomy (Tasks 0036/0037)
- High-level implementation roadmap (0047B-0047G)

**Out of Scope**:
- Actual Directus configuration or migration scripts (Task 0047C)
- Code changes to Nuxt UI (Task 0047D)
- Diff UI implementation (Task 0049)
- Schema versioning for technical configurations (separate strategy)
- Agent Data indexing rules (covered in Task 0048)

### 1.3 Assumptions

1. Directus Content Versioning is enabled and functional
2. The `knowledge_documents` collection exists with current schema (per docs/directus_schema_gd1.md)
3. RBAC in Directus can be configured to enforce role-based transitions
4. Nuxt uses `nuxt-directus` module for all Directus API interactions
5. MySQL supports indexing strategies proposed in this design

---

## 2. Requirements & Constraints

### 2.1 Functional Requirements

**FR-001**: The system SHALL support a 5-state workflow: Draft → Under Review → Approved → Published → Archived

**FR-002**: The system SHALL enforce role-based permissions:
- Agents: Create/edit Draft; Submit for Review
- Editors: Review Draft; Approve/Reject
- Admins: Publish Approved; Archive Published; Rollback

**FR-003**: The system SHALL group document versions using a `version_group_id` (UUID)

**FR-004**: The system SHALL track the current active version with `is_current_version=TRUE` (only one per group)

**FR-005**: The system SHALL link versions using `previous_version_id` to form a version chain

**FR-006**: The system SHALL record approval metadata: `reviewed_by`, `reviewed_at`, `approved_by`, `approved_at`, `publisher_id`

**FR-007**: The system SHALL automatically purge old revisions per retention policy (FR-008)

**FR-008**: Retention policy: Max 10 revisions per version group OR revisions older than 7 days (whichever comes first) EXCEPT Published/Archived versions with `is_current_version=TRUE`

**FR-009**: Nuxt read-path SHALL filter documents: `workflow_status='published' AND is_current_version=TRUE`

**FR-010**: The system SHALL support rejection with reason: `rejection_reason` field

**FR-011**: The system SHALL support rollback from Published to previous Approved version

### 2.2 Non-Functional Requirements

**NFR-001**: Query performance: Fetch current published version by taxonomy filter MUST complete in <200ms

**NFR-002**: Purge operations MUST NOT lock the database for >5 seconds

**NFR-003**: All state transitions MUST be logged for audit trail

**NFR-004**: The design MUST be compatible with existing taxonomy implementation (Tasks 0036/0037)

**NFR-005**: The design MUST prevent Agents from writing to Core Zone (per Law Điều 3)

### 2.3 Constraints

**C-001**: MUST use Directus native Content Versioning; NO custom versioning system

**C-002**: MUST NOT exceed 10 revisions per version group OR 7 days retention (per Law Điều 20)

**C-003**: MUST NOT purge Published/Archived versions with `is_current_version=TRUE`

**C-004**: Agents MUST NOT have UPDATE/DELETE permissions on `knowledge_documents` collection (Core Zone)

**C-005**: All queries from Nuxt MUST use `nuxt-directus` composables; NO direct Directus SDK calls

---

## 3. State Machine & Role Matrix

### 3.1 Workflow States

| State | Description | Terminal? |
|-------|-------------|-----------|
| **Draft** | Document is being created/edited. Not visible to public. | No |
| **Under Review** | Document submitted for review. Editors can approve/reject. | No |
| **Approved** | Document passed review. Ready for publishing. | No |
| **Published** | Document is live on Nuxt. Visible to public. | Yes* |
| **Archived** | Document removed from public view but retained for history. | Yes |

*Published is terminal in normal flow but can transition to Archived.

### 3.2 State Transition Diagram

```
┌─────────┐
│  Draft  │◄──────────────────┐
└────┬────┘                   │
     │ Submit                 │
     │ (Agent/Editor)         │ Reject
     ▼                        │ (Editor)
┌─────────────┐               │
│Under Review │───────────────┘
└──────┬──────┘
       │ Approve
       │ (Editor)
       ▼
┌─────────┐
│Approved │
└────┬────┘
     │ Publish
     │ (Admin)
     ▼
┌───────────┐
│ Published │
└─────┬─────┘
      │ Archive
      │ (Admin)
      ▼
┌─────────┐
│Archived │
└─────────┘

Rollback path (Admin only):
Published ──(Rollback)──> Approved (previous version)
```

### 3.3 Role Matrix

| Transition | From State | To State | Agent | Editor | Admin |
|------------|-----------|----------|-------|--------|-------|
| Create | - | Draft | ✅ | ✅ | ✅ |
| Edit | Draft | Draft | ✅ | ✅ | ✅ |
| Submit | Draft | Under Review | ✅ | ✅ | ✅ |
| Approve | Under Review | Approved | ❌ | ✅ | ✅ |
| Reject | Under Review | Draft | ❌ | ✅ | ✅ |
| Publish | Approved | Published | ❌ | ❌ | ✅ |
| Archive | Published | Archived | ❌ | ❌ | ✅ |
| Rollback | Published | Approved | ❌ | ❌ | ✅ |

**Key Rules**:
- **Agents** can ONLY create/edit Draft and Submit for Review
- **Agents CANNOT** approve, publish, or archive (enforces Law Điều 3: no Core Zone writes)
- **Editors** can approve/reject but CANNOT publish to production
- **Admins** have full control including publish and rollback

### 3.4 Rejection & Rollback

**Rejection** (Editor action):
- State: Under Review → Draft
- Required field: `rejection_reason` (text, max 500 chars)
- The rejected version returns to Draft state for Agent to fix
- Rejection is logged in `reviewed_by`, `reviewed_at`, `rejection_reason`

**Rollback** (Admin action):
- State: Published → Approved (revert to previous approved version)
- Use case: Critical bug found in Published version, need to revert quickly
- Process:
  1. Admin selects "Rollback" on current Published version
  2. System finds the previous version in same `version_group_id` where `workflow_status='approved'`
  3. Current Published version: set `is_current_version=FALSE`, `workflow_status='archived'`
  4. Previous Approved version: set `is_current_version=TRUE`, `workflow_status='published'`
- Rollback is logged with Admin ID and timestamp

### 3.5 Parent-Child Hierarchies & State Rules

**Purpose**: Enable long documents to be split into parent + children sections while maintaining version control and workflow consistency.

**Model**: Option A (Minimal)
- Use `parent_document_id` (self-FK) and `child_order` fields in same `knowledge_documents` collection
- No separate collection needed
- Simpler queries, easier migration

**Hierarchy Structure**:
- **Parent documents**: `parent_document_id = NULL`, represent the main/root document
- **Child documents**: `parent_document_id = {parent_id}`, represent sections/chapters
- **Depth limit**: Only 1 level (parent → children). No grandchildren allowed to keep structure simple.

**Version Grouping & Inheritance**:
- **Rule 1**: Children MUST inherit `version_group_id` from parent at creation time
- **Rule 2**: When a parent creates a new version:
  - New parent version gets `version_group_id` (inherited or newly generated)
  - ALL children must be duplicated with same `version_group_id`
  - Each child's `version_number` increments in sync with parent
- **Rule 3**: Standalone child versions NOT allowed - children always version together with parent

**Workflow State Rules**:

**Rule W1: State Inheritance (Simple & Safe)**
- Children automatically inherit workflow state from parent
- When parent transitions Draft → Under Review, all children transition too
- When parent is Approved, all children become Approved
- When parent is Published, all children become Published
- **Rationale**: Prevents inconsistent states (e.g., Published child with Draft parent)

**Rule W2: No Independent Child Publishing**
- Children CANNOT be published individually
- Only the parent can be published (which publishes all children atomically)
- **Rationale**: Ensures complete document always shows together

**Rule W3: Child Editing & Rejection**
- Agents/Editors CAN edit individual child Draft documents
- If any child has issues, Editor rejects THE ENTIRE parent-children group back to Draft
- `rejection_reason` can mention specific child sections that need fixes
- **Rationale**: Simpler review process, clearer accountability

**Rule W4: Orphan Prevention**
- If parent is deleted (or archived), children are cascade deleted (or archived)
- NO orphaned children allowed (constraint enforced by FK cascade)
- **Rationale**: Prevents broken hierarchies

**Rule W5: Current Version Consistency**
- `is_current_version=TRUE` must apply to ENTIRE family (parent + all children) or none
- When new version is published, ALL family members (parent + children) get `is_current_version=TRUE`
- Previous family members ALL get `is_current_version=FALSE`
- **Rationale**: Ensures Nuxt always fetches complete, consistent document set

**Publishing Example Workflow**:

1. Agent creates parent Draft (doc A) + 3 children Drafts (sections A1, A2, A3)
2. All 4 documents: `version_group_id = UUID-X`, `version_number = 1`, `workflow_status = draft`
3. Agent submits parent A for review → ALL 4 transition to `under_review`
4. Editor reviews, finds issue in A2, rejects entire group → ALL 4 back to `draft` with `rejection_reason = "Section A2 needs clarification on XYZ"`
5. Agent fixes A2, re-submits parent A → ALL 4 to `under_review` again
6. Editor approves → ALL 4 to `approved`
7. Admin publishes parent A → ALL 4 to `published`, `is_current_version = TRUE`
8. Later, Agent creates new version of parent (A v2) → system auto-creates A1 v2, A2 v2, A3 v2 all as `draft`, `version_group_id = UUID-X`, `version_number = 2`

**Constraints Summary**:
- `parent_document_id` must reference valid document in same collection (self-FK)
- No cycles allowed (doc cannot be ancestor of itself)
- Children inherit `version_group_id` from parent
- Children inherit `workflow_status` from parent (enforced via application logic or triggers)
- Unique constraint: `UNIQUE(parent_document_id, child_order)` where parent_document_id IS NOT NULL
- Cascade delete: when parent deleted, children auto-delete

---

## 4. Directus Data Model (Collections & Fields)

### 4.1 Collection: `knowledge_documents` (Modified)

**Existing Fields** (retained from docs/directus_schema_gd1.md):
- `id` (UUID, PK)
- `status` (String, dropdown) – **NOTE**: This is the legacy Directus system status. Will be replaced by `workflow_status` in new design. Migration strategy: map old `status` to new `workflow_status` during 0047C implementation.
- `title`, `slug`, `summary`, `content`, `content_ref`, `language`, `tags`, `category`, `visibility`
- `source_of_truth`, `source_system`, `source_url`, `edit_permission`, `owner_team`
- `date_created`, `date_updated`, `user_created`, `user_updated`
- `published_at`, `archived_at`
- `version` (Integer) – **NOTE**: This is the legacy simple version counter. Will be replaced by `version_number` and `version_group_id` in new design.
- `notes`

**New Fields to Add** (13 fields for workflow, versioning & parent-child):

| Field Name | Type | Nullable | Default | Description |
|------------|------|----------|---------|-------------|
| **`workflow_status`** | String (dropdown) | No | `draft` | Current workflow state: `draft`, `under_review`, `approved`, `published`, `archived` |
| **`version_group_id`** | UUID | No | Auto-generated | Groups all versions of the same logical document. First version creates new UUID; subsequent versions inherit. |
| **`version_number`** | Integer | No | 1 | Sequential version number within the group (1, 2, 3...). Auto-increment on new version creation. |
| **`is_current_version`** | Boolean | No | FALSE | TRUE for the currently active version in the group. Only ONE version per group can have TRUE. |
| **`previous_version_id`** | UUID (FK to self) | Yes | NULL | Links to the previous version in the version chain. NULL for first version. |
| **`reviewed_by`** | UUID (FK to directus_users) | Yes | NULL | Editor who reviewed the document (set when transitioning to Approved or rejecting to Draft). |
| **`reviewed_at`** | Timestamp | Yes | NULL | When the document was reviewed. |
| **`approved_by`** | UUID (FK to directus_users) | Yes | NULL | Editor who approved the document (set when transitioning to Approved). |
| **`approved_at`** | Timestamp | Yes | NULL | When the document was approved. |
| **`publisher_id`** | UUID (FK to directus_users) | Yes | NULL | Admin who published the document (set when transitioning to Published). |
| **`rejection_reason`** | Text | Yes | NULL | Reason for rejection (populated when Editor rejects from Under Review to Draft). Max 500 chars. |
| **`purge_after`** | Timestamp | Yes | NULL | Scheduled purge timestamp for old revisions. NULL means never purge (e.g., Published/Archived with is_current_version=TRUE). |
| **`parent_document_id`** | UUID (FK to self) | Yes | NULL | For hierarchical documents: points to the parent document. NULL for standalone/root documents. Enables long documents to be split into parent + children sections. |
| **`child_order`** | Integer | Yes | NULL | For child documents: display order among siblings (1, 2, 3...). NULL for standalone/root documents. Used by Nuxt to render children in stable sequence. |

### 4.2 Field Constraints & Validation

**workflow_status dropdown options**:
```json
{
  "choices": {
    "draft": "Draft",
    "under_review": "Under Review",
    "approved": "Approved",
    "published": "Published",
    "archived": "Archived"
  }
}
```

**version_group_id generation**:
- On first version creation: Generate new UUID
- On subsequent version creation: Copy `version_group_id` from source version

**version_number increment logic**:
- On new version creation: `MAX(version_number) + 1` within same `version_group_id`

**is_current_version uniqueness**:
- Enforce via application logic OR database trigger: Only one row per `version_group_id` can have `is_current_version=TRUE`
- When setting a new version to `is_current_version=TRUE`, automatically set all other versions in the group to FALSE

**purge_after calculation**:
- For `workflow_status IN ('draft', 'under_review', 'approved')`:
  - Set `purge_after = MAX(date_created, date_updated) + 7 days` OR when version count exceeds 10 (whichever is earlier)
- For `workflow_status IN ('published', 'archived')` with `is_current_version=TRUE`:
  - Set `purge_after = NULL` (never purge)
- For `workflow_status IN ('published', 'archived')` with `is_current_version=FALSE`:
  - Set `purge_after = date_updated + 30 days` (long retention for audit)

**parent_document_id constraints**:
- Must reference a valid document ID in same collection (self-FK)
- MUST NOT create cycles: a document cannot be ancestor of itself (enforce via check before insert/update)
- Children must inherit `version_group_id` from parent at creation time
- Orphaned children (parent deleted) should either: (A) auto-delete cascade OR (B) set parent_document_id=NULL and promote to standalone (decision: use A for safety)

**child_order constraints**:
- Required (NOT NULL) if `parent_document_id IS NOT NULL`
- Must be NULL if `parent_document_id IS NULL` (standalone documents)
- Unique per parent: no two children of same parent can have same child_order
- Enforce via unique constraint: `UNIQUE(parent_document_id, child_order)` where parent_document_id IS NOT NULL

### 4.3 Index Recommendations

**Index 1**: Fetch current published version by taxonomy
```sql
CREATE INDEX idx_current_published
ON knowledge_documents (workflow_status, is_current_version, category, language, visibility);
```
**Purpose**: Optimize Nuxt query: `workflow_status='published' AND is_current_version=TRUE AND category='X' AND language='vn' AND visibility='public'`

**Index 2**: List version history for a document group
```sql
CREATE INDEX idx_version_history
ON knowledge_documents (version_group_id, version_number DESC);
```
**Purpose**: Quickly retrieve all versions of a document, sorted by version number

**Index 3**: Find versions pending purge
```sql
CREATE INDEX idx_purge_candidates
ON knowledge_documents (purge_after)
WHERE purge_after IS NOT NULL;
```
**Purpose**: Efficiently select versions where `purge_after <= NOW()` for scheduled purge job

**Index 4**: Workflow status for admin dashboards
```sql
CREATE INDEX idx_workflow_dashboard
ON knowledge_documents (workflow_status, date_updated DESC);
```
**Purpose**: Support admin queries like "show all documents Under Review, sorted by latest update"

**Index 5**: User approval tracking
```sql
CREATE INDEX idx_approval_tracking
ON knowledge_documents (approved_by, approved_at DESC);
```
**Purpose**: Enable queries like "show all documents approved by Editor X"

**Index 6**: Parent-Child hierarchy navigation
```sql
CREATE INDEX idx_parent_child_hierarchy
ON knowledge_documents (parent_document_id, child_order)
WHERE parent_document_id IS NOT NULL;
```
**Purpose**: Efficiently fetch all children of a parent document, sorted by display order

---

## 5. Retention & Purge Policy

### 5.1 Retention Rules

**Rule 1**: Unpublished versions (Draft, Under Review, Approved)
- **Retention**: Max 10 revisions per `version_group_id` OR 7 days from `date_updated` (whichever comes first)
- **Rationale**: Prevent accumulation of work-in-progress versions that bloat database

**Rule 2**: Published/Archived versions (current)
- **Retention**: NEVER purge if `is_current_version=TRUE`
- **Rationale**: These are the "live" or "latest archived" versions; must be retained indefinitely for SSOT

**Rule 3**: Published/Archived versions (superseded)
- **Retention**: 30 days from when replaced (i.e., when `is_current_version` was set to FALSE)
- **Rationale**: Provide reasonable audit window for rollback/history review

### 5.2 Purge Logic

**Trigger**: Scheduled job (Directus Flow or external cron) runs every 6 hours

**Query to identify purge candidates**:
```sql
SELECT id, version_group_id, workflow_status, version_number, purge_after
FROM knowledge_documents
WHERE purge_after IS NOT NULL
  AND purge_after <= NOW()
ORDER BY version_group_id, version_number;
```

**Purge Process**:
1. For each `version_group_id`, check if version count exceeds 10:
   ```sql
   SELECT COUNT(*) AS version_count
   FROM knowledge_documents
   WHERE version_group_id = ?
     AND workflow_status IN ('draft', 'under_review', 'approved');
   ```
2. If `version_count > 10`, purge oldest versions until count = 10:
   ```sql
   DELETE FROM knowledge_documents
   WHERE version_group_id = ?
     AND workflow_status IN ('draft', 'under_review', 'approved')
     AND is_current_version = FALSE
   ORDER BY version_number ASC
   LIMIT (version_count - 10);
   ```
3. Also purge any versions where `purge_after <= NOW()`:
   ```sql
   DELETE FROM knowledge_documents
   WHERE purge_after IS NOT NULL
     AND purge_after <= NOW()
     AND is_current_version = FALSE;
   ```

**Safety Checks**:
- NEVER delete where `is_current_version=TRUE`
- NEVER delete Published/Archived without explicitly setting `purge_after` (must be manual Admin action)
- Log all purge operations to audit table (or Cloud Logging)

### 5.3 Purge Job Implementation Options

**Option A**: Directus Flow (Recommended)
- Use Directus Flows to create a scheduled workflow
- Trigger: Cron expression `0 */6 * * *` (every 6 hours)
- Actions:
  1. Query purge candidates using Directus Query operation
  2. For each candidate, execute Delete operation
  3. Log results to Directus activity log

**Option B**: Cloud Scheduler + Cloud Function
- Deploy a Cloud Function that connects to Directus DB (read-only for Directus API, direct SQL for purge if needed)
- Trigger via Cloud Scheduler every 6 hours
- Pros: More control, can use direct SQL for efficiency
- Cons: External dependency, requires GCP setup

**Option C**: Directus Extension (Advanced)
- Build a custom Directus extension (hook or endpoint) for purge logic
- Trigger via external cron job or internal scheduled task
- Pros: Full control, can integrate with Directus internals
- Cons: Requires extension development, maintenance burden

**Recommendation**: Start with Option A (Directus Flow) for simplicity. If performance issues arise (e.g., large batches), migrate to Option B or C.

---

## 6. Integration with Taxonomy & Nuxt UI

### 6.1 Compatibility with Tasks 0036/0037

**Task 0036 Taxonomy Design** defined:
- Categories: Giá trị/Value, Pháp lý/Law, Hành động/Action, Kỹ năng/Skill
- Zones: 17 zones mapped to 4 categories
- Topics: Flexible tags derived from `tags` field

**Task 0037 Taxonomy UI** implemented:
- `useTaxonomyTree` composable fetches published documents
- Filter: `status='published' AND visibility='public'`
- Menu renders: Category → Zone → Topic hierarchy

**Integration Points**:

**Change 1**: Update `useTaxonomyTree` filter
```typescript
// OLD (Task 0037)
filter: {
  status: { _eq: 'published' },
  visibility: { _eq: 'public' },
}

// NEW (Task 0047D)
filter: {
  workflow_status: { _eq: 'published' },
  is_current_version: { _eq: true },
  visibility: { _eq: 'public' },
}
```

**Change 2**: Update `useKnowledgeList` filter
```typescript
// OLD
filter: {
  status: { _eq: 'published' },
  ...taxonomyFilters
}

// NEW
filter: {
  workflow_status: { _eq: 'published' },
  is_current_version: { _eq: true },
  ...taxonomyFilters
}
```

**Change 3**: Add version history UI (optional enhancement)
- In `knowledge/[id].vue`, add a "View History" button for Editors/Admins
- Query all versions: `version_group_id = current_document.version_group_id ORDER BY version_number DESC`
- Display list with `workflow_status`, `version_number`, `date_updated`, `reviewed_by`

### 6.2 Nuxt Read-Path Query

#### 6.2.1 Standard Query (Standalone Documents)

**Standard read query** for displaying published documents:
```typescript
// web/composables/usePublishedKnowledge.ts
export const usePublishedKnowledge = (filters: KnowledgeFilters) => {
  const baseFilter = {
    workflow_status: { _eq: 'published' },
    is_current_version: { _eq: true },
    visibility: { _eq: 'public' },
  };

  return useAsyncData(
    'published-knowledge',
    () => useDirectus(
      readItems('knowledge_documents', {
        filter: { ...baseFilter, ...filters },
        fields: ['id', 'title', 'slug', 'summary', 'category', 'tags', 'language'],
        limit: 50,
      })
    ),
    { watch: [filters] }
  );
};
```

**Performance**: With `idx_current_published` index, this query should complete in <100ms for typical result sets (10-50 documents).

#### 6.2.2 Hierarchical Document Query (Parent + Children)

**Purpose**: Fetch a complete hierarchical document (parent + children sections) for display on Nuxt.

**Strategy**:
1. Fetch parent document by slug/ID with published + current filter
2. Fetch all children of that parent, also published + current, ordered by `child_order`
3. Combine in UI: render parent at top, children below in order

**Implementation**:
```typescript
// web/composables/useHierarchicalDocument.ts
export const useHierarchicalDocument = (slug: string) => {
  const baseFilter = {
    workflow_status: { _eq: 'published' },
    is_current_version: { _eq: true },
    visibility: { _eq: 'public' },
  };

  // Query 1: Fetch parent document
  const { data: parent } = await useAsyncData(
    `document-${slug}`,
    () => useDirectus(
      readItems('knowledge_documents', {
        filter: {
          ...baseFilter,
          slug: { _eq: slug },
          parent_document_id: { _null: true }, // Only root/parent documents
        },
        fields: ['id', 'title', 'slug', 'content', 'summary', 'category', 'language', 'tags'],
        limit: 1,
      })
    ),
    { transform: (data) => data[0] }
  );

  // Query 2: Fetch children (if parent exists)
  const { data: children } = await useAsyncData(
    `document-${slug}-children`,
    () => {
      if (!parent.value?.id) return [];

      return useDirectus(
        readItems('knowledge_documents', {
          filter: {
            ...baseFilter,
            parent_document_id: { _eq: parent.value.id },
          },
          fields: ['id', 'title', 'slug', 'content', 'summary', 'child_order'],
          sort: ['child_order'], // Order by child_order ASC
        })
      );
    },
    { watch: [parent] }
  );

  return {
    parent,
    children,
    isHierarchical: computed(() => (children.value?.length ?? 0) > 0),
  };
};
```

**Display Pattern** (Nuxt page):
```vue
<template>
  <div v-if="parent" class="document-container">
    <!-- Parent document -->
    <article class="parent-doc">
      <h1>{{ parent.title }}</h1>
      <div v-html="parent.content"></div>
    </article>

    <!-- Children sections (if any) -->
    <nav v-if="isHierarchical" class="child-nav">
      <h2>Sections</h2>
      <ul>
        <li v-for="child in children" :key="child.id">
          <a :href="`#section-${child.slug}`">{{ child.title }}</a>
        </li>
      </ul>
    </nav>

    <div v-if="isHierarchical" class="children-sections">
      <article
        v-for="child in children"
        :key="child.id"
        :id="`section-${child.slug}`"
        class="child-section"
      >
        <h2>{{ child.title }}</h2>
        <div v-html="child.content"></div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { parent, children, isHierarchical } = await useHierarchicalDocument(route.params.slug as string);
</script>
```

**Query Performance**:
- **Query 1** (parent): Uses `idx_current_published` + slug lookup → <50ms
- **Query 2** (children): Uses `idx_parent_child_hierarchy` + published filter → <50ms
- **Total**: ~100ms for parent + children (acceptable for SSR/ISR)

**Filter Combination with Taxonomy** (Tasks 0036/0037):
- Add taxonomy filters (`category`, `tags`, `language`) to baseFilter as needed
- Parent and children will both respect same taxonomy constraints
- Example: fetch parent + children where `category='Law'` AND `language='vn'`

**URL Strategy**:
- **Option A (Flat)**: `/knowledge/:slug` - fetch parent, check for children, render both
- **Option B (Explicit child)**: `/knowledge/:parent_slug/:child_slug` - direct child navigation
- **Recommendation**: Use Option A for simplicity; anchor links `#section-{child_slug}` for navigation within page

### 6.3 Agent Data Integration (Task 0048)

**Rule**: Only Published documents with `is_current_version=TRUE` are indexed into Qdrant/Agent Data search engine.

**Indexing Trigger** (Directus webhook):
```typescript
// Trigger: knowledge_documents.items.update
if (payload.workflow_status === 'published' && payload.is_current_version === true) {
  // Send to Agent Data for embedding & indexing
  await fetch('https://agent-data-api/index', {
    method: 'POST',
    body: JSON.stringify({
      document_id: payload.id,
      version_group_id: payload.version_group_id,
      version_number: payload.version_number,
      content: payload.content,
      metadata: {
        title: payload.title,
        category: payload.category,
        language: payload.language,
      },
    }),
  });
}
```

**De-indexing Trigger**:
- When a document transitions from Published to Archived: Remove from Agent Data index
- When a new version is published (`is_current_version=TRUE` changes): Update existing index entry (or delete old + insert new)

---

## 7. Rollout Plan & Tasks (0047B-0047G)

### Task Breakdown

| Task ID | Description | Estimated Effort | Dependencies |
|---------|-------------|------------------|--------------|
| **0047B** | Senior review & LAW alignment (this review) | 1-2 hours | 0047A design doc |
| **0047C** | Directus schema migration + RBAC config | 4-6 hours | 0047B approval |
| **0047D** | Nuxt UI updates (filter changes, version history) | 3-4 hours | 0047C complete |
| **0047E** | Purge job implementation (Directus Flow) | 2-3 hours | 0047C complete |
| **0047F** | Agent Data webhook integration | 3-4 hours | 0047C, 0047E complete |
| **0047G** | Testing & documentation | 2-3 hours | 0047D, 0047E, 0047F complete |

**Total Estimated Effort**: 15-22 hours across 6 subtasks

### 0047C: Directus Schema Migration + RBAC

**Deliverables**:
1. SQL migration script to add 13 new fields to `knowledge_documents` (11 workflow/versioning + 2 parent-child)
2. Data migration script to populate `version_group_id`, `version_number` from existing `id`, `version`
3. Default values: Set `workflow_status` based on old `status`, `is_current_version=TRUE` for all (assume all existing docs are "current")
4. **Parent-Child migration** (see subsection below)
5. Directus RBAC configuration:
   - Create 3 roles: `agent`, `editor`, `admin`
   - Set permissions per role matrix (Section 3.3)
   - Deny Agents from UPDATE/DELETE on `knowledge_documents`
6. Create indexes (Section 4.3, including new `idx_parent_child_hierarchy`)
7. Enable Content Versioning on `knowledge_documents` collection in Directus settings
8. Testing: Verify role permissions, query performance, parent-child hierarchy queries

**Risks**:
- Data migration may fail if existing data has integrity issues (duplicate `id`, missing `version`)
- RBAC misconfiguration could block legitimate users or allow unauthorized actions
- Legacy documents may need manual review to identify parent-child relationships

**Mitigation**:
- Dry-run migration on staging environment first
- Backup database before migration
- Test RBAC with all 3 roles before deploying to prod

#### 0047C.1 Parent-Child Migration Strategy

**Goal**: Onboard existing documents without data loss, assigning parent-child relationships where applicable.

**Approach**: Semi-automated with manual review option.

**Step 1: Identify Legacy Parent-Child Candidates**

**Heuristics** to detect potential parent-child groups in legacy data:
1. **Naming convention**: Documents with titles like "Policy ABC - Part 1", "Policy ABC - Part 2" → likely children of "Policy ABC"
2. **Metadata tags**: Documents with same `category` + similar `tags` + sequential suffixes → potential siblings
3. **Content ref**: If legacy schema has `content_ref` or `parent_ref` field → direct indicator
4. **Manual curation list**: Admin provides CSV/JSON mapping: `{parent_id: [child_id_1, child_id_2, ...]}`

**Implementation** (SQL + script):
```sql
-- Example: detect documents with pattern "XXX - Part N"
SELECT
  id,
  title,
  REGEXP_REPLACE(title, ' - Part [0-9]+$', '') AS potential_parent_title
FROM knowledge_documents
WHERE title LIKE '% - Part %'
  AND workflow_status = 'published';
```

**Step 2: Assign parent_document_id & child_order**

**Manual Review Required**:
- Generate candidate report (CSV/JSON) from Step 1
- Admin reviews and confirms/edits parent-child mappings
- Import validated mappings into staging table: `parent_child_migration_mapping`

**Automated Assignment**:
```sql
-- For each confirmed parent-child group in migration mapping:
-- 1. Identify/create parent document (if title-based, find or create parent)
-- 2. Update children with parent_document_id and child_order

UPDATE knowledge_documents
SET
  parent_document_id = (SELECT parent_id FROM parent_child_migration_mapping WHERE child_id = knowledge_documents.id),
  child_order = (SELECT child_order FROM parent_child_migration_mapping WHERE child_id = knowledge_documents.id)
WHERE id IN (SELECT child_id FROM parent_child_migration_mapping);
```

**Step 3: Version Group Synchronization**

**Rule**: Children must inherit `version_group_id` from parent.

**Process**:
```sql
-- For each child document with parent_document_id set:
-- Copy parent's version_group_id to child

UPDATE knowledge_documents AS child
SET version_group_id = (
  SELECT parent.version_group_id
  FROM knowledge_documents AS parent
  WHERE parent.id = child.parent_document_id
)
WHERE child.parent_document_id IS NOT NULL;
```

**Step 4: Validate Integrity**

**Validation Checks**:
1. **No cycles**: Ensure no document is its own ancestor
   ```sql
   -- Check for cycles (should return 0 rows)
   WITH RECURSIVE ancestry AS (
     SELECT id, parent_document_id, 1 AS depth
     FROM knowledge_documents
     WHERE parent_document_id IS NOT NULL
     UNION ALL
     SELECT a.id, k.parent_document_id, a.depth + 1
     FROM ancestry a
     JOIN knowledge_documents k ON k.id = a.parent_document_id
     WHERE a.depth < 10  -- Safety limit
   )
   SELECT id FROM ancestry WHERE id = parent_document_id;
   ```

2. **Unique child_order per parent**: Verify uniqueness constraint
   ```sql
   -- Check for duplicate child_order (should return 0 rows)
   SELECT parent_document_id, child_order, COUNT(*)
   FROM knowledge_documents
   WHERE parent_document_id IS NOT NULL
   GROUP BY parent_document_id, child_order
   HAVING COUNT(*) > 1;
   ```

3. **Consistent version_group_id**: Children match parent
   ```sql
   -- Check version_group_id mismatch (should return 0 rows)
   SELECT child.id, child.version_group_id, parent.version_group_id
   FROM knowledge_documents child
   JOIN knowledge_documents parent ON parent.id = child.parent_document_id
   WHERE child.version_group_id != parent.version_group_id;
   ```

4. **No orphans**: All children have valid parent
   ```sql
   -- Check for orphaned children (should return 0 rows after cleanup)
   SELECT id, parent_document_id
   FROM knowledge_documents
   WHERE parent_document_id IS NOT NULL
     AND parent_document_id NOT IN (SELECT id FROM knowledge_documents);
   ```

**Step 5: Handle Edge Cases**

**Edge Case 1**: Documents that can't be assigned parent-child
- **Action**: Leave `parent_document_id = NULL`, `child_order = NULL` (treat as standalone)
- **Rationale**: Better to have standalone docs than incorrect hierarchies

**Edge Case 2**: Legacy multi-level hierarchies (grandchildren)
- **Action**: Flatten to 1 level - promote grandchildren to be direct children of root parent
- **Rationale**: Design limits depth to 1 level (Section 3.5)

**Edge Case 3**: Documents with multiple potential parents
- **Action**: Manual decision required; default to standalone if ambiguous
- **Rationale**: Avoid duplicate/conflicting hierarchies

**Deliverable**: Migration report documenting:
- Total documents migrated
- Number of parent-child groups created
- Number of standalone documents
- List of ambiguous cases requiring manual review
- Validation check results (should all pass)

### 0047D: Nuxt UI Updates

**Deliverables**:
1. Update all `useDirectus` calls to filter by `workflow_status='published' AND is_current_version=TRUE`
2. Update `useTaxonomyTree`, `useKnowledgeList` composables (Section 6.1)
3. Add version history UI component (optional, for Editors/Admins only)
4. Update `knowledge/[id].vue` page to show version info if user is authenticated as Editor/Admin
5. Testing: Verify only published current versions are displayed to public users

**Risks**:
- Breaking changes if old `status` field is still referenced anywhere
- Performance regression if queries are not indexed properly

**Mitigation**:
- Grep for all `status: { _eq: 'published' }` references and update systematically
- Run `npm run build` to catch TypeScript errors
- Load test with 1000+ documents to verify query performance

### 0047E: Purge Job Implementation

**Deliverables**:
1. Directus Flow for scheduled purge (Option A) OR Cloud Function (Option B)
2. Purge logic following Section 5.2
3. Audit logging for all purge operations
4. Monitoring/alerting for purge job failures
5. Testing: Manually trigger purge job, verify old versions are deleted and current versions are retained

**Risks**:
- Purge job could accidentally delete Published/current versions if logic has bugs
- Job could hang or timeout on large batches

**Mitigation**:
- Add explicit safety checks (NEVER delete `is_current_version=TRUE`)
- Start with small batch sizes (10-50 versions per run)
- Monitor job execution time and adjust schedule if needed

### 0047F: Agent Data Webhook Integration

**Deliverables**:
1. Directus webhook: `knowledge_documents.items.update` → Agent Data API
2. Indexing trigger: Only for `workflow_status='published' AND is_current_version=TRUE`
3. De-indexing trigger: When document is archived or replaced
4. Testing: Publish a document, verify it appears in Agent Data search; archive it, verify it's removed

**Risks**:
- Webhook failures could cause inconsistency between Directus and Agent Data
- Race conditions if multiple versions are published simultaneously

**Mitigation**:
- Implement webhook retry logic (3 retries with exponential backoff)
- Use `version_group_id` + `version_number` as unique index key in Agent Data to prevent duplicates

### 0047G: Testing & Documentation

**Deliverables**:
1. End-to-end test scenarios:
   - Agent creates Draft → Editor reviews → Admin publishes → Verify visible on Nuxt
   - Agent creates Draft → Editor rejects → Agent edits → Re-submit → Approve → Publish
   - Admin rollbacks Published to previous Approved version
2. Performance tests: Query latency for current published version fetch
3. Purge job stress test: 1000+ old revisions, verify completion within 1 minute
4. Update user documentation (for Editors/Admins)
5. Update developer documentation (for future Agent developers)

---

## 8. Governance Compliance

### 8.1 Constitution Compliance

**HP-02: Documentation & Auditability**
- ✅ This design document satisfies HP-02 by providing complete specification before implementation
- All state transitions, role permissions, and data model changes are documented
- Implementation tasks (0047C-0047G) will produce migration scripts and config files in version control

**HP-CI-03: Artifact Retention**
- ✅ Purge policy (Section 5) enforces retention limits: 10 revisions OR 7 days for unpublished
- ✅ Published/Archived current versions are retained indefinitely (never purged)
- Published/Archived superseded versions retained for 30 days (exceeds 14-day minimum in HP-CI-03)

**HP-IaC: Infrastructure as Code**
- ✅ Directus schema changes will be tracked via migration scripts in `web/migrations/` (Task 0047C)
- ✅ RBAC configuration will be exported as JSON and committed to Git (Task 0047C)

### 8.2 Law of Data & Connection Compliance

**Điều 3: 3-Zone Schema (Core / Migration / Growth)**
- ✅ `knowledge_documents` is in Core Zone (SSOT for knowledge content)
- ✅ Agents CANNOT UPDATE/DELETE Core Zone collections (enforced via RBAC in Task 0047C)
- Agents can only CREATE new versions in Draft state; Editors/Admins handle approval/publishing
- **Parent-Child Impact**: Adding `parent_document_id` and `child_order` fields to Core Zone collection is schema evolution, not violation. Agents still cannot write directly to Core; all parent-child assignments follow same Draft → Review → Publish workflow.

**Điều 4: Directus as SSOT**
- ✅ Directus `knowledge_documents` collection remains the SSOT for all knowledge content
- Agent Data is a derived index (Growth Zone), not authoritative
- Nuxt is a read-only consumer, not a data source
- **Parent-Child Impact**: Hierarchical relationships (`parent_document_id`, `child_order`) are stored in Directus (SSOT), not Agent Data. Nuxt reads hierarchy from Directus API only (Section 6.2.2). No change to SSOT principle.

**Điều 20: Versioning & Purge**
- ✅ Max 10 revisions OR 7 days retention for unpublished (Section 5.1, Rule 1)
- ✅ Auto-purge job implemented via Directus Flow or Cloud Function (Section 5.3)
- ✅ Published/Archived current versions NEVER purged (Section 5.1, Rule 2)
- **Parent-Child Impact**: Purge rules apply to entire family (parent + children) as a unit. When purging old versions, check `is_current_version` for BOTH parent and children. Purge logic must handle parent-child cascade (if parent version is purged, corresponding children versions are also purged to maintain consistency). No change to retention policy limits.

**Điều 2: Assemble > Build**
- ✅ Design leverages Directus native Content Versioning (not a custom system)
- ✅ Purge job uses Directus Flows or Cloud Functions (standard GCP service)
- No custom versioning engine or diff algorithm is built
- **Parent-Child Impact**: Parent-child relationships use standard Directus foreign keys (self-FK) and native field types (UUID, Integer). No custom relationship engine required. Hierarchy queries use standard Directus API filters (`parent_document_id`, `child_order`). Fully aligned with "Assemble > Build" principle.

### 8.3 Task 0047 Requirements Compliance

From `docs/Web_List_to_do_01.md`, Task 0047-VERSIONING-STRATEGY:

- ✅ **(1) Use Directus Content Versioning**: Design specifies using Directus native versioning + custom workflow fields
- ✅ **(2) Nuxt displays published only**: Read-path filter = `workflow_status='published' AND is_current_version=TRUE` (Section 6.2)
- ✅ **(3) Do not build custom versioning**: Design extends Directus native features, not a parallel system
- ✅ **(4) Max 10 revisions OR 7 days**: Retention policy enforces this (Section 5.1, Rule 1)
- ✅ **(5) Enable auto-purge**: Purge job implementation specified (Section 5.2, 5.3)

---

## 9. Risks & Open Questions

### 9.1 Risks

| Risk ID | Description | Impact | Likelihood | Mitigation |
|---------|-------------|--------|------------|------------|
| **R-001** | Directus Content Versioning may not support custom workflow states | High | Medium | Validate in Task 0047C; fallback: use separate `workflow_history` table if needed |
| **R-002** | Purge job could delete wrong versions due to logic bug | Critical | Low | Extensive testing in Task 0047E; safety checks (never delete `is_current_version=TRUE`) |
| **R-003** | RBAC misconfiguration allows Agents to publish | High | Medium | Thorough testing of role permissions in Task 0047C; use Directus permission testing UI |
| **R-004** | Query performance degrades with 10K+ documents | Medium | Medium | Load testing in Task 0047G; add more indexes if needed |
| **R-005** | Rollback logic could fail if previous version is missing | Medium | Low | Enforce referential integrity for `previous_version_id`; add validation before rollback |
| **R-006** | Agent Data indexing gets out of sync with Directus | Medium | Medium | Implement webhook retry logic; periodic sync job to reconcile mismatches |
| **R-007** | Parent-child migration may create incorrect hierarchies from legacy data | Medium | Medium | Require manual review of auto-detected parent-child candidates (Section 7.0047C.1); validation checks before finalization |
| **R-008** | Purge job may orphan children if parent is purged but children are not | High | Low | Implement cascade purge logic: when purging parent version, automatically purge all children versions with same `version_group_id` + `version_number` |
| **R-009** | Performance degradation with deep queries (parent + many children) | Low | Medium | Limit children count per parent (recommend max 20); use `idx_parent_child_hierarchy` index; implement pagination for very large hierarchies |
| **R-010** | Inconsistent state if parent Published but child fails validation | Medium | Low | Enforce atomic state transitions for entire family (parent + children) via DB transaction; rollback all if any member fails |

### 9.2 Open Questions

**Q-001**: Should we allow multiple Editors to review the same document concurrently?
- **Options**: (A) Lock document when under review (B) Allow concurrent, last approval wins (C) Require consensus (multiple approvals)
- **Recommendation**: Start with (A) for simplicity; add (B) in future iteration if needed
- **Decision Owner**: Product team (to be decided in 0047B review)

**Q-002**: What happens to old versions when a new version is published?
- **Current Design**: Old version gets `is_current_version=FALSE`, remains in DB for 30 days (Rule 3)
- **Alternative**: Immediately archive old version when new version is published
- **Recommendation**: Stick with current design (30-day retention) for audit trail
- **Decision Owner**: Compliance team (if applicable)

**Q-003**: Should we support branching (multiple Draft versions of same document simultaneously)?
- **Current Design**: No branching; only one "latest" version can be Draft/Under Review at a time
- **Alternative**: Allow multiple Draft branches, Editor chooses which to approve
- **Recommendation**: Start without branching (simpler); add in future if user feedback demands it
- **Decision Owner**: Product team (to be decided in 0047B review)

**Q-004**: What level of detail should be logged for audit trail?
- **Current Design**: Directus activity log + `reviewed_by`, `approved_by`, `publisher_id` fields
- **Alternative**: Separate `workflow_history` table with full state transition log
- **Recommendation**: Start with current design; add separate table if audit requirements are strict
- **Decision Owner**: Compliance/Security team (to be decided in 0047B review)

**Q-005**: How to handle documents migrated from Larkbase with existing revision history?
- **Current Design**: Assume all migrated documents start as Published, `version_number=1`, no history
- **Alternative**: Import Larkbase revision history as separate versions in Directus
- **Recommendation**: Discuss with migration team; likely not worth the complexity
- **Decision Owner**: Migration task owner (Task 0048 or later)

---

## 10. Conclusion & Next Steps

### 10.1 Summary

This design document specifies a comprehensive Content Versioning & Approval Workflow for the `knowledge_documents` collection in Directus. The solution:
- Extends Directus native Content Versioning with 11 custom fields for workflow state, version grouping, and approval tracking
- Enforces a 5-state workflow (Draft → Under Review → Approved → Published → Archived) with role-based permissions (Agent/Editor/Admin)
- Implements a retention policy (max 10 revisions OR 7 days for unpublished) with auto-purge to prevent database bloat
- Maintains compatibility with existing taxonomy implementation (Tasks 0036/0037)
- Complies with Constitution (HP-02, HP-CI-03) and Law of Data & Connection (Điều 3, 4, 20)

**Key Strengths**:
- Leverages Directus native features (no custom versioning system)
- Clear RBAC prevents Agents from publishing (Core Zone protection)
- Explicit purge policy with safety checks protects current versions
- Well-defined rollback mechanism for emergency reverts
- Detailed implementation roadmap (Tasks 0047C-0047G)

**Key Limitations**:
- No branching support (only one active Draft per document group)
- No collaborative editing (no concurrent review by multiple Editors)
- Rollback only to previous Approved version (not arbitrary historical version)
- Purge job must be monitored to prevent accidental deletion

### 10.2 Decision Required

**This design document is submitted for senior review (Task 0047B) before any implementation begins.**

**Review Checklist for Codex/Reviewer**:
- [ ] State machine (Section 3) is complete and logical
- [ ] Role matrix (Section 3.3) enforces Law Điều 3 (Agents cannot write Core Zone)
- [ ] Data model (Section 4) includes all necessary fields and indexes
- [ ] Retention policy (Section 5) complies with Law Điều 20 (max 10 revisions / 7 days)
- [ ] Integration with taxonomy (Section 6) is backward-compatible
- [ ] Rollout plan (Section 7) is feasible and well-sequenced
- [ ] Governance compliance (Section 8) is verified against Constitution & Laws
- [ ] Risks (Section 9.1) are identified with mitigation plans
- [ ] Open questions (Section 9.2) are resolved or deferred appropriately

### 10.3 Next Steps

**IF APPROVED**:
1. Proceed to Task 0047C: Directus schema migration + RBAC configuration
2. Implement Tasks 0047D-0047G in sequence
3. Update this design document with any changes discovered during implementation

**IF REJECTED**:
1. Address change requests from reviewer (new PR with revised design)
2. Re-submit for senior review (Task 0047B-v2)
3. Do NOT proceed to implementation until design is approved

---

**Document Status**: READY FOR LAW REVIEW (Task 0047B)
**Author**: Claude (AI Assistant)
**Date**: 2025-12-03
**Version**: 1.0

🤖 Generated with [Claude Code](https://claude.com/claude-code)
