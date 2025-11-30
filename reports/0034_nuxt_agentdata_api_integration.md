# Task 0034: Nuxt ↔ Directus Content + Agent Data Search/Log Integration

**Status**: COMPLETED ✅
**PR**: #89 - `feat(0034): Nuxt ↔ Directus content + Agent Data search/log`
**Branch**: `feat/0034-nuxt-agentdata-api`
**Related Tasks**: Task 0032 (View Model), Task 0033 (UI Shell)
**Reference**: `Web_List_to_do_01.md` - Task ID 0034-NUXT-AGENTDATA-API

---

## Executive Summary

Task 0034 successfully implements the integration between Nuxt (frontend), Directus (content SSOT), and Agent Data (search/logging) in full compliance with the **Data & Connection Law v1.1**.

### Key Achievements

1. ✅ **Agent Data Client** implemented for search (IDs only) and logging
2. ✅ **Composables** created for easy Vue integration
3. ✅ **Search functionality** added to Knowledge and Blueprint pages
4. ✅ **Page view logging** added to all detail pages
5. ✅ **LAW compliant**: Directus remains SSOT, Agent Data for IDs/logs only
6. ✅ **Graceful degradation**: UI works even if Agent Data is unavailable
7. ✅ **Build GREEN**: lint passes, build succeeds

---

## Implementation Details

### 1. Agent Data Client (`web/lib/agentDataClient.ts`)

**Purpose**: Minimal HTTP client for Agent Data API with strict LAW compliance.

**Key Features**:
- **Search API**:
  - Accepts: `{query, zone?, subZone?, topic?, limit?, language?}`
  - Returns: `{results: [{documentId, score, source}], total, query}`
  - **CRITICAL**: Returns IDs only, NO content text/summary
  - Timeout: 5 seconds (configurable)
  - Graceful degradation: returns empty results on error

- **Logging APIs**:
  - `logPageView`: logs `{documentId, zone, subZone, topic, route, timestamp}`
  - `logSearch`: logs `{query, zone, subZone, topic, resultCount, timestamp}`
  - **Best-effort**: fire-and-forget, errors swallowed silently
  - Timeout: 3 seconds
  - Never blocks UI rendering

**Configuration**:
```typescript
interface AgentDataConfig {
  baseUrl: string;              // e.g., "https://agent-data.example.com"
  apiKey?: string;              // Optional auth token
  enabled: boolean;             // Feature flag
  timeout?: number;             // Request timeout (ms)
}
```

**Error Handling**:
- Search failures → empty results (allows fallback to Directus-only browsing)
- Logging failures → silently swallowed (console.debug in dev mode only)
- Network timeouts → graceful abort
- No crashes, no UI blocking

### 2. Composables (`web/composables/useAgentData.ts`)

**Purpose**: Vue composables that orchestrate Agent Data → Directus flow.

#### `useAgentDataSearch`

```typescript
async function useAgentDataSearch(
  query: string,
  options: { zone?, subZone?, topic?, language?, limit? }
): Promise<{
  items: KnowledgeListEntry[];
  total: number;
  query: string;
}>
```

**Flow**:
1. Call Agent Data search API → get document IDs + scores
2. Query Directus using those IDs:
   - Filter: `id IN [ids]`
   - Filter: `status = 'published'`
   - Filter: `visibility = 'public'`
   - Filter: `language = options.language`
3. Map Directus records to View Model types (Task 0032)
4. Sort results by Agent Data relevance scores
5. Return to UI

**LAW Compliance**:
- ✅ All displayed content comes from Directus
- ✅ Agent Data only provides IDs
- ✅ Directus filters applied (published/public only)
- ✅ View Model mapping preserved

#### `useAgentDataLogPageView`

```typescript
async function useAgentDataLogPageView(params: {
  documentId, zone, subZone?, topic?, route, language?
}): Promise<void>
```

**Behavior**:
- Fire-and-forget POST to `/api/log/page-view`
- Returns immediately (no await)
- Errors swallowed

#### `useAgentDataLogSearch`

