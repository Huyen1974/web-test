# Task 0036A: Knowledge Taxonomy Design & Scaffold

**Date:** 2025-12-02
**Task ID:** CLI.CLAUDE.0036A
**Related Task:** 0036-KNOWLEDGE-CASE-ORGANIZATION (from Web_List_to_do_01.md)
**Branch:** `feat/0036-knowledge-taxonomy`
**Type:** DESIGN + SCAFFOLD
**Status:** ✅ COMPLETE

---

## 1. Executive Summary

This document defines the **Knowledge Taxonomy System** for organizing cases and knowledge documents in the web-test knowledge portal. The taxonomy follows a 4-level hierarchical structure (Category → Zone → Topic → Case/Document) designed to:

1. Enable systematic organization of growing knowledge base
2. Auto-generate navigation menus in Nuxt frontend
3. Maintain compatibility with existing View Model (Task 0032) and UI (Tasks 0034, 0035)
4. Comply with governance principles (Directus SSOT, Assemble > Build, Read-only gate)

**Key Deliverables:**
- ✅ Taxonomy structure design (4 levels with examples)
- ✅ Mapping to Directus schema (`category`, `tags` fields)
- ✅ Assignment rules for Zone/Sub-zone
- ✅ TypeScript type scaffold (`web/types/knowledge-taxonomy.ts`)
- ✅ CI validation (all checks passed)

---

## 2. Input & Constraints

### 2.1 Task 0036 Specification

From `docs/Web_List_to_do_01.md`:

> **Task 0036 - KNOWLEDGE-CASE-ORGANIZATION**: Thiết kế cách tổ chức Cases/tri thức theo Zone/Sub-zone
>
> **Objectives:**
> 1. Xác định taxonomy: Category (Lĩnh vực) → Zone (Khu vực) → Topic (Chủ đề) → Case/Document
> 2. Map taxonomy này vào schema Agent Data
> 3. Xác định quy tắc gán Zone/Sub-zone cho tài liệu mới
> 4. Nuxt dùng taxonomy này để sinh menu tự động

### 2.2 Governance Constraints

#### From `docs/constitution.md` (v1.11e):
- **HP-02 Absolute IaC with Minimalism**: All resources via Terraform, minimal configs
- **HP-06 Service-Oriented Architecture**: Separation of data source from display layer

#### From `docs/Law_of_data_and_connection.md` (v1.1):
- **Điều 2 - Assemble > Build**: Use existing composables, configuration-driven, avoid custom models
- **Điều 5 - Gate Layer (Read-Only)**: Nuxt is read-only gate, Directus is SSOT
- **HP-06 Architecture Principle**: Data source (Directus) separate from display (Nuxt)

### 2.3 Existing Implementation Context

#### From `reports/0032_nuxt_view_model_mapping.md`:
- **Current View Model** already has Zone/SubZone/Topic structure
- Uses Directus fields: `category`, `tags` for zone/subzone inference
- Composables: `useDirectusItems` with filters `zone`, `sub_zone`, `user_visible`, `status`
- **Principle**: Configuration-driven, no custom Repository/Model layers

#### From `reports/0035a_approval_ui_implementation.md`:
- Recent addition: `status` field (draft/published/archived)
- Extended View Model without breaking changes
- Read-only status badges on list pages

### 2.4 Scope Limitations for 0036A

**IN SCOPE:**
- ✅ Design taxonomy structure (4 levels)
- ✅ Define mapping to Directus schema
- ✅ Create assignment rules for Zone/Topic
- ✅ TypeScript type scaffold (interfaces/enums/config)
- ✅ Documentation for Nuxt menu generation (conceptual)

**OUT OF SCOPE (deferred to 0036B+):**
- ❌ Implementing menu components in Nuxt
- ❌ Modifying Directus schema (new collections/fields)
- ❌ Changing Agent Data schema
- ❌ Runtime menu generation logic
- ❌ Updating task status in Web_List_to_do_01.md

---

## 3. Taxonomy Structure Design

### 3.1 Four-Level Hierarchy

```
Category (Lĩnh vực) - Domain/Field
  └─ Zone (Khu vực) - Major Area
      └─ Topic (Chủ đề) - Subject/Theme
          └─ Case/Document (Tài liệu) - Specific Content
```

**Purpose of Each Level:**

| Level | Vietnamese | Purpose | Cardinality | Example |
|-------|-----------|---------|-------------|---------|
| 1 | **Category** (Lĩnh vực) | Top-level domain classification | 5-10 | Infrastructure, Operations, Development |
| 2 | **Zone** (Khu vực) | Major functional area within category | 3-7 per category | Cloud Platform, Database, CI/CD |
| 3 | **Topic** (Chủ đề) | Specific subject or theme | 5-15 per zone | MySQL Configuration, Terraform Patterns |
| 4 | **Case/Document** (Tài liệu) | Individual knowledge artifact | Unlimited | "How to restore MySQL backup" |

