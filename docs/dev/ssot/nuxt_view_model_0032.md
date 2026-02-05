# Nuxt View Model - Task 0032 (NUXT-DATA-MODEL-MAPPING)

## Introduction & Goals

This document defines the **Nuxt View Model** for the web-test project, specifically for knowledge/blueprint content sourced from Directus CMS. The View Model provides a structured way to represent and organize content for the Nuxt frontend, ensuring consistent data shapes and query patterns.

### Core Principles

- **Directus as SSOT**: All published content comes exclusively from Directus collections (`knowledge_documents`, `pages`, etc.)
- **Zone/SubZone/Topic Structure**: Content is organized hierarchically using inferred zones from `category` and `tags` fields
- **Composable Queries**: All data fetching uses `nuxt-directus` composables (e.g., `useDirectusItems`)
- **No Custom Models**: View Model is implemented via configuration + composable queries, not custom JS Model/Repository classes
- **Language Support**: Multi-language content (VN, JA) with language-specific records

### Law Compliance

This design follows **Web_List_to_do_01 – Task 0032** requirements:
- ✅ Zone/SubZone/Topic groupings with card/list/breadcrumb structures
- ✅ Directus field mappings (category, tags, visibility, status, etc.)
- ✅ Agent Data used only for search/analysis/log, not primary display
- ✅ Implementation via configuration + composable queries
- ✅ No custom JS Model/Repository classes

## Source Collections (Directus)

### Primary Content Collection: `knowledge_documents`
The main content repository containing:
- `title`, `slug`, `summary`, `content` - core content fields
- `language` - language identifier (vn/ja/en)
- `category` - primary category (guide/faq/reference/article/other)
- `tags` - free-form tags array for sub-categorization
- `visibility` - access level (public/internal/restricted)
- `status` - publication status (draft/published/archived)
- `published_at`, `version` - publication metadata

### Navigation Collection: `pages`
Website structure and routing:
- `slug`, `title` - page routing and titles
- `layout_type` - page template (default/landing/article/faq/custom)
- `parent_page` - hierarchical navigation
- `visibility`, `require_auth` - access control

### Junction Table: `pages_knowledge_documents`
Links pages to knowledge documents:
- `pages_id`, `knowledge_documents_id`, `sort` - many-to-many relationship with ordering

## View Model Definitions

### Hierarchical Organization (Zone/SubZone/Topic)

Content is organized hierarchically using inferred structures from Directus fields:

```
Zone (from category)
├── SubZone (first tag)
│   ├── Topic (remaining tags)
│   │   ├── KnowledgeCard
│   │   └── KnowledgeCard
│   └── Topic
└── SubZone
```

**Zone Mapping:**
- `guide` → Guide Zone
- `faq` → FAQ Zone
- `reference` → Reference Zone
- `article` → Article Zone
- `other` → Other Zone

**SubZone/Topic Mapping:**
- First tag in `tags` array → SubZone
- Remaining tags → Topics
- Documents with same SubZone/Topic are grouped together

### KnowledgeCard
Individual document display component with:

```typescript
interface KnowledgeCard {
  id: string;                    // Directus UUID
  title: string;                // Document title
  slug: string;                 // URL-friendly identifier
  summary: string;              // Short excerpt
  language: 'vn' | 'ja' | 'en'; // Content language
  publishedAt: string;          // Publication date
  version: number;              // Content version
  zone: string;                 // Inferred from category
  subZone: string;              // First tag
  topics: string[];             // Remaining tags
  readTime: number;             // Estimated read time (computed)
}
```

### KnowledgeListEntry
List item representation with:

```typescript
interface KnowledgeListEntry {
  id: string;
  title: string;
  slug: string;
  summary: string;
  language: string;
  publishedAt: string;
  zone: string;
  subZone: string;
  primaryTopic: string;          // First topic from topics array
  tags: string[];                // All tags for filtering
}
```

### KnowledgeList
Paginated collection with:

```typescript
interface KnowledgeList {
  items: KnowledgeListEntry[];
  total: number;
  page: number;
  pageSize: number;
  zone?: string;                 // Optional zone filter
  subZone?: string;              // Optional subzone filter
  topic?: string;                // Optional topic filter
  language?: string;             // Optional language filter
}
```

### BreadcrumbItem
Navigation breadcrumb with:

```typescript
interface BreadcrumbItem {
  label: string;
  slug: string;
  type: 'zone' | 'subzone' | 'topic' | 'document';
}
```

### ZoneView
Zone overview page with:

```typescript
interface ZoneView {
  zone: string;
  title: string;                 // Human-readable zone title
  description: string;           // Zone description
  subZones: {
    name: string;
    documentCount: number;
    topics: string[];
  }[];
  featuredDocuments: KnowledgeCard[]; // Top documents in zone
}
```

### TopicView
Topic detail page with:

```typescript
interface TopicView {
  zone: string;
  subZone: string;
  topic: string;
  documents: KnowledgeCard[];
  relatedTopics: string[];       // Other topics in same subzone
  breadcrumb: BreadcrumbItem[];
}
```