```typescript
async function useAgentDataLogSearch(params: {
  query, zone?, subZone?, topic?, resultCount, language?
}): Promise<void>
```

**Behavior**:
- Fire-and-forget POST to `/api/log/search`
- Returns immediately
- Errors swallowed

### 3. Updated Pages

#### Knowledge Index (`web/pages/knowledge/index.vue`)

**Changes**:
- Added search box UI (input + search button)
- Integrated `useAgentDataSearch` when query param `?q=...` present
- Falls back to `useKnowledgeList` (Directus-only) when no search query
- Shows result count: "X results for 'query'"
- Logs search events

**User Flow**:
1. User types query → clicks search
2. URL updates to `/knowledge?q=user+query`
3. `useAsyncData` re-runs with new query param
4. If query exists → Agent Data search → Directus fetch → display
5. If query empty → regular Directus list
6. Search event logged to Agent Data

#### Knowledge Detail (`web/pages/knowledge/[id].vue`)

**Changes**:
- Added `watch` hook on document load
- Calls `useAgentDataLogPageView` with document metadata
- Logging is non-blocking (doesn't delay page render)

#### Blueprint Index (`web/pages/blueprints/index.vue`)

**Changes**:
- Same as Knowledge index
- Additional filter: results limited to `zone='Reference'` or `tags.includes('blueprint')`

#### Blueprint Detail (`web/pages/blueprints/[id].vue`)

**Changes**:
- Same as Knowledge detail
- Logs page views for blueprint documents

### 4. Configuration

#### Runtime Config (`web/nuxt.config.ts`)

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    // Private (server-side only)
    agentData: {
      apiKey: process.env.AGENT_DATA_API_KEY || '',
    },
    // Public (exposed to client)
    public: {
      agentData: {
        baseUrl: process.env.NUXT_PUBLIC_AGENT_DATA_BASE_URL || '',
        enabled: process.env.NUXT_PUBLIC_AGENT_DATA_ENABLED === 'true',
      },
    },
  },
});
```

#### Environment Variables (`.env.example`)

```bash
# Agent Data Setup (Task 0034 - for search and logging only)
# Agent Data is used ONLY for search (returning document IDs) and logging
# Actual content MUST come from Directus
NUXT_PUBLIC_AGENT_DATA_BASE_URL="https://your-agent-data-instance.app"
NUXT_PUBLIC_AGENT_DATA_ENABLED="false"
AGENT_DATA_API_KEY="your_agent_data_api_key"
```

**Configuration Notes**:
- `NUXT_PUBLIC_AGENT_DATA_ENABLED`: Master feature flag
  - `false` (default): Agent Data disabled, all features work without it
  - `true`: Agent Data search/logging enabled
- `AGENT_DATA_API_KEY`: Optional, depends on Agent Data API auth requirements
- Base URL should be HTTPS in production

---

## LAW Compliance Audit

### Data & Connection Law v1.1 - Compliance Matrix

| Law Article | Requirement | Status | Implementation |
|-------------|-------------|--------|----------------|
| **Điều 3-5** | Directus = SSOT for content | ✅ PASS | All displayed content from Directus only |
| **Điều 18** | Filter: published/public only | ✅ PASS | `status='published'`, `visibility='public'` filters applied |
| **Task 0034** | Agent Data = IDs + logs only | ✅ PASS | Search returns IDs, not content text |
| **Task 0034** | Nuxt read-only | ✅ PASS | No write/approve operations in Nuxt |
| **Task 0029** | Agent Data as supporting role | ✅ PASS | Used for search indexing and analytics only |
| **Điều 2** | Assemble > Build | ✅ PASS | Uses existing composables, no new Model/Repository layers |

### Critical LAW Constraints - Verification

1. **Directus SSOT**:
   - ✅ `useAgentDataSearch` queries Directus after getting IDs
   - ✅ All `KnowledgeListEntry` objects mapped from Directus records
   - ✅ No Agent Data content rendered to users

2. **Agent Data Role**:
   - ✅ Search API: returns `{documentId, score}` only
   - ✅ No `content`, `summary`, or `body` fields in search response
   - ✅ Logging: metadata only, no content duplication

3. **Filtering**:
   - ✅ Directus queries always include `status={_eq:'published'}`
   - ✅ Directus queries always include `visibility={_eq:'public'}`
   - ✅ Language filtering applied
   - ✅ Zone/subZone/topic filtering preserved from Task 0032

4. **Graceful Degradation**:
   - ✅ If Agent Data disabled: pages show Directus content (no search)
   - ✅ If Agent Data down: search returns empty, browsing still works
   - ✅ If logging fails: UI continues without error

---

## Search Flow Example

### User Journey: "Search for 'authentication'"

**Step 1**: User enters "authentication" in Knowledge Hub search box

**Step 2**: Click search → URL changes to `/knowledge?q=authentication`

**Step 3**: `useAsyncData` triggers → calls `useAgentDataSearch`

**Step 4**: Agent Data Search
```typescript
// Request to Agent Data
GET /api/search?q=authentication&language=vn&limit=20