### 3.2 Taxonomy Tree Example

```
📁 Infrastructure (Category)
  📂 Cloud Platform (Zone)
    📄 GCP Fundamentals (Topic)
      📝 Setting up Workload Identity Federation (Case)
      📝 Managing Secret Manager secrets (Case)
      📝 Cloud Run deployment checklist (Case)
    📄 Terraform Patterns (Topic)
      📝 Minimum cost SQL module usage (Case)
      📝 Secure GCS bucket configuration (Case)
  📂 Database (Zone)
    📄 MySQL Administration (Topic)
      📝 Backup and restore procedures (Case)
      📝 Performance tuning guide (Case)
    📄 Directus CMS (Topic)
      📝 Schema design best practices (Case)
      📝 Content versioning workflow (Case)

📁 Operations (Category)
  📂 Monitoring (Zone)
    📄 Application Monitoring (Topic)
      📝 Setting up Cloud Monitoring dashboards (Case)
      📝 Alert policy configuration (Case)
  📂 Incident Response (Zone)
    📄 Runbooks (Topic)
      📝 Database connection failure runbook (Case)
      📝 High CPU usage diagnosis (Case)

📁 Development (Category)
  📂 Frontend (Zone)
    📄 Nuxt 3 Patterns (Topic)
      📝 Composable design guidelines (Case)
      📝 View Model mapping tutorial (Case)
  📂 Backend (Zone)
    📄 API Design (Topic)
      📝 RESTful API conventions (Case)
      📝 Authentication patterns (Case)
```

### 3.3 Recommended Initial Categories

Based on web-test repository context and Agency OS use case:

| Category | Description | Example Zones |
|----------|-------------|---------------|
| **Infrastructure** | Cloud resources, IaC, deployment | Cloud Platform, Database, Networking, Security |
| **Operations** | Monitoring, incident response, SRE | Monitoring, Incident Response, Maintenance, Backup/Recovery |
| **Development** | Frontend, backend, testing | Frontend (Nuxt), Backend (API), Testing, CI/CD |
| **Content Management** | CMS, knowledge base, documentation | Directus Admin, Content Workflow, Metadata Management |
| **Agent Systems** | AI agents, automation, workflows | Agent Data, Cursor/Claude/Gemini, Automation Patterns |

---

## 4. Mapping to Directus Schema

### 4.1 Current Directus Schema

From `docs/directus_schema_gd1.md` (analyzed in Task 0032):

**Collection:** `knowledge_documents`

| Field | Type | Current Usage | Taxonomy Role |
|-------|------|---------------|---------------|
| **`category`** | String (dropdown) | Zone/SubZone inference | **Maps to Zone** |
| **`tags`** | Array (string) | SubZone/Topic inference | **Maps to Topic** |
| `title` | String | Document title | Case/Document title |
| `slug` | String | URL-friendly ID | Case identifier |
| `summary` | Text | Short description | Case summary |
| `status` | String | Publication status | Approval workflow |
| `published_at` | Timestamp | Publication date | - |
| `language` | String | Content language | - |

### 4.2 Taxonomy Field Mapping Strategy

#### **Category** (Level 1) - Not stored explicitly

**Approach:** Derive from Zone prefix or Zone-to-Category mapping table

**Rationale:**
- Categories are high-level groupings (5-10 total)
- Current schema already has `category` field mapped to Zone (per Task 0032)
- Adding Category as separate field would require schema migration
- **Solution:** Use configuration-based mapping (Zone → Category lookup)

**Example Mapping:**
```typescript
const ZONE_TO_CATEGORY_MAP = {
  'Cloud Platform': 'Infrastructure',
  'Database': 'Infrastructure',
  'Frontend': 'Development',
  'Monitoring': 'Operations',
  // ...
}
```

#### **Zone** (Level 2) - `category` field

**Current Usage:**
- Field name: `category`
- Type: String dropdown
- Examples: "Cloud Platform", "Database", "Frontend"

**Migration Note:**
- Field name is semantically "category" but functionally represents "Zone"
- **No schema change needed** - continue using `category` field
- View Model will alias this as `zone` for clarity

#### **Topic** (Level 3) - `tags` array (primary tag)

**Current Usage:**
- Field name: `tags`
- Type: Array of strings
- Examples: ["MySQL", "Terraform", "GCP"]

**New Convention:**
```typescript
// tags[0] = primary Topic
// tags[1..n] = secondary topics/keywords
```

**Example:**
```json
{
  "category": "Database",           // Zone
  "tags": ["MySQL Administration", "Performance", "Backup"],  // Topic + keywords
  "title": "MySQL backup procedures"  // Case/Document
}
```

#### **Case/Document** (Level 4) - `id` + `title` + `slug`

**Fields:**
- `id`: UUID (unique identifier)
- `title`: Human-readable title
- `slug`: URL-friendly identifier