## Field Mapping Tables

### Directus `knowledge_documents` → View Model Mapping

| Directus Field | View Model Field | Transform/Notes |
|----------------|------------------|-----------------|
| `id` | `id` | Direct mapping |
| `title` | `title` | Direct mapping |
| `slug` | `slug` | Direct mapping |
| `summary` | `summary` | Direct mapping |
| `language` | `language` | Direct mapping |
| `category` | `zone` | Map: guide→Guide, faq→FAQ, reference→Reference, article→Article, other→Other |
| `tags[0]` | `subZone` | First tag becomes subzone |
| `tags[1:]` | `topics` | Remaining tags become topics |
| `published_at` | `publishedAt` | Direct mapping |
| `version` | `version` | Direct mapping |
| `content` | N/A | Not included in card/list views |

### Directus `pages` → Navigation Mapping

| Directus Field | Navigation Use | Notes |
|----------------|----------------|-------|
| `slug` | URL routing | Language-prefixed: vn/home, ja/home |
| `title` | Page titles | Language-specific |
| `parent_page` | Hierarchy | Self-referential FK |
| `layout_type` | Template selection | default/landing/article/faq/custom |
| `visibility` | Access control | public/internal/restricted |
| `show_in_menu` | Navigation display | Boolean flag |

## Agent Data Relationship

Agent Data serves as **secondary metadata source** only for:
- **Search indexing**: Providing additional context and relationships for search algorithms
- **Blueprint analysis**: Supporting content analysis and recommendation systems
- **Logging and audit**: Tracking content usage and user interactions
- **Cross-system mapping**: Maintaining relationships with external systems

**Critical Constraint**: Agent Data is **NEVER** used as the primary source for displayed content. All user-facing content must originate from Directus collections as the single source of truth.

Example usage patterns:
- Search results may include Agent Data metadata for ranking/scoring
- Content recommendations may use Agent Data relationship graphs
- Analytics may combine Directus publication data with Agent Data usage logs

## Query Patterns (nuxt-directus style)

All data fetching uses `nuxt-directus` composables with proper filtering and sorting.

### Knowledge Hub List Query
```typescript
// Fetch published, public documents for knowledge hub
const { data: documents } = await useDirectusItems('knowledge_documents', {
  filter: {
    status: { _eq: 'published' },
    visibility: { _eq: 'public' },
    language: { _eq: 'vn' } // or dynamic based on user preference
  },
  sort: ['-published_at'], // Newest first
  limit: 20,
  fields: ['id', 'title', 'slug', 'summary', 'category', 'tags', 'published_at', 'language']
});
```

### Zone-Specific List Query
```typescript
// Fetch documents for specific zone
const { data: zoneDocuments } = await useDirectusItems('knowledge_documents', {
  filter: {
    status: { _eq: 'published' },
    visibility: { _eq: 'public' },
    category: { _eq: 'guide' }, // Zone filter
    language: { _eq: 'vn' }
  },
  sort: ['-published_at'],
  limit: 50
});
```

### Single Document Query
```typescript
// Fetch complete document with content
const { data: document } = await useDirectusSingleton('knowledge_documents', {
  filter: {
    slug: { _eq: route.params.slug },
    status: { _eq: 'published' },
    visibility: { _eq: 'public' }
  },
  fields: ['*'] // All fields for full content
});
```

### Page Navigation Query
```typescript
// Fetch page structure for navigation
const { data: pages } = await useDirectusItems('pages', {
  filter: {
    status: { _eq: 'published' },
    visibility: { _eq: 'public' },
    show_in_menu: { _eq: true },
    language: { _eq: 'vn' }
  },
  sort: ['menu_order', 'sort'],
  fields: ['id', 'slug', 'title', 'menu_label', 'menu_icon', 'parent_page']
});
```

### Page Content Query
```typescript
// Fetch page with related documents
const { data: pageData } = await useDirectusItems('pages', {
  filter: {
    slug: { _eq: route.params.slug },
    status: { _eq: 'published' }
  },
  fields: ['*', 'pages_knowledge_documents.knowledge_documents_id.*'],
  deep: {
    pages_knowledge_documents: {
      knowledge_documents_id: {
        fields: ['id', 'title', 'slug', 'summary', 'category', 'tags', 'published_at']
      }
    }
  }
});
```

## Constraints & Non-goals

### Implementation Constraints
- **No Custom JS Models**: View Model implemented via configuration + composable queries only
- **Composable-Only Queries**: All data fetching through `nuxt-directus` composables
- **Directus SSOT**: No content sourcing from Agent Data or other systems
- **Configuration-Driven**: View transformations defined in config, not imperative code

### Non-Goals
- Real-time synchronization with Agent Data
- Complex content transformation logic
- Custom caching layers beyond Nuxt's built-in capabilities
- Database-level aggregations or complex joins

### Future Implementation Notes
- Actual composable implementations will be created by Claude/Codex in follow-up CLIs
- UI components will consume these View Models via the defined composable patterns
- Agent Data integration will be handled separately for search/analytics features
- Multi-language routing and content switching will extend these patterns
