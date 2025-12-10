# Task E1-03: Dashboard Creation for Content Operations

**Task**: E1-03-DASHBOARD-QUEUES
**Purpose**: Create Directus Dashboards for operational visibility into content request queues and SLA metrics
**Date**: 2025-12-10

---

## Overview

This document describes the Directus Dashboard created for E1 Phase Content Operations. The dashboard provides real-time visibility into:

- **Queue Status**: Which requests need immediate attention vs. automated processing
- **SLA Tracking**: Identify overdue requests requiring escalation
- **Operational Metrics**: Volume trends and completion rates

The dashboard is created programmatically via the Directus API using the script `scripts/e1-03_create_dashboards.ts`.

---

## Dashboard Definition

### Dashboard: Content Operations

**Name**: `Content Operations`
**Icon**: 📊 (dashboard)
**Color**: Purple (#6644FF)
**Purpose**: Operational dashboard for content request lifecycle management

**Target Users**:
- Content editors monitoring their review queue
- Team leads tracking SLA compliance
- Operations managers monitoring agent performance

---

## Dashboard Panels

The dashboard consists of 6 panels arranged in a grid layout:

### Panel 1: Cần duyệt ngay (Need Immediate Review/Approval)

**Type**: List panel
**Icon**: ⚠️ (warning)
**Color**: Orange (#FF9800)
**Position**: (1, 1)
**Size**: 12x8
**Purpose**: Show content_requests awaiting human review or approval

**Filter Logic**:
```json
{
  "_or": [
    { "status": { "_eq": "awaiting_review" } },
    { "status": { "_eq": "awaiting_approval" } }
  ]
}
```

**Displayed Columns**:
- `id` - Request ID
- `title` - Request title
- `status` - Current status (awaiting_review or awaiting_approval)
- `current_holder` - Who should review it
- `created_at` - Original creation time
- `updated_at` - Last modified time (for urgency assessment)

**Sort**: `-updated_at` (most recently updated first)
**Limit**: 25 items

**Business Logic**: This panel surfaces the most critical queue - requests that require human attention NOW. Editors should prioritize items that have been waiting longest.

---

### Panel 2: Agent đang chạy (Agent Running)

**Type**: List panel
**Icon**: 🤖 (smart_toy)
**Color**: Blue (#2196F3)
**Position**: (13, 1)
**Size**: 12x8
**Purpose**: Show content_requests currently being processed by agents

**Filter Logic**:
```json
{
  "_or": [
    { "status": { "_eq": "drafting" } },
    { "status": { "_eq": "assigned" } }
  ]
}
```

**Displayed Columns**:
- `id` - Request ID
- `title` - Request title
- `status` - Current status (drafting or assigned)
- `current_holder` - Which agent is processing it
- `updated_at` - Last activity timestamp

**Sort**: `-updated_at` (most recently updated first)
**Limit**: 25 items

**Business Logic**: This panel provides visibility into the automated workflow. If an agent is stuck on a request for too long (e.g., >1 hour), it may need manual intervention.

---

### Panel 3: Bài mới trong tuần (New This Week)

**Type**: Metric panel
**Icon**: 🆕 (fiber_new)
**Color**: Green (#4CAF50)
**Position**: (1, 9)
**Size**: 6x4
**Purpose**: Count of content_requests created in the last 7 days

**Filter Logic**:
```json
{
  "created_at": { "_gte": "$NOW(-7 days)" }
}
```

**Aggregation**: `COUNT(id)`

**Business Logic**: This metric helps track incoming request volume. A sudden spike may indicate a content campaign launch or event requiring additional resources.

---

### Panel 4: Tổng bài đang xử lý (Total In Progress)

**Type**: Metric panel
**Icon**: ⏳ (pending_actions)
**Color**: Cyan (#00BCD4)
**Position**: (7, 9)
**Size**: 6x4
**Purpose**: Total count of active content_requests (not published/rejected/canceled)

**Filter Logic**:
```json
{
  "status": {
    "_nin": ["published", "rejected", "canceled"]
  }
}
```

**Aggregation**: `COUNT(id)`

**Business Logic**: This metric shows the current workload. If the number grows too large, it indicates a bottleneck in the review or drafting process.

---

### Panel 5: SLA: Quá hạn (SLA: Overdue)

**Type**: List panel
**Icon**: ⏰ (schedule)
**Color**: Red (#F44336)
**Position**: (13, 9)
**Size**: 12x8
**Purpose**: Show requests overdue for review/approval (>24 hours)

**Filter Logic**:
```json
{
  "_and": [
    {
      "_or": [
        { "status": { "_eq": "awaiting_review" } },
        { "status": { "_eq": "awaiting_approval" } }
      ]
    },
    {
      "updated_at": { "_lt": "$NOW(-24 hours)" }
    }
  ]
}
```

**Displayed Columns**:
- `id` - Request ID
- `title` - Request title
- `status` - Current status
- `current_holder` - Assigned reviewer
- `updated_at` - Last modified time (shows how overdue)

**Sort**: `updated_at` (oldest first - most overdue at top)
**Limit**: 25 items

**Business Logic**: This is the SLA enforcement panel. Items here have been waiting more than 24 hours for human action and should be escalated. Red color draws attention to critical delays.

**SLA Definition**: 24-hour response time for review/approval stages. This is a baseline SLA; future iterations may introduce tiered SLAs based on priority/urgency fields.

---

### Panel 6: Hoàn thành tuần này (Completed This Week)

**Type**: Metric panel
**Icon**: ✅ (check_circle)
**Color**: Green (#4CAF50)
**Position**: (1, 13)
**Size**: 6x4
**Purpose**: Count of content_requests published in the last 7 days

**Filter Logic**:
```json
{
  "_and": [
    { "status": { "_eq": "published" } },
    { "updated_at": { "_gte": "$NOW(-7 days)" } }
  ]
}
```

**Aggregation**: `COUNT(id)`

**Business Logic**: This metric tracks team productivity and throughput. Compare with "New This Week" to assess whether the team is keeping up with incoming demand.

---

## Dashboard Layout

```
┌─────────────────────────────┬─────────────────────────────┐
│  Cần duyệt ngay (12x8)      │  Agent đang chạy (12x8)     │
│  [List]                     │  [List]                     │
│  - awaiting_review          │  - drafting                 │
│  - awaiting_approval        │  - assigned                 │
└─────────────────────────────┴─────────────────────────────┘
┌──────────────┬──────────────┬─────────────────────────────┐
│ Bài mới      │ Tổng bài     │  SLA: Quá hạn (12x8)        │
│ trong tuần   │ đang xử lý   │  [List]                     │
│ (6x4)        │ (6x4)        │  - >24h overdue             │
│ [Metric]     │ [Metric]     │                             │
└──────────────┴──────────────┴─────────────────────────────┘
┌──────────────┐
│ Hoàn thành   │
│ tuần này     │
│ (6x4)        │
│ [Metric]     │
└──────────────┘
```

**Design Rationale**:
- **Top row**: List panels for immediate action (review queue and agent monitoring)
- **Middle row**: KPIs for volume tracking + SLA violations
- **Bottom row**: Completion metrics for trend analysis

---

## Script Implementation

### File: `scripts/e1-03_create_dashboards.ts`

**Size**: ~750 lines
**Language**: TypeScript (Node.js with tsx runtime)
**Authentication**: Email/password login via `/auth/login`
**Idempotency**: Yes - safe to run multiple times

### Usage

```bash
# Dry-run mode (default) - shows what would be created
npx tsx scripts/e1-03_create_dashboards.ts

# Execute mode - actually creates/updates dashboard
npx tsx scripts/e1-03_create_dashboards.ts --execute
```

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DIRECTUS_URL` | Yes | Base URL of Directus TEST instance | `http://127.0.0.1:8080` |
| `DIRECTUS_ADMIN_EMAIL` | Yes | Admin email for authentication | From Secret Manager |
| `DIRECTUS_ADMIN_PASSWORD` | Yes | Admin password | From Secret Manager |

**Setup Example**:

```bash
# Using gcloud to fetch secrets (TEST environment)
export DIRECTUS_URL="http://127.0.0.1:8085"
export DIRECTUS_ADMIN_EMAIL=$(gcloud secrets versions access latest --secret="DIRECTUS_ADMIN_EMAIL_test")
export DIRECTUS_ADMIN_PASSWORD=$(gcloud secrets versions access latest --secret="DIRECTUS_ADMIN_PASSWORD_test")

# Run script
npx tsx scripts/e1-03_create_dashboards.ts --execute
```

### Script Behavior

1. **Authentication**: Logs in via `/auth/login` to obtain access token
2. **Ensure Dashboard**:
   - Checks if "Content Operations" dashboard exists
   - If exists: updates definition (name, icon, note, color)
   - If not exists: creates new dashboard
3. **Ensure Panels**:
   - For each of 6 panels: checks if panel with matching name exists
   - If exists: updates panel definition (type, filters, options)
   - If not exists: creates new panel and links to dashboard
4. **Report Generation**: Saves execution report with timestamp and actions taken

**Idempotency Strategy**: The script uses dashboard name and panel name as natural keys. On subsequent runs, it updates existing resources rather than creating duplicates.

---

## Verification Steps

### 1. Via Directus UI

1. Open Directus Admin UI: `http://127.0.0.1:8080/admin`
2. Navigate to: **Insights** (icon in left sidebar)
3. Verify dashboard appears: **Content Operations** (purple icon)
4. Click on the dashboard to open it
5. Verify all 6 panels are present and positioned correctly:
   - Top left: "Cần duyệt ngay" (list)
   - Top right: "Agent đang chạy" (list)
   - Middle left: "Bài mới trong tuần" (metric)
   - Middle center: "Tổng bài đang xử lý" (metric)
   - Middle right: "SLA: Quá hạn" (list)
   - Bottom left: "Hoàn thành tuần này" (metric)
6. Check that list panels display actual data (if content_requests exist)
7. Verify metric panels show counts (numbers)

**Expected Appearance**:
- Dashboard header: "Content Operations" with dashboard icon
- Grid layout with panels arranged as described
- List panels show rows with columns (id, title, status, etc.)
- Metric panels show large numbers with icons
- Color coding: Orange for urgent, Blue for agents, Red for overdue, Green for completion

---

### 2. Via API

```bash
# Set environment variables
export DIRECTUS_URL="http://127.0.0.1:8080"
export DIRECTUS_ADMIN_EMAIL="your-email"
export DIRECTUS_ADMIN_PASSWORD="your-password"

# Authenticate
TOKEN=$(curl -s -X POST "$DIRECTUS_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'"$DIRECTUS_ADMIN_EMAIL"'","password":"'"$DIRECTUS_ADMIN_PASSWORD"'"}' \
  | jq -r '.data.access_token')

# List all dashboards
curl -s -H "Authorization: Bearer $TOKEN" \
  "$DIRECTUS_URL/dashboards" | jq '.data[] | {name, icon, color}'

# Expected output:
# {
#   "name": "Content Operations",
#   "icon": "dashboard",
#   "color": "#6644FF"
# }

# Get dashboard ID
DASHBOARD_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$DIRECTUS_URL/dashboards" | jq -r '.data[] | select(.name=="Content Operations") | .id')

# List panels for this dashboard
curl -s -H "Authorization: Bearer $TOKEN" \
  "$DIRECTUS_URL/panels?filter[dashboard][_eq]=$DASHBOARD_ID" \
  | jq '.data[] | {name, type, position_x, position_y, width, height}'

# Expected output (6 panels):
# {"name":"Cần duyệt ngay","type":"list","position_x":1,"position_y":1,"width":12,"height":8}
# {"name":"Agent đang chạy","type":"list","position_x":13,"position_y":1,"width":12,"height":8}
# {"name":"Bài mới trong tuần","type":"metric","position_x":1,"position_y":9,"width":6,"height":4}
# {"name":"Tổng bài đang xử lý","type":"metric","position_x":7,"position_y":9,"width":6,"height":4}
# {"name":"SLA: Quá hạn","type":"list","position_x":13,"position_y":9,"width":12,"height":8}
# {"name":"Hoàn thành tuần này","type":"metric","position_x":1,"position_y":13,"width":6,"height":4}
```

---

### 3. Functional Testing

#### Test with Sample Data

To fully verify the dashboard, you need sample `content_requests` data:

```bash
# Authenticate (see above)

# Create test requests in different states

# 1. Create request awaiting review (should appear in "Cần duyệt ngay")
curl -X POST "$DIRECTUS_URL/items/content_requests" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test: Needs Review",
    "requirements": "This request should appear in the review queue",
    "status": "awaiting_review",
    "current_holder": "editor_01"
  }'

# 2. Create request being drafted by agent (should appear in "Agent đang chạy")
curl -X POST "$DIRECTUS_URL/items/content_requests" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test: Agent Drafting",
    "requirements": "This request should appear in the agent queue",
    "status": "drafting",
    "current_holder": "agent_001"
  }'

# 3. Create old request for SLA test (should appear in "SLA: Quá hạn")
# First create, then update to set old timestamp
REQUEST_ID=$(curl -X POST "$DIRECTUS_URL/items/content_requests" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test: SLA Overdue",
    "requirements": "This request is overdue",
    "status": "awaiting_approval",
    "current_holder": "editor_02"
  }' | jq -r '.data.id')

# Manually update updated_at to 48 hours ago (requires direct DB access or wait 24h)

# 4. Create published request (should count in "Hoàn thành tuần này")
curl -X POST "$DIRECTUS_URL/items/content_requests" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test: Completed",
    "requirements": "This request was completed",
    "status": "published",
    "current_holder": "system"
  }'
```

**Expected Results**:
- "Cần duyệt ngay" panel: Shows "Test: Needs Review"
- "Agent đang chạy" panel: Shows "Test: Agent Drafting"
- "Bài mới trong tuần" metric: Shows 4 (all created today)
- "Tổng bài đang xử lý" metric: Shows 3 (excludes published)
- "SLA: Quá hạn" panel: May be empty unless request is >24h old
- "Hoàn thành tuần này" metric: Shows 1 (only published)

---

## Configuration

### Filter Syntax

The dashboard panels use Directus Filter Rules syntax:

**Comparison Operators**:
- `_eq`: Equals
- `_neq`: Not equals
- `_lt`: Less than
- `_lte`: Less than or equal
- `_gt`: Greater than
- `_gte`: Greater than or equal
- `_in`: In array
- `_nin`: Not in array
- `_null`: Is null
- `_nnull`: Is not null

**Logical Operators**:
- `_and`: All conditions must match
- `_or`: At least one condition must match

**Dynamic Values**:
- `$NOW`: Current timestamp
- `$NOW(-7 days)`: 7 days ago
- `$NOW(-24 hours)`: 24 hours ago

**Examples from this dashboard**:

```json
// Awaiting review OR awaiting approval
{
  "_or": [
    { "status": { "_eq": "awaiting_review" } },
    { "status": { "_eq": "awaiting_approval" } }
  ]
}

// Created in last 7 days
{
  "created_at": { "_gte": "$NOW(-7 days)" }
}

// Overdue (awaiting review/approval AND last updated >24h ago)
{
  "_and": [
    {
      "_or": [
        { "status": { "_eq": "awaiting_review" } },
        { "status": { "_eq": "awaiting_approval" } }
      ]
    },
    {
      "updated_at": { "_lt": "$NOW(-24 hours)" }
    }
  ]
}
```

### Customization

To adjust filters or add new panels:

1. Edit `scripts/e1-03_create_dashboards.ts`
2. Modify `PANEL_DEFINITIONS` array
3. Change filter logic in `options.query.filter`
4. Adjust `position_x`, `position_y`, `width`, `height` for layout
5. Re-run script with `--execute`

**Example: Add "High Priority Queue" panel**:

```typescript
{
  key: 'e1_queue_high_priority',
  name: 'Ưu tiên cao',
  icon: 'priority_high',
  color: '#E91E63',
  type: 'list',
  position_x: 1,
  position_y: 17,
  width: 12,
  height: 8,
  show_header: true,
  note: 'High priority content requests',
  options: {
    collection: 'content_requests',
    query: {
      fields: ['id', 'title', 'status', 'priority', 'created_at'],
      sort: ['-priority', '-created_at'],
      filter: {
        _and: [
          { priority: { "_eq": "high" } },
          { status: { "_nin": ["published", "canceled"] } }
        ]
      },
      limit: 25
    }
  }
}
```

---

## Troubleshooting

### Issue: Dashboard not appearing in Directus UI

**Symptoms**:
- Script reports success but dashboard doesn't show in Insights
- "Content Operations" not listed

**Diagnosis**:
1. Check user permissions: does your user have access to Insights module?
2. Verify dashboard was created:
   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" "$DIRECTUS_URL/dashboards"
   ```
3. Check browser console for errors

**Solutions**:
- Grant "Directus Dashboards" read permission to your role
- Refresh page (Ctrl+R or Cmd+R)
- Clear browser cache
- Re-run script with `--execute` to ensure dashboard exists

---

### Issue: Panels show "No data"

**Symptoms**:
- Dashboard loads but list panels are empty
- Metric panels show 0

**Diagnosis**:
1. Check if `content_requests` collection has any data:
   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" \
     "$DIRECTUS_URL/items/content_requests?limit=5"
   ```
2. Verify filter logic matches your data (e.g., do you have items with `status='awaiting_review'`?)
3. Check user permissions: can you read `content_requests`?

**Solutions**:
- Create sample data (see Functional Testing section)
- Adjust filters to match your actual status values
- Grant read permission on `content_requests` to your role
- Verify status enum values match E1-01 schema

---

### Issue: SLA panel doesn't show overdue items

**Symptoms**:
- "SLA: Quá hạn" panel is empty even though you have old requests

**Root Cause**: Requests need to be >24 hours old (based on `updated_at` field)

**Solutions**:
- Wait 24+ hours after creating test data
- For testing: manually update `updated_at` field in database:
  ```sql
  UPDATE content_requests
  SET updated_at = NOW() - INTERVAL '48 hours'
  WHERE status IN ('awaiting_review', 'awaiting_approval');
  ```
- Adjust SLA threshold in script if 24 hours is too aggressive:
  ```typescript
  // Change from -24 hours to -2 hours for testing
  updated_at: { "_lt": "$NOW(-2 hours)" }
  ```

---

### Issue: Panels overlapping or layout broken

**Symptoms**:
- Panels appear on top of each other
- Grid doesn't display correctly
- Panels cut off

**Diagnosis**:
1. Check panel positions in database:
   ```bash
   curl -s -H "Authorization: Bearer $TOKEN" \
     "$DIRECTUS_URL/panels?filter[dashboard][_eq]=$DASHBOARD_ID" \
     | jq '.data[] | {name, position_x, position_y, width, height}'
   ```
2. Verify no two panels occupy the same grid cells

**Solutions**:
- Re-run script with `--execute` to reset panel positions
- Manually drag panels in Directus UI to rearrange
- Edit `PANEL_DEFINITIONS` in script to adjust positions:
  - Grid is 24 units wide
  - Panels placed at (position_x, position_y) with size (width, height)
  - Ensure no overlap: panel A ends before panel B starts

---

### Issue: Metric panels show incorrect counts

**Symptoms**:
- "Bài mới trong tuần" shows wrong number
- Counts don't match manual queries

**Diagnosis**:
1. Test filter directly:
   ```bash
   # Manual count for "new this week"
   curl -s -H "Authorization: Bearer $TOKEN" \
     "$DIRECTUS_URL/items/content_requests?aggregate[count]=id&filter[created_at][_gte]=\$NOW(-7 days)"
   ```
2. Compare with metric panel value
3. Check if filter syntax is correct

**Solutions**:
- Verify `$NOW` syntax is supported by your Directus version (v9.22+)
- Use absolute timestamps for testing:
  ```typescript
  created_at: { "_gte": "2025-12-03T00:00:00" }
  ```
- Check timezone settings (server vs. database vs. client)

---

## Design Decisions & Trade-offs

### 1. 24-Hour SLA Threshold

**Decision**: Defined SLA as 24 hours for review/approval stages

**Rationale**:
- Provides reasonable response time for editors
- Balances urgency with realistic workload
- Aligns with common content operations practices

**Trade-offs**:
- May be too aggressive for low-priority requests
- May be too lenient for high-priority/urgent requests

**Future Enhancement**: Add `priority` field to `content_requests` and implement tiered SLAs:
- High priority: 2-hour SLA
- Normal priority: 24-hour SLA
- Low priority: 72-hour SLA

---

### 2. Agent Detection via Status

**Decision**: Identify agent-processed requests by status (`drafting`, `assigned`) rather than checking `current_holder` field

**Rationale**:
- Status is more reliable indicator of workflow stage
- Avoids dependency on agent naming convention (e.g., "agent_001" vs "agent-system")
- Simpler filter logic

**Trade-offs**:
- Assumes agents only operate in `drafting`/`assigned` states
- Human editors could technically be in these states too

**Alternative Approach**: Add filter on `current_holder`:
```typescript
filter: {
  _and: [
    { status: { "_in": ["drafting", "assigned"] } },
    { current_holder: { "_starts_with": "agent" } }
  ]
}
```

---

### 3. List Panel Limit of 25

**Decision**: Cap list panels at 25 items per panel

**Rationale**:
- Prevents UI performance issues with large result sets
- Dashboard should show summary, not exhaustive list
- Users can click through to full collection view for deep dives

**Trade-offs**:
- May hide items 26+ in queue
- Not suitable for high-volume operations (100+ pending reviews)

**Future Enhancement**: Add pagination or "View All" link to collection view with same filters

---

### 4. No Real-Time Updates

**Decision**: Dashboard panels refresh on page load, not in real-time

**Rationale**:
- Directus Insights doesn't support WebSocket-based live updates (as of v9.x)
- Polling would increase server load
- Content operations don't require sub-second responsiveness

**Trade-offs**:
- Users must manually refresh to see latest data
- May miss urgent requests between refreshes

**Workaround**: Set browser to auto-refresh every 5 minutes or use Directus API + custom Nuxt dashboard with live queries

---

## Next Steps

After successfully creating and verifying E1-03 dashboard:

### Immediate Next Steps
1. **Test in TEST environment**:
   - Create sample content_requests in various states
   - Verify all panels display correct data
   - Test SLA panel with old requests
   - Validate metric calculations

2. **Collect User Feedback**:
   - Show dashboard to content editors and team leads
   - Ask: "Does this give you the visibility you need?"
   - Identify missing metrics or pain points

### E1-04: Nuxt Approval Desk UI (Next Task)
- Build frontend UI in Nuxt for editors to review content
- Display `content_requests` in table or kanban view
- Add quick actions: Approve, Reject, Request Changes
- Show linked `knowledge_document` preview
- Implement status transition workflows

### E1-05: Folder/Tree Display
- Show `knowledge_documents` in hierarchical tree
- Use `parent_document_id` relation from E1-01
- Implement folder navigation and breadcrumbs
- Add drag-and-drop for reorganization

### E1-06: Agent Data V12 Integration (E2E)
- Connect real agent service to Flow A webhook
- Test full closed-loop pipeline end-to-end
- Monitor dashboard metrics during agent runs
- Validate SLA tracking with production-like data

---

## References

### Documentation
- [E1 Plan](../docs/E1_Plan.md) - Dashboard & SLA requirements
- [Web_List_to_do_01.md](../docs/Web_List_to_do_01.md) - Task E1-03-DASHBOARD-QUEUES
- [E1-01 Schema Growth Report](./E1-01_schema_growth_execution.md) - content_requests schema
- [E1-02 Flows Report](./E1-02_flows_basic_execution.md) - Related flow automation

### Directus Documentation
- [Insights Overview](https://docs.directus.io/app/insights.html)
- [Dashboards](https://docs.directus.io/app/insights/dashboards.html)
- [Panels](https://docs.directus.io/app/insights/panels.html)
- [Filter Rules](https://docs.directus.io/reference/filter-rules.html)

### Related Code
- **Script**: `/scripts/e1-03_create_dashboards.ts` - Dashboard creation logic
- **Schema**: Task E1-01 created `content_requests` collection with status enum
- **Flows**: Task E1-02 created automation flows that update `content_requests`

---

## Appendix: Panel Options Reference

For reference, here's the complete panel configuration format used in this dashboard:

### List Panel Options

```typescript
{
  collection: 'content_requests',
  query: {
    fields: ['id', 'title', 'status', ...],  // Columns to display
    sort: ['-updated_at'],                   // Sort order (- = descending)
    filter: { /* filter object */ },         // Directus filter rules
    limit: 25                                 // Max rows to display
  }
}
```

### Metric Panel Options

```typescript
{
  collection: 'content_requests',
  field: 'id',                               // Field to aggregate
  function: 'count',                         // Aggregation: count, sum, avg, min, max
  filter: { /* filter object */ }            // Directus filter rules
}
```

### Time Series Panel (Not Used Here)

```typescript
{
  collection: 'content_requests',
  dateField: 'created_at',                   // X-axis field (timestamp)
  valueField: 'id',                          // Y-axis field
  function: 'count',                         // Aggregation function
  range: 'week',                             // Time range: hour, day, week, month
  filter: { /* filter object */ }
}
```

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