### 4.3 Agent Data Schema Considerations

**Current State:**
- Agent Data uses separate schema for search/log metadata
- Agent Data is **NOT the source of truth** for display content (per Law v1.1)

**Taxonomy in Agent Data:**
- Store taxonomy metadata for search optimization
- Mirror Directus taxonomy structure for consistency
- Use for search indexing, recommendations, related documents

**Proposed Agent Data Fields:**
```typescript
// Conceptual schema (no changes in 0036A)
interface AgentDataDocument {
  directus_id: string;          // FK to Directus knowledge_documents.id
  category: string;             // Derived from Zone
  zone: string;                 // From Directus category field
  primary_topic: string;        // From Directus tags[0]
  secondary_topics: string[];   // From Directus tags[1..n]
  taxonomy_path: string;        // e.g., "Infrastructure/Database/MySQL Administration"
  // ... other Agent Data fields (search vectors, etc.)
}
```

**Implementation:** Deferred to later task (0037+ or dedicated Agent Data sync task)

---

## 5. Assignment Rules for Zone/Topic

### 5.1 Zone Assignment Rules

**Rule 1: Functional Domain Mapping**

| If Document is about... | Assign Zone |
|------------------------|-------------|
| GCP services, Cloud Run, Secret Manager, WIF | Cloud Platform |
| MySQL, Directus DB, SQL queries | Database |
| Nuxt pages, components, View Models | Frontend |
| Terraform modules, IaC patterns | Cloud Platform |
| Monitoring dashboards, alerts | Monitoring |
| Runbooks, incident procedures | Incident Response |

**Rule 2: Mutually Exclusive Zones**

- Each document belongs to **exactly one Zone** (stored in `category` field)
- If a document spans multiple zones, choose the **primary focus**
- Example: "Terraform module for MySQL" → Zone = "Database" (output) over "Cloud Platform" (tool)

**Rule 3: Zone Naming Convention**

- Use **Title Case** (e.g., "Cloud Platform", not "cloud-platform")
- Keep names concise (2-3 words max)
- Avoid technical jargon unless domain-specific (e.g., "CI/CD" is acceptable)

### 5.2 Topic Assignment Rules

**Rule 1: Primary Topic (tags[0])**

- First tag is the **primary Topic**
- Must be descriptive and specific (e.g., "MySQL Administration", not just "MySQL")
- Use **Title Case**

**Rule 2: Secondary Topics (tags[1..n])**

- Additional tags for cross-referencing and search
- Can be technology names, concepts, or keywords
- Examples: "Performance", "Backup", "Security"

**Rule 3: Topic Granularity**

| Too Broad (❌) | Too Narrow (❌) | Just Right (✅) |
|---------------|----------------|----------------|
| "Database" | "MySQL 8.0.32 Configuration File Line 47" | "MySQL Configuration" |
| "Cloud" | "Secret Manager Secret for Lark API Token" | "Secret Management" |
| "Coding" | "useDirectusItems Filter Parameter Options" | "Directus Composables" |

### 5.3 Taxonomy Path Construction

**Format:** `{Category}/{Zone}/{Primary Topic}/{Document Title}`

**Examples:**
```
Infrastructure/Cloud Platform/GCP Fundamentals/Setting up Workload Identity Federation
Infrastructure/Database/MySQL Administration/Backup and restore procedures
Development/Frontend/Nuxt 3 Patterns/Composable design guidelines
Operations/Monitoring/Application Monitoring/Setting up Cloud Monitoring dashboards
```

**Usage:**
- Display in breadcrumbs: `Infrastructure > Cloud Platform > GCP Fundamentals`
- URL routing: `/knowledge/infrastructure/cloud-platform/gcp-fundamentals/setting-up-wif`
- Search faceting: Filter by Category, Zone, or Topic

---

## 6. Nuxt Menu Generation (Conceptual)

### 6.1 Menu Structure Goals

**Objective:** Auto-generate hierarchical navigation menu from taxonomy

**Visual Design:**
```
📁 Infrastructure
  📂 Cloud Platform
    - GCP Fundamentals (3 docs)
    - Terraform Patterns (2 docs)
  📂 Database
    - MySQL Administration (4 docs)
    - Directus CMS (2 docs)
📁 Operations
  📂 Monitoring
    - Application Monitoring (2 docs)
  📂 Incident Response
    - Runbooks (5 docs)
📁 Development
  📂 Frontend
    - Nuxt 3 Patterns (6 docs)
  📂 Backend
    - API Design (3 docs)
```

### 6.2 Implementation Approach (0036B+)

**Step 1: Fetch Documents**
```typescript
// Using existing composables (Assemble > Build)
const { data: documents } = await useDirectusItems({
  collection: 'knowledge_documents',
  params: {
    filter: { status: { _eq: 'published' }, user_visible: { _eq: true } },
    fields: ['id', 'title', 'slug', 'category', 'tags'],
  },
});
```

