# Directus Schema for Giai đoạn 1 (GĐ1) - MySQL-First CMS

**Date**: 2025-11-17
**Phase**: Giai đoạn 1 – Hạ tầng & CMS (MySQL-First + Directus)
**Repo**: Huyen1974/web-test
**Directus Instance**: directus-test (https://directus-test-812872501910.asia-southeast1.run.app)

---

## Overview

This document defines the **core schema** for the Directus CMS in Giai đoạn 1 of the web-test project. The schema is designed to support a MySQL-first content management system that will serve as the foundation for:

1. **Knowledge management** - storing and organizing content for the web-test site
2. **Cross-system integration** - bridging Directus, Agent Data, and (eventually) Larkbase
3. **Simple web pages** - providing content and navigation structure for the Nuxt frontend

### Core Principles

The schema follows these fundamental principles established in Phụ lục F and SP-09:

- **Data entered exactly once**: Each piece of data has a single source of truth. No duplication across tables.
- **Metadata-rich**: Every record includes information about its origin (source_system), ownership, and edit permissions.
- **Human vs System tracking**: Clear distinction between human-generated and system-generated data.
- **Reusable design**: Small set of generic collections that can serve multiple purposes, rather than special-case tables.
- **Logging & observability**: All entities include created_by, updated_by, created_at, updated_at fields for audit trails.
- **i18n support**: Vietnamese (VN) and Japanese (JA) as first-class languages, with proper localization fields.
- **Future-ready**: Designed to integrate with Agent Data (read-only) and migrate from Larkbase without major redesign.

### Implementation Method

**IMPORTANT**: This schema must be created **manually via Directus UI** by the operator. Agents are permitted to design and document the schema, but **NOT** to create or modify database schema programmatically via API or code.

The implementation checklist will be documented separately in Task 0026B.

---

## Collection 1: `knowledge_documents`

### Purpose

The `knowledge_documents` collection is the **primary content repository** for the web-test site. It stores reusable knowledge content that can be:
- Displayed on web pages
- Queried by Agent Data for context
- Migrated from Larkbase over time
- Localized in multiple languages (VN, JA)

This is the **source of truth** for all knowledge content. Other systems (Agent Data, Larkbase) may reference or sync from this collection, but edits should only happen here.

### Field Specification

| Field Name | Type | Nullable | Default | Description |
|------------|------|----------|---------|-------------|
| **`id`** | UUID | No | Auto-generated | Primary key (Directus default UUID) |
| **`status`** | String (dropdown) | No | `draft` | Publication status: `draft`, `published`, `archived` |
| **`sort`** | Integer | Yes | NULL | Manual sort order for display |
| **`date_created`** | Timestamp | No | Auto | Record creation timestamp (Directus system field) |
| **`date_updated`** | Timestamp | Yes | Auto | Record last update timestamp (Directus system field) |
| **`user_created`** | UUID (FK to directus_users) | Yes | Auto | User who created this record (Directus system field) |
| **`user_updated`** | UUID (FK to directus_users) | Yes | Auto | User who last updated this record (Directus system field) |
| | | | | |
| **`title`** | String (255) | No | - | Document title (language-specific, see i18n section) |
| **`slug`** | String (255) | No | - | URL-friendly identifier (unique, auto-generated from title if blank) |
| **`summary`** | Text | Yes | NULL | Short summary or excerpt (plain text, max 500 chars recommended) |
| **`content`** | Rich Text (WYSIWYG) | Yes | NULL | Main content body (Directus WYSIWYG editor) |
| **`content_ref`** | String (500) | Yes | NULL | Optional external reference (e.g., Google Doc ID, file path, Agent Data ID) |
| **`language`** | String (dropdown) | No | `vn` | Content language: `vn` (Vietnamese), `ja` (Japanese), `en` (English - future) |
| **`tags`** | JSON | Yes | NULL | Free-form tags for categorization (array of strings, e.g., `["tech", "tutorial"]`) |
| **`category`** | String (dropdown) | Yes | NULL | Primary category: `guide`, `faq`, `reference`, `article`, `other` |
| **`visibility`** | String (dropdown) | No | `public` | Access level: `public`, `internal`, `restricted` |
| | | | | |
| **`source_of_truth`** | String (dropdown) | No | `directus` | Where this data is primarily managed: `directus`, `larkbase`, `agent_data`, `external` |
| **`source_system`** | String (100) | Yes | NULL | Original system identifier (e.g., `larkbase:base_id:record_id`, `agent_data:doc_123`) |
| **`source_url`** | String (500) | Yes | NULL | URL to original source (if applicable) |
| **`edit_permission`** | String (dropdown) | No | `content_team` | Who can edit: `admin`, `content_team`, `system_only`, `read_only` |
| **`owner_team`** | String (100) | Yes | NULL | Team responsible for this content (e.g., `Marketing`, `Engineering`, `Support`) |
| | | | | |
| **`published_at`** | Timestamp | Yes | NULL | When the document was published (NULL if status != published) |
| **`archived_at`** | Timestamp | Yes | NULL | When the document was archived (NULL if status != archived) |
| **`version`** | Integer | No | 1 | Version number (increment on major edits) |
| **`notes`** | Text | Yes | NULL | Internal notes for editors (not displayed to public) |

### Relationships

- **Many-to-Many with `pages`**: A knowledge_document can appear on multiple pages, and a page can reference multiple documents
  - Implement via junction table: `pages_knowledge_documents`
  - Fields: `id`, `pages_id` (FK), `knowledge_documents_id` (FK), `sort` (for ordering docs on a page)

- **One-to-Many with `id_mapping_registry`**: A knowledge_document can have multiple ID mappings to external systems
  - Foreign key: `id_mapping_registry.target_id` → `knowledge_documents.id` (when `target_type = 'knowledge_document'`)

### i18n Approach for `knowledge_documents`

**Option 1: Language-specific records** (RECOMMENDED for GĐ1)
- Each language version is a separate record in `knowledge_documents`
- Use `language` field to distinguish: `vn`, `ja`, `en`
- Use `slug` with language prefix: `vn-intro-directus`, `ja-intro-directus`
- Link related language versions via `tags` or a custom `translation_group` field (optional)

**Option 2: Directus Translations interface** (Future enhancement)
- Leverage Directus built-in translations feature
- Requires configuring `title`, `summary`, `content` as translatable fields
- Deferred to GĐ2/GĐ3 for simplicity in GĐ1

**Rationale**: Option 1 is simpler for manual UI creation and doesn't require complex Directus translation setup. Future migration to Option 2 is straightforward.

### Example Records

**Record 1: Vietnamese Guide**
```json
{
  "id": "a1b2c3d4-...",
  "status": "published",
  "title": "Hướng dẫn sử dụng Directus CMS",
  "slug": "vn-huong-dan-directus",
  "summary": "Tài liệu hướng dẫn cơ bản về Directus CMS cho nhóm nội dung",
  "content": "<p>Nội dung chi tiết...</p>",
  "language": "vn",
  "tags": ["guide", "cms", "tutorial"],
  "category": "guide",
  "visibility": "public",
  "source_of_truth": "directus",
  "edit_permission": "content_team",
  "owner_team": "Marketing",
  "published_at": "2025-11-17T10:00:00Z",
  "version": 1
}
```

**Record 2: Japanese FAQ (migrated from Larkbase)**
```json
{
  "id": "e5f6g7h8-...",
  "status": "published",
  "title": "よくある質問：Agent Data連携",
  "slug": "ja-faq-agent-data",
  "summary": "Agent Dataとの連携に関するよくある質問",
  "content": "<p>詳細な説明...</p>",
  "language": "ja",
  "tags": ["faq", "agent-data"],
  "category": "faq",
  "visibility": "public",
  "source_of_truth": "directus",
  "source_system": "larkbase:base_abc123:record_xyz789",
  "source_url": "https://larkbase.example.com/base/abc123/record/xyz789",
  "edit_permission": "content_team",
  "owner_team": "Support",
  "published_at": "2025-11-17T11:30:00Z",
  "version": 2,
  "notes": "Migrated from Larkbase on 2025-11-17, original record preserved for reference"
}
```

### Data Entry Principles for `knowledge_documents`

1. **Single entry point**: Content editors create/update records ONLY in Directus UI
2. **Human-generated**: All `title`, `summary`, `content` fields are human-written (not auto-generated)
3. **System-generated**: `id`, `date_created`, `date_updated`, `user_created`, `user_updated` are auto-managed by Directus
4. **Edit permissions**: Enforced via Directus roles and `edit_permission` field (checked by frontend/API)
5. **Larkbase migration**: When migrating from Larkbase:
   - Set `source_of_truth = "directus"` (Directus becomes new source of truth)
   - Populate `source_system` and `source_url` to reference original Larkbase record
   - Add note in `notes` field documenting migration date and original location

---

## Collection 2: `id_mapping_registry`

### Purpose

The `id_mapping_registry` collection provides a **centralized mapping table** between identifiers across different systems:
- Directus collections (e.g., knowledge_documents, pages)
- Agent Data IDs
- Larkbase base/record IDs
- External tool IDs (future: Notion, Airtable, etc.)

This collection ensures that when data is referenced across systems, we have a single, authoritative mapping that prevents ID conflicts and supports future integrations.

### Field Specification

| Field Name | Type | Nullable | Default | Description |
|------------|------|----------|---------|-------------|
| **`id`** | UUID | No | Auto-generated | Primary key (Directus default UUID) |
| **`status`** | String (dropdown) | No | `active` | Mapping status: `active`, `inactive`, `deprecated` |
| **`date_created`** | Timestamp | No | Auto | Record creation timestamp (Directus system field) |
| **`date_updated`** | Timestamp | Yes | Auto | Record last update timestamp (Directus system field) |
| **`user_created`** | UUID (FK to directus_users) | Yes | Auto | User who created this mapping (Directus system field) |
| **`user_updated`** | UUID (FK to directus_users) | Yes | Auto | User who last updated this mapping (Directus system field) |
| | | | | |
| **`source_system`** | String (100) | No | - | Source system identifier: `directus`, `larkbase`, `agent_data`, `notion`, `external` |
| **`source_type`** | String (100) | No | - | Source entity type: `knowledge_document`, `page`, `menu_item`, `base`, `record`, `table`, etc. |
| **`source_id`** | String (255) | No | - | Source entity ID (UUID, external ID, record ID, etc.) |
| **`source_metadata`** | JSON | Yes | NULL | Additional source context (e.g., `{"base_id": "abc123", "table_name": "docs"}`) |
| | | | | |
| **`target_system`** | String (100) | No | - | Target system identifier (same options as source_system) |
| **`target_type`** | String (100) | No | - | Target entity type (same options as source_type) |
| **`target_id`** | String (255) | No | - | Target entity ID |
| **`target_metadata`** | JSON | Yes | NULL | Additional target context |
| | | | | |
| **`mapping_direction`** | String (dropdown) | No | `bidirectional` | Mapping direction: `bidirectional`, `source_to_target`, `target_to_source` |
| **`mapping_type`** | String (dropdown) | No | `one_to_one` | Mapping cardinality: `one_to_one`, `one_to_many`, `many_to_one`, `many_to_many` |
| **`sync_status`** | String (dropdown) | No | `manual` | Sync status: `manual`, `auto_sync`, `sync_paused`, `sync_error` |
| **`last_sync_at`** | Timestamp | Yes | NULL | Last successful sync timestamp (if auto_sync) |
| | | | | |
| **`priority`** | Integer | No | 100 | Mapping priority (lower = higher priority, for conflict resolution) |
| **`notes`** | Text | Yes | NULL | Internal notes about this mapping |
| **`created_reason`** | String (dropdown) | No | `manual` | Why this mapping was created: `manual`, `migration`, `auto_detected`, `api_sync` |

### Unique Constraints

**Composite unique constraint**: (`source_system`, `source_type`, `source_id`, `target_system`, `target_type`, `target_id`)
- Ensures no duplicate mappings for the same source→target pair
- Implement via Directus unique validation or database-level constraint

### Example Records

**Mapping 1: Directus knowledge_document → Larkbase record**
```json
{
  "id": "map-001",
  "status": "active",
  "source_system": "directus",
  "source_type": "knowledge_document",
  "source_id": "a1b2c3d4-...",
  "source_metadata": {"collection": "knowledge_documents"},
  "target_system": "larkbase",
  "target_type": "record",
  "target_id": "rec_xyz789",
  "target_metadata": {"base_id": "base_abc123", "table_name": "知識ドキュメント"},
  "mapping_direction": "bidirectional",
  "mapping_type": "one_to_one",
  "sync_status": "manual",
  "priority": 100,
  "created_reason": "migration",
  "notes": "Migrated from Larkbase on 2025-11-17, original record preserved"
}
```

**Mapping 2: Directus page → Agent Data reference**
```json
{
  "id": "map-002",
  "status": "active",
  "source_system": "directus",
  "source_type": "page",
  "source_id": "page-home-vn",
  "target_system": "agent_data",
  "target_type": "context_reference",
  "target_id": "ctx_homepage_vn_001",
  "mapping_direction": "source_to_target",
  "mapping_type": "one_to_one",
  "sync_status": "auto_sync",
  "last_sync_at": "2025-11-17T12:00:00Z",
  "priority": 90,
  "created_reason": "api_sync",
  "notes": "Agent Data reads homepage content from Directus API"
}
```

### Data Entry Principles for `id_mapping_registry`

1. **System-generated (preferred)**: Mappings should ideally be created automatically during:
   - Data migration processes (e.g., Larkbase → Directus)
   - API sync operations (e.g., Agent Data querying Directus)
   - Integration workflows
2. **Manual creation**: Operators can create mappings via Directus UI when:
   - Setting up new integrations
   - Resolving mapping conflicts
   - Documenting historical relationships
3. **One entry per mapping**: Each unique source→target relationship has exactly one record
4. **Conflict resolution**: If multiple mappings exist for the same source, use `priority` field (lower = higher priority)
5. **Audit trail**: All mappings include created_by, created_at to track origin

### Use Cases

1. **Larkbase Migration**: When migrating a Larkbase record to Directus:
   - Create mapping: `larkbase:record:rec_123` → `directus:knowledge_document:uuid-456`
   - Set `source_of_truth = "directus"` in the knowledge_document
   - Use this mapping to prevent re-importing the same record

2. **Agent Data Integration**: When Agent Data queries Directus for context:
   - Create mapping: `directus:page:page-faq` → `agent_data:context:ctx_faq_001`
   - Agent Data uses this to cache Directus content and avoid repeated API calls

3. **Cross-system References**: When a Directus page references an external resource:
   - Create mapping: `directus:page:page-resources` → `notion:page:notion_id_xyz`
   - Frontend can resolve this to display a link to the Notion page

---

## Collection 3: `pages`

### Purpose

The `pages` collection defines the **website structure and navigation** for the web-test Nuxt frontend. Each record represents a distinct page or route, with references to content from `knowledge_documents` and menu configuration.

This is the source of truth for:
- Page routes and URLs (slug)
- Page layout and content structure
- Navigation hierarchy
- Public vs internal page access

### Field Specification

| Field Name | Type | Nullable | Default | Description |
|------------|------|----------|---------|-------------|
| **`id`** | UUID | No | Auto-generated | Primary key (Directus default UUID) |
| **`status`** | String (dropdown) | No | `draft` | Publication status: `draft`, `published`, `archived` |
| **`sort`** | Integer | Yes | NULL | Manual sort order (for menu ordering) |
| **`date_created`** | Timestamp | No | Auto | Record creation timestamp (Directus system field) |
| **`date_updated`** | Timestamp | Yes | Auto | Record last update timestamp (Directus system field) |
| **`user_created`** | UUID (FK to directus_users) | Yes | Auto | User who created this page (Directus system field) |
| **`user_updated`** | UUID (FK to directus_users) | Yes | Auto | User who last updated this page (Directus system field) |
| | | | | |
| **`slug`** | String (255) | No | - | URL path (unique per language, e.g., `vn/home`, `ja/home`, `about-us`) |
| **`title`** | String (255) | No | - | Page title (language-specific, displayed in browser tab and menu) |
| **`meta_description`** | String (500) | Yes | NULL | SEO meta description |
| **`meta_keywords`** | JSON | Yes | NULL | SEO keywords (array of strings) |
| **`language`** | String (dropdown) | No | `vn` | Page language: `vn`, `ja`, `en` |
| | | | | |
| **`layout_type`** | String (dropdown) | No | `default` | Page layout template: `default`, `landing`, `article`, `faq`, `custom` |
| **`parent_page`** | UUID (FK to pages) | Yes | NULL | Parent page ID (for nested navigation, NULL = top-level) |
| **`hero_image`** | UUID (FK to directus_files) | Yes | NULL | Hero/banner image for the page |
| **`hero_title`** | String (255) | Yes | NULL | Hero section title (overrides main title if set) |
| **`hero_subtitle`** | Text | Yes | NULL | Hero section subtitle/description |
| | | | | |
| **`visibility`** | String (dropdown) | No | `public` | Access level: `public`, `internal`, `restricted` |
| **`require_auth`** | Boolean | No | false | Whether authentication is required to view this page |
| **`allowed_roles`** | JSON | Yes | NULL | Array of role IDs allowed to view (if require_auth = true) |
| | | | | |
| **`show_in_menu`** | Boolean | No | true | Whether to display this page in main navigation menu |
| **`menu_label`** | String (100) | Yes | NULL | Menu item label (uses `title` if NULL) |
| **`menu_icon`** | String (100) | Yes | NULL | Menu icon identifier (e.g., `home`, `info`, `help`) |
| **`menu_order`** | Integer | Yes | NULL | Order in menu (lower = higher in list, NULL = use `sort` field) |
| | | | | |
| **`published_at`** | Timestamp | Yes | NULL | When the page was published |
| **`archived_at`** | Timestamp | Yes | NULL | When the page was archived |
| **`notes`** | Text | Yes | NULL | Internal notes for page editors |

### Relationships

- **Many-to-Many with `knowledge_documents`**: A page can display multiple knowledge documents
  - Junction table: `pages_knowledge_documents`
  - Fields: `id`, `pages_id` (FK), `knowledge_documents_id` (FK), `sort` (for ordering)

- **Self-referential (Parent-Child)**: Pages can have parent pages for hierarchical navigation
  - Foreign key: `pages.parent_page` → `pages.id`
  - Example: `/vn/docs` (parent) → `/vn/docs/getting-started` (child)

- **One-to-Many with `id_mapping_registry`**: A page can have multiple ID mappings
  - Foreign key: `id_mapping_registry.source_id` → `pages.id` (when `source_type = 'page'`)

### i18n Approach for `pages`

**Language-specific pages** (RECOMMENDED for GĐ1):
- Each language version is a separate record in `pages`
- Use `language` field to distinguish
- Use `slug` with language prefix: `vn/home`, `ja/home`, `en/home`
- Optionally link related language versions via `parent_page` or a custom `translation_group` field

**Rationale**: Same as `knowledge_documents` - simpler for manual creation, easy to migrate to Directus translations later.

### Example Records

**Page 1: Vietnamese Homepage**
```json
{
  "id": "page-home-vn",
  "status": "published",
  "slug": "vn/home",
  "title": "Trang chủ",
  "meta_description": "Trang chủ của web-test - Hệ thống quản lý nội dung MySQL-first",
  "language": "vn",
  "layout_type": "landing",
  "parent_page": null,
  "hero_image": "file-hero-vn-home",
  "hero_title": "Chào mừng đến web-test",
  "hero_subtitle": "Hệ thống CMS hiện đại với Directus và Nuxt",
  "visibility": "public",
  "require_auth": false,
  "show_in_menu": true,
  "menu_label": "Trang chủ",
  "menu_icon": "home",
  "menu_order": 1,
  "published_at": "2025-11-17T10:00:00Z"
}
```

**Page 2: Japanese Documentation (Child Page)**
```json
{
  "id": "page-docs-getting-started-ja",
  "status": "published",
  "slug": "ja/docs/getting-started",
  "title": "はじめに",
  "meta_description": "web-testの使い方ガイド",
  "language": "ja",
  "layout_type": "article",
  "parent_page": "page-docs-ja",
  "visibility": "public",
  "require_auth": false,
  "show_in_menu": true,
  "menu_label": "はじめに",
  "menu_icon": "book",
  "menu_order": 1,
  "published_at": "2025-11-17T11:00:00Z"
}
```

### Data Entry Principles for `pages`

1. **Single entry point**: Pages are created/edited ONLY in Directus UI by content team
2. **Human-generated**: `title`, `slug`, `meta_description`, `hero_*` fields are human-written
3. **System-generated**: `id`, timestamps, `user_created/updated` are auto-managed
4. **Content separation**: Page structure (this collection) vs page content (`knowledge_documents`) are separate
   - Pages define WHERE content appears
   - knowledge_documents define WHAT content appears
   - Junction table links them together
5. **Menu configuration**: Use `show_in_menu`, `menu_label`, `menu_order` to control navigation without creating a separate menu table (simplicity for GĐ1)

---

## Collection 4: `menu_items` (Optional - Alternative Approach)

### Purpose (If using separate menu collection)

**NOTE**: For GĐ1 simplicity, we recommend embedding menu configuration directly in the `pages` collection (as shown above). However, if more complex menu requirements emerge (e.g., external links, custom menu structures independent of pages), this collection can be added.

If implementing `menu_items` as a separate collection:

| Field Name | Type | Description |
|------------|------|-------------|
| `id` | UUID | Primary key |
| `status` | String (dropdown) | `active`, `inactive` |
| `label` | String (100) | Menu item display text |
| `url` | String (500) | Target URL (can be page slug or external URL) |
| `page_id` | UUID (FK to pages) | Linked page (NULL for external links) |
| `parent_menu_item` | UUID (FK to menu_items) | Parent menu item (for nested menus) |
| `icon` | String (100) | Icon identifier |
| `order` | Integer | Sort order |
| `menu_group` | String (100) | Menu group: `main`, `footer`, `sidebar` |
| `language` | String (dropdown) | Menu language |
| `visibility` | String (dropdown) | `public`, `internal` |
| `require_auth` | Boolean | Whether auth is required |

**Deferred to GĐ2/GĐ3**: For now, we keep menu configuration within `pages` collection to reduce complexity.

---

## Junction Table: `pages_knowledge_documents`

### Purpose

This junction table implements the **many-to-many relationship** between `pages` and `knowledge_documents`. It allows:
- One page to display multiple knowledge documents (e.g., FAQ page showing multiple FAQ entries)
- One knowledge document to appear on multiple pages (e.g., a guide appearing on both homepage and docs page)

### Field Specification

| Field Name | Type | Nullable | Default | Description |
|------------|------|----------|---------|-------------|
| **`id`** | Integer (auto-increment) | No | Auto | Primary key (Directus default) |
| **`pages_id`** | UUID (FK to pages) | No | - | Foreign key to pages collection |
| **`knowledge_documents_id`** | UUID (FK to knowledge_documents) | No | - | Foreign key to knowledge_documents collection |
| **`sort`** | Integer | Yes | NULL | Display order of documents on the page (lower = shown first) |

### Unique Constraint

**Composite unique constraint**: (`pages_id`, `knowledge_documents_id`)
- Ensures a document is only linked once to a page
- Prevents duplicate entries

### Example Usage

**Homepage (`page-home-vn`) displays 3 knowledge documents:**
```json
[
  {
    "id": 1,
    "pages_id": "page-home-vn",
    "knowledge_documents_id": "doc-welcome-vn",
    "sort": 1
  },
  {
    "id": 2,
    "pages_id": "page-home-vn",
    "knowledge_documents_id": "doc-features-vn",
    "sort": 2
  },
  {
    "id": 3,
    "pages_id": "page-home-vn",
    "knowledge_documents_id": "doc-quick-start-vn",
    "sort": 3
  }
]
```

**FAQ document (`doc-faq-agent-data-ja`) appears on 2 pages:**
```json
[
  {
    "id": 10,
    "pages_id": "page-faq-ja",
    "knowledge_documents_id": "doc-faq-agent-data-ja",
    "sort": 5
  },
  {
    "id": 11,
    "pages_id": "page-docs-integration-ja",
    "knowledge_documents_id": "doc-faq-agent-data-ja",
    "sort": 2
  }
]
```

---

## Schema Integration with Broader Ecosystem

### 1. Moving "House" from Larkbase

**Gradual Migration Strategy**:

1. **Phase 1 (Current - GĐ1)**:
   - Identify key content in Larkbase (knowledge docs, FAQs, guides)
   - Manually create corresponding records in `knowledge_documents` via Directus UI
   - For each migrated item:
     - Set `source_of_truth = "directus"` (Directus is now authoritative)
     - Populate `source_system`, `source_url` to reference original Larkbase location
     - Create mapping in `id_mapping_registry`: `larkbase:record:X` → `directus:knowledge_document:Y`
     - Add migration note in `notes` field

2. **Phase 2 (GĐ2/GĐ3)**:
   - Develop automated sync script (read-only) to compare Larkbase and Directus
   - Detect conflicts (same content modified in both places)
   - Use `id_mapping_registry` to track which Larkbase records have been migrated
   - Eventually deprecate Larkbase records (set `status = "archived"` in Larkbase, keep as backup)

3. **Phase 3 (Future)**:
   - Full Larkbase sunset - all active content now in Directus
   - Larkbase becomes read-only archive
   - `id_mapping_registry` preserves historical references

**Key Principle**: No duplicate data entry. Each piece of content exists in ONE authoritative location (Directus), with references to historical sources (Larkbase) via metadata fields.

### 2. Integration with Agent Data

**Read-Only Access Pattern**:

Agent Data should:
1. **Query Directus API** (read-only) to fetch:
   - Published knowledge_documents (`status = 'published'`, `visibility = 'public'`)
   - Page structure from `pages` collection
   - Filter by `language` to get appropriate content (VN/JA)

2. **Use `id_mapping_registry` for caching**:
   - When Agent Data fetches a knowledge_document, create mapping:
     - `directus:knowledge_document:uuid-123` → `agent_data:context:ctx_abc`
   - Store `last_sync_at` timestamp
   - On subsequent queries, check if Directus `date_updated` > `last_sync_at` to detect changes

3. **Never write back to Directus**:
   - Agent Data is read-only consumer
   - If Agent Data generates new content, it should be reviewed by humans and manually entered into Directus

**API Endpoint Example** (for Nuxt/Agent Data integration):
```
GET /items/knowledge_documents?filter[status][_eq]=published&filter[language][_eq]=vn&fields=*
```

**Directus API Permissions**:
- Create a read-only API token for Agent Data
- Grant permissions: `read` on `knowledge_documents`, `pages`, `pages_knowledge_documents`
- Deny: `create`, `update`, `delete` (Agent Data cannot modify Directus)

### 3. Building Simple Web Pages (GĐ2/GĐ3)

**Nuxt Frontend Workflow**:

1. **Fetch page structure**:
   ```
   GET /items/pages?filter[slug][_eq]=vn/home&fields=*,knowledge_documents.*
   ```
   Returns page with embedded knowledge_documents via junction table

2. **Render page**:
   - Use `layout_type` to select Vue component template (e.g., `LandingLayout.vue`, `ArticleLayout.vue`)
   - Display `hero_image`, `hero_title`, `hero_subtitle` in hero section
   - Loop through `knowledge_documents` array and render `title`, `summary`, `content`

3. **Build navigation menu**:
   ```
   GET /items/pages?filter[show_in_menu][_eq]=true&filter[language][_eq]=vn&sort=menu_order
   ```
   Returns all pages that should appear in menu, sorted by `menu_order`

4. **Respect visibility**:
   - Check `visibility` and `require_auth` fields
   - If `visibility = 'internal'` or `require_auth = true`, enforce authentication

**Static Site Generation (SSG)**:
- Nuxt can fetch Directus content at build time
- Generate static HTML for all published pages
- Use Directus webhooks to trigger rebuild when content changes

---

## Enforcing "Data Entered Once" Principle

### Field-Level Source of Truth

Each collection has a `source_of_truth` field that indicates where the data is **primarily managed**:

| Value | Meaning | Edit Permission |
|-------|---------|----------------|
| `directus` | Directus is authoritative | Content team can edit via Directus UI |
| `larkbase` | Larkbase is still authoritative (transitional state) | Read-only in Directus, edits in Larkbase, manual sync |
| `agent_data` | Agent Data generated content (rare) | System-only, no manual edits |
| `external` | External system owns this data | Read-only in Directus, reference only |

### Preventing Duplicate Entry

1. **Unique constraints**:
   - `knowledge_documents.slug` - must be unique (prevent duplicate pages)
   - `id_mapping_registry` composite unique - prevent duplicate mappings

2. **Workflow enforcement**:
   - Before creating a new knowledge_document, check if it already exists:
     - Search by `slug`
     - Check `id_mapping_registry` for external source (e.g., Larkbase record)
   - If exists, update existing record instead of creating new

3. **Role-based access control** (Directus built-in):
   - `admin` role: full CRUD on all collections
   - `content_team` role: create/update only on `source_of_truth = 'directus'` items
   - `viewer` role: read-only access
   - `system` role: API-only access for automated sync scripts

### Metadata Tracking

All records include:
- **`user_created`**: Who created this record (human or system user)
- **`user_updated`**: Who last modified this record
- **`date_created`**: When created
- **`date_updated`**: When last modified
- **`notes`**: Freeform text to document changes, migrations, decisions

**Example Audit Query**:
```sql
-- Find all knowledge_documents modified in the last 7 days
SELECT id, title, user_updated, date_updated
FROM knowledge_documents
WHERE date_updated > NOW() - INTERVAL 7 DAY
ORDER BY date_updated DESC;
```

---

## Implementation Checklist (for Task 0026B)

This schema will be implemented manually via Directus UI in Task 0026B. The checklist includes:

### Collection 1: `knowledge_documents`
- [ ] Create collection `knowledge_documents`
- [ ] Add all fields as specified in table above
- [ ] Configure field types, defaults, nullable constraints
- [ ] Set up dropdown options for: `status`, `language`, `category`, `visibility`, `source_of_truth`, `edit_permission`
- [ ] Configure unique constraint on `slug`
- [ ] Enable Directus system fields: `date_created`, `date_updated`, `user_created`, `user_updated`

### Collection 2: `id_mapping_registry`
- [ ] Create collection `id_mapping_registry`
- [ ] Add all fields as specified
- [ ] Configure dropdown options for: `status`, `mapping_direction`, `mapping_type`, `sync_status`, `created_reason`
- [ ] Configure composite unique constraint on (`source_system`, `source_type`, `source_id`, `target_system`, `target_type`, `target_id`)

### Collection 3: `pages`
- [ ] Create collection `pages`
- [ ] Add all fields as specified
- [ ] Configure dropdown options for: `status`, `language`, `layout_type`, `visibility`
- [ ] Set up self-referential relationship: `parent_page` → `pages.id`
- [ ] Configure unique constraint on `slug`
- [ ] Set up file relationship: `hero_image` → `directus_files.id`

### Junction Table: `pages_knowledge_documents`
- [ ] Create junction collection `pages_knowledge_documents`
- [ ] Add fields: `id` (auto-increment), `pages_id` (FK), `knowledge_documents_id` (FK), `sort`
- [ ] Configure many-to-many relationship between `pages` and `knowledge_documents`
- [ ] Set up composite unique constraint on (`pages_id`, `knowledge_documents_id`)

### Roles & Permissions
- [ ] Create role `content_team` with:
  - Read/Create/Update on `knowledge_documents`, `pages` (where `source_of_truth = 'directus'`)
  - Read-only on `id_mapping_registry`
- [ ] Create role `viewer` with read-only access to all collections
- [ ] Create API token for Agent Data with read-only access

### Test Data
- [ ] Create 2-3 sample knowledge_documents (1 VN, 1 JA, 1 migrated from Larkbase)
- [ ] Create 2-3 sample pages (homepage VN, homepage JA, about page)
- [ ] Create junction records linking pages to documents
- [ ] Create 1-2 sample id_mapping_registry entries

---

## Summary

This schema for Giai đoạn 1 provides:

✅ **Three core collections**:
1. `knowledge_documents` - reusable content repository
2. `id_mapping_registry` - cross-system ID mapping
3. `pages` - website structure and navigation

✅ **Data entered once**: Each record has a single `source_of_truth`, with metadata tracking origin and ownership

✅ **Logging & audit**: All collections include created_by, updated_by, timestamps, and notes fields

✅ **i18n support**: Language field on content and pages, with simple language-specific record approach

✅ **Future integration**: Schema supports:
- Gradual migration from Larkbase (via `source_system`, `source_url`, and `id_mapping_registry`)
- Read-only access by Agent Data (via Directus API)
- Simple web page building in Nuxt (via `pages` and junction tables)

✅ **Minimal & reusable**: Small set of generic collections that can serve multiple use cases, avoiding special-case tables

**Next Step**: Task 0026B will use this document as a checklist to manually create these collections and fields in the Directus UI, then document the implementation with screenshots and verification steps.

---

**Document Created**: 2025-11-17
**Author**: Claude Code
**Task**: 0026A - Directus Schema Design (Documentation-Only)
**Implementation**: Manual via Directus UI (Task 0026B)