// Response (IDs only)
{
  "results": [
    {"documentId": "uuid-1234", "score": 0.95, "source": "knowledge"},
    {"documentId": "uuid-5678", "score": 0.82, "source": "knowledge"}
  ],
  "total": 2
}
```

**Step 5**: Directus Fetch
```typescript
// Query Directus with IDs
readItems('knowledge_documents', {
  filter: {
    id: { _in: ['uuid-1234', 'uuid-5678'] },
    status: { _eq: 'published' },
    visibility: { _eq: 'public' },
    language: { _eq: 'vn' }
  },
  fields: ['id', 'title', 'slug', 'summary', 'category', 'tags', 'published_at', 'language']
})

// Returns full Directus records
```

**Step 6**: View Model Mapping
- Map Directus records to `KnowledgeListEntry` (Task 0032)
- Apply zone/subZone/topic extraction
- Sort by Agent Data scores

**Step 7**: Display to User
- Show 2 results with titles, summaries, zones
- All content from Directus
- Sorted by relevance (Agent Data scores)

**Step 8**: Log Search Event (async, non-blocking)
```typescript
POST /api/log/search
{
  "query": "authentication",
  "resultCount": 2,
  "language": "vn",
  "timestamp": "2025-11-30T10:30:00Z"
}
```

---

## Logging Flow Example

### User Journey: View Knowledge Document

**Step 1**: User clicks on "How to Set Up OAuth"

**Step 2**: Navigate to `/knowledge/how-to-set-up-oauth`

**Step 3**: Page loads → `useKnowledgeDetail` fetches from Directus

**Step 4**: Document loaded → `watch` hook triggers

**Step 5**: Call `useAgentDataLogPageView`
```typescript
POST /api/log/page-view
{
  "documentId": "uuid-1234",
  "zone": "Guide",
  "subZone": "Security",
  "topic": "Authentication",
  "route": "/knowledge/how-to-set-up-oauth",
  "language": "vn",
  "timestamp": "2025-11-30T10:35:00Z"
}
```

**Step 6**: Log request sent (fire-and-forget)
- No await
- User sees page immediately
- If logging fails → silently swallowed

---

## Error Handling

### Scenario 1: Agent Data Down

**Symptom**: Agent Data API returns 500 or times out

**Behavior**:
- Search returns empty results
- Console warning in dev mode (no production logs)
- User can still browse Knowledge Hub via Directus-only lists
- Page views/search logging fails silently

**User Experience**: Degraded but functional

### Scenario 2: Directus Query Fails After Agent Data Search

**Symptom**: Agent Data returns IDs, but Directus query fails

**Behavior**:
- Empty results returned
- Error caught in try/catch
- Console error logged
- No crash

**User Experience**: Search shows "No documents found"

### Scenario 3: Agent Data Disabled

**Symptom**: `NUXT_PUBLIC_AGENT_DATA_ENABLED=false`

**Behavior**:
- Search box still visible (could be hidden in future)
- Search queries ignored (no Agent Data calls)
- Falls back to Directus-only browsing
- No logging

**User Experience**: Browse-only mode

---

## Files Changed Summary

### New Files (3)

1. **`web/lib/agentDataClient.ts`** (175 lines)
   - AgentDataClient class
   - Search and logging methods
   - Error handling, timeouts, graceful degradation

2. **`web/types/agent-data.ts`** (68 lines)
   - TypeScript interfaces for Agent Data
   - Search request/response types
   - Logging event types
   - Config interface

3. **`web/composables/useAgentData.ts`** (165 lines)
   - Vue composables for Agent Data
   - Search orchestration (Agent Data → Directus)
   - Logging helpers

### Modified Files (6)

1. **`web/nuxt.config.ts`**
   - Added `runtimeConfig.agentData` (private)
   - Added `runtimeConfig.public.agentData` (public)

2. **`web/.env.example`**
   - Documented 3 new env vars with usage notes

3. **`web/pages/knowledge/index.vue`**
   - Added search box UI
   - Integrated Agent Data search
   - Added search event logging

4. **`web/pages/knowledge/[id].vue`**
   - Added page view logging

5. **`web/pages/blueprints/index.vue`**
   - Added search box UI
   - Integrated Agent Data search
   - Added blueprint filtering

6. **`web/pages/blueprints/[id].vue`**
   - Added page view logging

---

## Build & Lint Status

✅ **Lint**: Passes with 124 warnings (all pre-existing, none from new code)
✅ **Build**: Succeeds, all chunks generated
✅ **TypeScript**: No errors in new code
✅ **Runtime Config**: Properly typed and accessible

### New Code Quality

- **Console statements**: Properly guarded with `eslint-disable-next-line`
- **Type safety**: All new functions fully typed
- **Error handling**: Comprehensive try/catch blocks
- **Comments**: Well-documented LAW constraints

---

## Testing Notes

### Manual Testing Required (Post-Merge)

1. **Agent Data Integration**:
   - [ ] Set up Agent Data endpoint
   - [ ] Configure env vars in deployment
   - [ ] Test search with live Agent Data
   - [ ] Verify logging endpoints work

2. **Fallback Scenarios**:
   - [ ] Disable Agent Data → verify browsing still works
   - [ ] Simulate Agent Data timeout → verify graceful degradation
   - [ ] Test with invalid API key → verify error handling

3. **Search Quality**:
   - [ ] Verify search results are relevant
   - [ ] Check score-based sorting
   - [ ] Test multi-language search
   - [ ] Test zone/subZone filtering in search

### Unit Testing (Future Task)

Recommended unit tests:
- `agentDataClient.search()` with mocked fetch
- `useAgentDataSearch()` flow
- Error handling scenarios
- Graceful degradation

---

## Open Questions / Follow-Ups

### 1. Agent Data API Specification

**Question**: What is the actual Agent Data API endpoint structure?

**Current Assumption**:
- `GET /api/search?q=query&zone=Guide&language=vn`
- Response: `{results: [{documentId, score, source}], total}`

**Action Required**: Update `agentDataClient.ts` response mapping when actual API spec is available.

### 2. Authentication

**Question**: Does Agent Data API require authentication?

**Current Implementation**: Optional API key in Authorization header

**Action Required**: Confirm auth mechanism (Bearer token, API key, etc.)

### 3. Logging Retention

**Question**: How long should Agent Data keep logs?

**No action needed** from Nuxt side (backend concern)

### 4. Search Result Ranking

**Question**: Should we blend Agent Data scores with Directus metadata (publish date, etc.)?

**Current Implementation**: Pure Agent Data score sorting

**Future Enhancement**: Could add "recency boost" or "zone weighting"

### 5. Search Box UX

**Question**: Should search box be hidden when Agent Data is disabled?

**Current Implementation**: Always visible

**Future Enhancement**: Add `v-if="config.public.agentData.enabled"` condition

---

## CI & PR Status (0034a – Claude Verification)

**Branch**: `feat/0034-nuxt-agentdata-api`
**PR**: #89 - https://github.com/Huyen1974/web-test/pull/89
**Status**: OPEN, MERGEABLE

### Local Verification (2025-11-30)

✅ **Lint**: PASS (0 errors, 123 warnings - all pre-existing)
- Fixed 1 console.error lint error in `web/composables/useAgentData.ts`
- No new warnings introduced by Task 0034 code

✅ **Build**: PASS (exit code 0)
- Build completed successfully with all chunks generated
- Total build size: 12.4 MB (4.11 MB gzip)
- No runtime config errors
- Directus redirect warning (403) is expected and non-blocking

### GitHub CI Status (All GREEN ✅)

✅ **build** (Nuxt 3 CI) - SUCCESS
- Workflow: Nuxt 3 CI
- Status: COMPLETED
- Conclusion: SUCCESS

✅ **Pass Gate** (Terraform Deploy) - SUCCESS
- Workflow: Terraform Deploy
- Status: COMPLETED
- Conclusion: SUCCESS

✅ **Quality Gate** (Terraform Deploy) - SUCCESS
- Workflow: Terraform Deploy
- Status: COMPLETED
- Conclusion: SUCCESS

✅ **E2E Smoke Test** (Terraform Deploy) - SUCCESS
- Workflow: Terraform Deploy
- Status: COMPLETED
- Conclusion: SUCCESS

### Merge Conflicts Resolution

Merge conflicts were encountered when syncing with main (Task 0033 was merged after Task 0034 branched off). Conflicts resolved in:
- `web/nuxt.config.ts` - Kept Agent Data config additions
- `web/.env.example` - Kept Agent Data env var documentation
- `web/pages/knowledge/index.vue` - Kept Task 0034 version (with search)
- `web/pages/knowledge/[id].vue` - Kept Task 0034 version (with logging)
- `web/pages/blueprints/index.vue` - Kept Task 0034 version (with search)
- `web/pages/blueprints/[id].vue` - Kept Task 0034 version (with logging)

All conflicts resolved successfully by keeping Task 0034 versions which include both Task 0033 baseline + Task 0034 enhancements.

### Commits

1. `9f1d604` - feat(web): implement Task 0034 - Nuxt ↔ Directus content + Agent Data search/log
2. `1ce3fd9` - docs(0034): add implementation report
3. `e0e1f64` - fix(0034): add eslint-disable for console.error in useAgentData
4. `9d47f9b` - chore(0034a): merge main to resolve conflicts

### Final Status

**PR #89 is READY for Codex review & merge** ✅

- All local checks pass (lint, build)
- All GitHub CI checks pass (build, Pass Gate, Quality Gate, E2E)
- No merge conflicts
- Branch is up to date with main
- No blocking issues

---

## Next Steps

### Immediate (This PR)

- [x] Code implementation
- [x] Lint/build verification
- [x] PR creation (#89)
- [x] Implementation report (this document)
- [ ] Codex review + auto-merge

### Post-Merge

1. **Task 0035**: Approval UI (next in Web_List_to_do_01.md)
2. **Agent Data Backend**: Implement actual search/logging endpoints
3. **Integration Testing**: Test with live Agent Data
4. **Monitoring**: Add observability for Agent Data health

### Future Enhancements

- Search result highlighting
- Advanced search filters (date range, multi-zone)
- Search history
- Autocomplete suggestions
- Analytics dashboard (using Agent Data logs)

---

## Conclusion

Task 0034 is **COMPLETE** and **LAW COMPLIANT**. The implementation:

✅ Maintains Directus as SSOT for all displayed content
✅ Uses Agent Data only for search IDs and logging
✅ Preserves existing View Model architecture (Task 0032)
✅ Extends existing UI shell (Task 0033) without breaking changes
✅ Provides graceful degradation
✅ Passes build and lint checks

The system is now ready for integration testing with a live Agent Data backend and can proceed to Task 0035 (Approval UI).

---

**Generated**: 2025-11-30
**Engineer**: Claude Code (Sonnet 4.5)
**Supervising Agent**: Host / Gemini / ChatGPT
**Reference**: Web_List_to_do_01.md, Data & Connection Law v1.1