**Step 2: Group by Taxonomy**
```typescript
// Group documents by Zone (category field)
const byZone = groupBy(documents, 'category');

// For each Zone, group by primary Topic (tags[0])
const menuTree = Object.entries(byZone).map(([zone, docs]) => ({
  zone,
  category: ZONE_TO_CATEGORY_MAP[zone],  // Derive category
  topics: groupBy(docs, (doc) => doc.tags[0]),
}));
```

**Step 3: Render Menu Component**
```vue
<template>
  <nav class="taxonomy-menu">
    <div v-for="category in categories" :key="category.name">
      <h3>{{ category.name }}</h3>
      <div v-for="zone in category.zones" :key="zone.name">
        <h4>{{ zone.name }}</h4>
        <ul>
          <li v-for="topic in zone.topics" :key="topic.name">
            <NuxtLink :to="`/knowledge/${zone.slug}/${topic.slug}`">
              {{ topic.name }} ({{ topic.count }})
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
```

**Step 4: URL Routing**
- `/knowledge` - All knowledge documents
- `/knowledge/{zone-slug}` - Documents in Zone (e.g., `/knowledge/cloud-platform`)
- `/knowledge/{zone-slug}/{topic-slug}` - Documents in Topic (e.g., `/knowledge/database/mysql-administration`)
- `/knowledge/{zone-slug}/{topic-slug}/{document-slug}` - Individual document

**Implementation Status:** ⏸️ Out of scope for 0036A - deferred to 0036B or later task

---

## 7. TypeScript Type Scaffold

### 7.1 File Structure

**New File:** `web/types/knowledge-taxonomy.ts`

**Purpose:**
- Define TypeScript interfaces for taxonomy nodes
- Provide enums for Categories and common Zones/Topics
- Configuration for Zone-to-Category mapping
- Utility types for taxonomy paths

### 7.2 Type Definitions

```typescript
/**
 * Knowledge Taxonomy System (Task 0036)
 *
 * Defines a 4-level hierarchical taxonomy for organizing knowledge documents:
 * Category (Lĩnh vực) → Zone (Khu vực) → Topic (Chủ đề) → Case/Document (Tài liệu)
 *
 * @see reports/0036a_taxonomy_design.md for full specification
 */

// ============================================================================
// Level 1: Category (Lĩnh vực) - Top-level domain
// ============================================================================

/**
 * Top-level domain classification (5-10 total)
 * Not stored in Directus - derived from Zone mapping
 */
export enum KnowledgeCategory {
  INFRASTRUCTURE = 'Infrastructure',
  OPERATIONS = 'Operations',
  DEVELOPMENT = 'Development',
  CONTENT_MANAGEMENT = 'Content Management',
  AGENT_SYSTEMS = 'Agent Systems',
}

/**
 * Category metadata for display and navigation
 */
export interface CategoryNode {
  /** Category enum value */
  category: KnowledgeCategory;
  /** Display name (Vietnamese) */
  displayName: string;
  /** Display name (English) */
  displayNameEn: string;
  /** Short description */
  description: string;
  /** Icon name (heroicons or similar) */
  icon: string;
  /** Child zones in this category */
  zones: string[];
}

// ============================================================================
// Level 2: Zone (Khu vực) - Major functional area
// ============================================================================

/**
 * Major functional area within a category (3-7 per category)
 * Stored in Directus `category` field (legacy naming)
 */
export interface ZoneNode {
  /** Zone identifier (stored in Directus category field) */
  zone: string;
  /** URL-friendly slug */
  slug: string;
  /** Parent category (derived) */
  category: KnowledgeCategory;
  /** Display name (Vietnamese) */
  displayName: string;
  /** Short description */
  description: string;
  /** Child topics in this zone */
  topics: string[];
}

// ============================================================================
// Level 3: Topic (Chủ đề) - Specific subject/theme
// ============================================================================

/**
 * Specific subject or theme (5-15 per zone)
 * Stored in Directus `tags[0]` (primary tag)
 */
export interface TopicNode {
  /** Topic identifier (from tags[0]) */
  topic: string;
  /** URL-friendly slug */
  slug: string;
  /** Parent zone */
  zone: string;
  /** Parent category (derived) */
  category: KnowledgeCategory;
  /** Display name */
  displayName: string;
  /** Short description */
  description?: string;
  /** Secondary keywords (from tags[1..n]) */
  keywords: string[];
  /** Count of documents in this topic */
  documentCount?: number;
}

// ============================================================================
// Level 4: Case/Document (Tài liệu) - Individual content
// ============================================================================

/**
 * Individual knowledge document (unlimited)
 * Stored as Directus knowledge_documents record
 *
 * Note: This extends the existing KnowledgeCard from view-model-0032.ts
 * No changes to existing interface - taxonomy fields already present
 */
export interface DocumentNode {
  /** Document UUID */
  id: string;
  /** Document title */
  title: string;
  /** URL-friendly slug */
  slug: string;
  /** Parent zone (from category field) */
  zone: string;
  /** Primary topic (from tags[0]) */
  primaryTopic: string;
  /** Secondary topics/keywords (from tags[1..n]) */
  secondaryTopics: string[];
  /** Full taxonomy path */
  taxonomyPath: string; // e.g., "Infrastructure/Cloud Platform/GCP Fundamentals"
}

// ============================================================================
// Taxonomy Path & Navigation
// ============================================================================

/**
 * Taxonomy path segments for breadcrumb and routing
 */
export interface TaxonomyPath {
  category: KnowledgeCategory;
  categorySlug: string;
  zone: string;
  zoneSlug: string;
  topic?: string;
  topicSlug?: string;
  document?: string;
  documentSlug?: string;
}

/**
 * Menu item for taxonomy navigation
 */
export interface TaxonomyMenuItem {
  /** Display label */
  label: string;
  /** Navigation route */
  to: string;
  /** Nesting level (0=category, 1=zone, 2=topic) */
  level: number;
  /** Document count (for topics) */
  count?: number;
  /** Child menu items */
  children?: TaxonomyMenuItem[];
  /** Icon name */
  icon?: string;
}

// ============================================================================
// Configuration & Mapping
// ============================================================================

/**
 * Zone-to-Category mapping
 * Used to derive Category from Zone (since Category not stored in Directus)
 */
export const ZONE_TO_CATEGORY_MAP: Record<string, KnowledgeCategory> = {
  // Infrastructure
  'Cloud Platform': KnowledgeCategory.INFRASTRUCTURE,
  'Database': KnowledgeCategory.INFRASTRUCTURE,
  'Networking': KnowledgeCategory.INFRASTRUCTURE,
  'Security': KnowledgeCategory.INFRASTRUCTURE,

  // Operations
  'Monitoring': KnowledgeCategory.OPERATIONS,
  'Incident Response': KnowledgeCategory.OPERATIONS,
  'Maintenance': KnowledgeCategory.OPERATIONS,
  'Backup & Recovery': KnowledgeCategory.OPERATIONS,

  // Development
  'Frontend': KnowledgeCategory.DEVELOPMENT,
  'Backend': KnowledgeCategory.DEVELOPMENT,
  'Testing': KnowledgeCategory.DEVELOPMENT,
  'CI/CD': KnowledgeCategory.DEVELOPMENT,

  // Content Management
  'Directus Admin': KnowledgeCategory.CONTENT_MANAGEMENT,
  'Content Workflow': KnowledgeCategory.CONTENT_MANAGEMENT,
  'Metadata Management': KnowledgeCategory.CONTENT_MANAGEMENT,

  // Agent Systems
  'Agent Data': KnowledgeCategory.AGENT_SYSTEMS,
  'AI Agents': KnowledgeCategory.AGENT_SYSTEMS,
  'Automation': KnowledgeCategory.AGENT_SYSTEMS,
};

/**
 * Category metadata configuration
 */
export const CATEGORY_CONFIG: Record<KnowledgeCategory, Omit<CategoryNode, 'zones'>> = {
  [KnowledgeCategory.INFRASTRUCTURE]: {
    category: KnowledgeCategory.INFRASTRUCTURE,
    displayName: 'Hạ tầng',
    displayNameEn: 'Infrastructure',
    description: 'Cloud resources, IaC, deployment, infrastructure management',
    icon: 'heroicons:server-stack',
  },
  [KnowledgeCategory.OPERATIONS]: {
    category: KnowledgeCategory.OPERATIONS,
    displayName: 'Vận hành',
    displayNameEn: 'Operations',
    description: 'Monitoring, incident response, SRE, maintenance',
    icon: 'heroicons:cog-6-tooth',
  },
  [KnowledgeCategory.DEVELOPMENT]: {
    category: KnowledgeCategory.DEVELOPMENT,
    displayName: 'Phát triển',
    displayNameEn: 'Development',
    description: 'Frontend, backend, testing, CI/CD workflows',
    icon: 'heroicons:code-bracket',
  },
  [KnowledgeCategory.CONTENT_MANAGEMENT]: {
    category: KnowledgeCategory.CONTENT_MANAGEMENT,
    displayName: 'Quản lý nội dung',
    displayNameEn: 'Content Management',
    description: 'CMS administration, content workflow, metadata',
    icon: 'heroicons:document-text',
  },
  [KnowledgeCategory.AGENT_SYSTEMS]: {
    category: KnowledgeCategory.AGENT_SYSTEMS,
    displayName: 'Hệ thống Agent',
    displayNameEn: 'Agent Systems',
    description: 'AI agents, automation, workflows, agent data',
    icon: 'heroicons:cpu-chip',
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert string to URL-friendly slug
 */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Build taxonomy path string from components
 */
export function buildTaxonomyPath(
  category: KnowledgeCategory,
  zone: string,
  topic?: string,
  document?: string
): string {
  const parts = [category, zone];
  if (topic) parts.push(topic);
  if (document) parts.push(document);
  return parts.join('/');
}

/**
 * Parse taxonomy path from string
 */
export function parseTaxonomyPath(path: string): Partial<TaxonomyPath> {
  const parts = path.split('/').filter(Boolean);
  return {
    category: parts[0] as KnowledgeCategory,
    categorySlug: toSlug(parts[0] || ''),
    zone: parts[1] || undefined,
    zoneSlug: toSlug(parts[1] || ''),
    topic: parts[2] || undefined,
    topicSlug: toSlug(parts[2] || ''),
    document: parts[3] || undefined,
    documentSlug: toSlug(parts[3] || ''),
  };
}

/**
 * Derive category from zone using mapping
 */
export function getCategoryForZone(zone: string): KnowledgeCategory | undefined {
  return ZONE_TO_CATEGORY_MAP[zone];
}

/**
 * Get category metadata
 */
export function getCategoryMetadata(category: KnowledgeCategory): Omit<CategoryNode, 'zones'> {
  return CATEGORY_CONFIG[category];
}
```

### 7.3 Integration with Existing View Model

**No Breaking Changes:**
- Existing `KnowledgeCard` and `KnowledgeListEntry` interfaces remain unchanged
- Taxonomy types are **supplementary**, not replacement
- View Model composables continue to work as-is

**Future Integration (0036B+):**
```typescript
import type { KnowledgeCard } from './view-model-0032';
import type { TaxonomyPath, KnowledgeCategory } from './knowledge-taxonomy';
import { getCategoryForZone, buildTaxonomyPath } from './knowledge-taxonomy';

// Extend KnowledgeCard with taxonomy helpers (non-breaking)
export function enrichWithTaxonomy(card: KnowledgeCard): KnowledgeCard & {
  taxonomyPath: string;
  category: KnowledgeCategory;
} {
  const category = getCategoryForZone(card.zone);
  const taxonomyPath = buildTaxonomyPath(
    category,
    card.zone,
    card.topic,
    card.title
  );

  return { ...card, category, taxonomyPath };
}
```

---

## 8. Governance Compliance

### 8.1 Constitution (v1.11e) Compliance

| Principle | Requirement | Compliance | Evidence |
|-----------|-------------|------------|----------|
| **HP-02 IaC Minimalism** | All resources via Terraform, minimal configs | ✅ | No infrastructure changes in 0036A - only types/docs |
| **HP-03 No False Reporting** | No "PASS" unless CI verified | ✅ | Report pending CI GREEN (Section 11) |
| **HP-06 Service Architecture** | Separation of data source from display | ✅ | Directus (data) separate from Nuxt (display), taxonomy enforces this |

### 8.2 Law of Data & Connection (v1.1) Compliance

| Article | Requirement | Compliance | Evidence |
|---------|-------------|------------|----------|
| **Điều 2 - Assemble > Build** | Use existing composables, avoid custom models | ✅ | Type scaffold only - no new models/repositories. Menu generation (0036B) will use `useDirectusItems` |
| **Điều 5 - Read-Only Gate** | Nuxt is read-only, Directus is SSOT | ✅ | Taxonomy reads from Directus `category`/`tags` fields only, no writes |
| **HP-06 Architecture** | Data source != Display layer | ✅ | Taxonomy maps Directus data (source) to Nuxt UI (display) without duplication |

### 8.3 Task 0036 Requirements

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| (1) Define taxonomy: Category → Zone → Topic → Case | ✅ | Section 3: 4-level hierarchy with examples |
| (2) Map taxonomy to Agent Data schema | ✅ | Section 4.3: Conceptual Agent Data schema (no changes in 0036A) |
| (3) Define assignment rules for Zone/Sub-zone | ✅ | Section 5: Clear rules for Zone/Topic assignment |
| (4) Nuxt uses taxonomy for menu generation | ✅ | Section 6: Conceptual design (implementation in 0036B+) |

---

## 9. Local Quality Checks

### 9.1 Lint Check

**Command:**
```bash
cd web && npm run lint
```

**Result:**
- **Lint errors:** 0 ✅ (required)
- **Warnings:** 123 (all pre-existing baseline from Agency OS)
- **New warnings:** 0 ✅

**Status:** ✅ PASSED

### 9.2 Build Check

**Command:**
```bash
cd web && npm run build
```

**Result:**
- **Build:** SUCCESS ✅
- **Output size:** 23.7 MB (6.13 MB gzip)
- **TypeScript errors:** 0 ✅
- **Duration:** ~90 seconds

**Status:** ✅ PASSED

---

## 10. Implementation Summary

### 10.1 Files Created

| File | Type | Purpose | Lines | Status |
|------|------|---------|-------|--------|
| `reports/0036a_taxonomy_design.md` | Documentation | Full taxonomy specification | ~950 | ✅ Complete |
| `web/types/knowledge-taxonomy.ts` | TypeScript | Type definitions, enums, config | ~350 | ✅ Complete |

### 10.2 Files Modified

**None** - This is a pure addition (design + scaffold), no modifications to existing code.

### 10.3 Breaking Changes

**None** - All new types are optional and non-breaking. Existing View Model and composables continue to work unchanged.

---

## 11. CI Validation ✅

### 11.1 Required CI Checks

| Check | Status | Duration | Purpose | Result |
|-------|--------|----------|---------|--------|
| **Nuxt 3 CI - build** | ✅ PASS | 1m25s | Verify TypeScript compilation | SUCCESS - no errors |
| **Terraform Deploy - Pass Gate** | ✅ PASS | 31s | Infrastructure validation | SUCCESS - no changes needed |
| **Terraform Deploy - Quality Gate** | ✅ PASS | 45s | Code quality standards | SUCCESS - lint passed |
| **Terraform Deploy - E2E Smoke Test** | ✅ PASS | 1m25s | End-to-end functionality | SUCCESS - no runtime impact |

### 11.2 CI Validation Plan

**Step 1: Local Validation**
- ✅ Run `npm run lint` → Must have 0 errors
- ✅ Run `npm run build` → Must succeed
- ✅ Commit changes with descriptive message

**Step 2: Push & PR Creation**
- Push to `feat/0036-knowledge-taxonomy` branch
- Create PR with title: "feat(0036): knowledge taxonomy design and scaffold"
- Link PR to Task 0036 in Web_List_to_do_01.md

**Step 3: Monitor CI**
- Wait for all required checks to complete
- If any check FAILS:
  - **Round 1:** Analyze error, fix, commit, push
  - **Round 2:** If still failing, analyze error, attempt second fix
  - After Round 2: If still failing, STOP and document final state

**Step 4: Report Final Status**
- Update this report (Section 11.3) with final CI results
- If all GREEN: Mark task as SUCCESS
- If RED after 2 rounds: Document blockers for 0036B handoff

### 11.3 CI Results

**PR:** #97 (https://github.com/Huyen1974/web-test/pull/97)
**Branch:** `feat/0036-knowledge-taxonomy`
**Base:** `main`
**Commit:** af88f93

**Results:** ✅ **ALL CHECKS PASSED**

| Check Name | Status | Duration | Link |
|------------|--------|----------|------|
| build | ✅ PASS | 1m25s | [Run 19855118799](https://github.com/Huyen1974/web-test/actions/runs/19855118799/job/56891037275) |
| Pass Gate | ✅ PASS | 31s | [Run 19855118803](https://github.com/Huyen1974/web-test/actions/runs/19855118803/job/56891037159) |
| Quality Gate | ✅ PASS | 45s | [Run 19855118803](https://github.com/Huyen1974/web-test/actions/runs/19855118803/job/56891037091) |
| E2E Smoke Test | ✅ PASS | 1m25s | [Run 19855118803](https://github.com/Huyen1974/web-test/actions/runs/19855118803/job/56891037085) |

**PR State:**
- State: OPEN
- Mergeable: YES
- Ready for review: YES

---

## 12. Next Steps

### 12.1 Immediate (0036A) - COMPLETE

1. ✅ Complete design document (this file)
2. ✅ Create TypeScript type scaffold
3. ✅ Run local lint + build (0 errors, 123 baseline warnings)
4. ✅ Commit and push changes (commit af88f93)
5. ✅ Create PR #97
6. ✅ Monitor CI checks (all 4 checks PASSED)
7. ✅ Update report with CI results

**Status:** Task 0036A is COMPLETE and ready for review/merge

### 12.2 Follow-Up (0036B+)

**Deferred to future tasks:**

1. **Menu Component Implementation** (0036B)
   - Create `web/components/KnowledgeTaxonomyMenu.vue`
   - Implement groupBy logic for Zone/Topic
   - Add expand/collapse interaction
   - Integrate with existing navigation

2. **URL Routing** (0036B)
   - Add dynamic routes: `/knowledge/[zone]/[topic]`
   - Implement breadcrumb component
   - Filter documents by taxonomy path

3. **Agent Data Sync** (0037+)
   - Mirror taxonomy structure in Agent Data schema
   - Implement sync workflow (Directus → Agent Data)
   - Enable taxonomy-based search/recommendations

4. **Directus Schema Enhancement** (Future)
   - Consider adding explicit `category_id` field (vs derivation)
   - Add `topic` as dedicated field (vs primary tag inference)
   - Implement taxonomy validation rules in Directus

5. **UI Enhancements** (Future)
   - Taxonomy filter dropdowns on list pages
   - Tag cloud visualization
   - Related documents by taxonomy

---

## 13. Assumptions & Decisions

### 13.1 Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Category derived (not stored)** | Avoids schema migration; categories are stable (5-10 total); Zone-to-Category mapping is simple lookup |
| **Zone uses existing `category` field** | Reuse existing schema; `category` is semantically wrong name but functionally correct for Zone |
| **Topic from `tags[0]` (primary tag)** | Existing field, already used for subzone inference; primary tag convention is clear |
| **4-level hierarchy** | Matches Task 0036 spec; sufficient depth for knowledge org without over-engineering |
| **TypeScript types in separate file** | Avoid polluting existing `view-model-0032.ts`; clear separation of concerns; optional import |

### 13.2 Assumptions

| Assumption | Impact if Wrong | Mitigation |
|------------|----------------|------------|
| `category` field has dropdown values matching Zones | Menu generation fails | Document expected values; add validation |
| `tags[0]` exists for all documents | Topic inference fails | Default to "Uncategorized" topic |
| Zone-to-Category mapping covers all zones | Unknown zones break grouping | Add fallback category "Other" |
| Categories remain stable (5-10 total) | Frequent changes require map updates | Document category addition process |

### 13.3 Risks

| Risk | Severity | Mitigation | Status |
|------|----------|-----------|--------|
| **Existing documents missing `category`** | Medium | Add migration script to backfill | 📋 To document |
| **Inconsistent Zone naming** | Low | Document naming conventions (Section 5) | ✅ Documented |
| **Menu performance with 1000+ docs** | Low | Use pagination/virtualization in 0036B | 📋 Future work |
| **Category mapping becomes outdated** | Low | Version taxonomy config, update process | 📋 To document |

---

## 14. Appendix A: Terminology

| English | Vietnamese | Abbreviation | Example |
|---------|-----------|--------------|---------|
| Category | Lĩnh vực | CAT | Infrastructure |
| Zone | Khu vực | ZONE | Cloud Platform |
| Topic | Chủ đề | TOPIC | GCP Fundamentals |
| Case / Document | Tài liệu | DOC | Setting up WIF |
| Taxonomy Path | Đường dẫn phân loại | PATH | Infrastructure/Cloud Platform/GCP Fundamentals |

---

## 15. Appendix B: Example Data

### Directus Record Example

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "How to set up Workload Identity Federation",
  "slug": "how-to-set-up-workload-identity-federation",
  "summary": "Step-by-step guide for configuring WIF for GitHub Actions...",
  "category": "Cloud Platform",  // Zone
  "tags": ["GCP Fundamentals", "Security", "GitHub Actions"],  // Topic + keywords
  "status": "published",
  "published_at": "2025-11-20T10:00:00Z",
  "language": "en",
  "user_visible": true
}
```

### Derived Taxonomy

```typescript
{
  category: KnowledgeCategory.INFRASTRUCTURE,  // Derived from Zone mapping
  zone: "Cloud Platform",                      // From category field
  zoneSlug: "cloud-platform",
  primaryTopic: "GCP Fundamentals",            // From tags[0]
  topicSlug: "gcp-fundamentals",
  secondaryTopics: ["Security", "GitHub Actions"],  // From tags[1..n]
  taxonomyPath: "Infrastructure/Cloud Platform/GCP Fundamentals/How to set up Workload Identity Federation"
}
```

---

## 16. Conclusion

**Status:** ✅ **COMPLETE** - Design + Scaffold + CI GREEN

This design document provides a complete specification for the Knowledge Taxonomy System (Task 0036). The taxonomy follows governance principles (Directus SSOT, Assemble > Build, Read-Only Gate) and integrates seamlessly with existing View Model and UI implementations (Tasks 0032, 0034, 0035).

**Key Achievements:**
- ✅ 4-level taxonomy defined with examples
- ✅ Mapping to existing Directus schema (no schema changes)
- ✅ Clear assignment rules for Zone/Topic
- ✅ TypeScript type scaffold created
- ✅ Menu generation approach documented (implementation in 0036B)
- ✅ Full governance compliance verification
- ✅ **All CI checks PASSED** (build, Pass Gate, Quality Gate, E2E Smoke Test)

**Quality Metrics:**
- Local lint: 0 errors ✅
- Local build: SUCCESS (23.7 MB) ✅
- CI build: PASS (1m25s) ✅
- CI gates: All PASS ✅

**Deliverables:**
- Design document: `reports/0036a_taxonomy_design.md` (~950 lines)
- Type scaffold: `web/types/knowledge-taxonomy.ts` (~350 lines)
- PR #97: https://github.com/Huyen1974/web-test/pull/97
- Branch: `feat/0036-knowledge-taxonomy`
- Commit: af88f93

**Ready For:**
- Codex review and merge
- Task 0036B implementation (menu component)

---

**Report created by:** Claude Code (CLI.CLAUDE.0036A)
**Branch:** `feat/0036-knowledge-taxonomy`
**PR:** #97
**Last updated:** 2025-12-02 17:20:40 +07
**Final Status:** ✅ SUCCESS
