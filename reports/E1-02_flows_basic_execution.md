# Task E1-02: Flows Creation Report

**Task**: E1-02-FLOWS-BASIC
**Purpose**: Create Directus Flows for Content Request Closed Loop
**Date**: 2025-12-10

---

## Overview

This document describes the Directus Flows created for E1 Phase Content Operations closed-loop pipeline. Two flows are implemented:

- **Flow A**: Content Request → Agent Webhook trigger
- **Flow B**: Audit/Revision logging skeleton

Both flows are created programmatically via the Directus API using the script `scripts/e1-02_create_flows.ts`.

---

## Flow Definitions

### Flow A: Content Request → Agent Webhook

**Name**: `E1: Content Request → Agent Trigger`
**Key**: `e1_content_request_to_agent`
**Icon**: 📤 (send)
**Color**: Purple (#6644FF)
**Status**: Active
**Trigger**: Event-based (items.create, items.update on `content_requests`)
**Accountability**: All

**Purpose**: Triggers Agent webhook when a content_request transitions to `status='new'`, initiating the drafting process.

#### Operations Chain

Flow A consists of 6 operations forming a linear chain with error handling:

```
[1] Read Trigger Data (trigger)
    ↓ resolve
[2] Check Status = New (condition)
    ↓ resolve (if status='new')
[3] Build Webhook Payload (transform)
    ↓ resolve
[4] POST to Agent Webhook (request)
    ↓ resolve (success)     ↓ reject (failure)
[5] Log Success (log)    [6] Log Error (log)
```

**Operation Details**:

1. **Read Trigger Data** (type: `trigger`)
   - Position: (3, 1)
   - Captures the incoming event payload from `content_requests` collection
   - Provides `$trigger.payload` context for downstream operations

2. **Check Status = New** (type: `condition`)
   - Position: (19, 1)
   - Filter: `$trigger.payload.status._eq = 'new'`
   - Only proceeds if the content_request status is exactly 'new'
   - Prevents duplicate webhook calls on other status changes

3. **Build Webhook Payload** (type: `transform`)
   - Position: (35, 1)
   - Transforms trigger data into standardized MCP v5.0 envelope format
   - Creates JSON payload with idempotency_key and correlation_id
   - Output available as `{{transform_payload}}`

4. **POST to Agent Webhook** (type: `request`)
   - Position: (51, 1)
   - Method: POST
   - URL: `AGENT_WEBHOOK_URL` environment variable
   - Headers:
     - `Content-Type: application/json`
     - `X-Directus-Event: content_request.status.new`
   - Body: `{{transform_payload}}`
   - Timeout: 30 seconds (Directus default)

5. **Log Success** (type: `log`)
   - Position: (67, 1)
   - Message: `[E1-02] Agent webhook triggered for content_request {{$trigger.payload.id}}`
   - Writes to Directus activity log on successful webhook call

6. **Log Error** (type: `log`)
   - Position: (51, 17) - below webhook operation
   - Message: `[E1-02] ERROR: Failed to trigger agent webhook for content_request {{$trigger.payload.id}}: {{$last.error}}`
   - Captures webhook failures (timeout, network error, non-2xx response)
   - **Important**: Errors are logged but do NOT block the flow or transaction

#### Webhook Payload Structure

The webhook receives a JSON payload conforming to MCP v5.0 message envelope:

```json
{
  "content_request_id": "uuid-of-content-request",
  "title": "Title of content request",
  "status": "new",
  "current_holder": "agent_001",
  "requirements": "User requirements text...",
  "created_at": "2025-12-10T10:30:00.000Z",
  "updated_at": "2025-12-10T10:30:00.000Z",
  "idempotency_key": "uuid_timestamp",
  "correlation_id": "content_request_new",
  "event_type": "content_request.status.new",
  "timestamp": "2025-12-10T10:30:05.000Z"
}
```

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| `content_request_id` | UUID | Primary key of content_requests item |
| `title` | String | Title of the content request |
| `status` | String | Current status (always 'new' for Flow A) |
| `current_holder` | String | Agent/user currently responsible |
| `requirements` | Text | User requirements for content |
| `created_at` | Timestamp | Original creation time |
| `updated_at` | Timestamp | Last update time |
| `idempotency_key` | String | Unique key for deduplication: `{id}_{updated_at}` |
| `correlation_id` | String | Fixed identifier for this event type |
| `event_type` | String | Event classification: `content_request.status.new` |
| `timestamp` | Timestamp | Webhook trigger time |

**Idempotency**: The `idempotency_key` combines the content_request ID and updated_at timestamp, ensuring the agent can detect and skip duplicate webhook calls if the flow triggers multiple times for the same state.

---

### Flow B: Content Request Audit Log (Skeleton)

**Name**: `E1: Content Request Audit Log`
**Key**: `e1_content_request_audit`
**Icon**: 📜 (history)
**Color**: Blue (#2196F3)
**Status**: Active
**Trigger**: Event-based (items.update on `content_requests`)
**Accountability**: All

**Purpose**: Logs workflow transitions and status changes for audit trail. This is a skeleton implementation to be expanded in future tasks.

#### Operations Chain

Flow B consists of 3 operations:

```
[1] Read Trigger Data (trigger)
    ↓ resolve
[2] Check Status Changed (condition)
    ↓ resolve (if status field exists)
[3] Log Audit Entry (log)
```

**Operation Details**:

1. **Read Trigger Data** (type: `trigger`)
   - Position: (3, 1)
   - Captures update event from `content_requests` collection
   - Key: `read_trigger_audit`

2. **Check Status Changed** (type: `condition`)
   - Position: (19, 1)
   - Filter: `$trigger.payload.status._nnull = true`
   - Checks if status field is present and not null
   - Key: `condition_status_changed`

3. **Log Audit Entry** (type: `log`)
   - Position: (35, 1)
   - Message: `[E1-02 AUDIT] content_request {{$trigger.payload.id}} status changed to {{$trigger.payload.status}} by {{$accountability.user}}`
   - Records who changed the status and to what value
   - Key: `log_audit`

**Future Expansion**: This skeleton will be enhanced in E1-06 to:
- Write to dedicated `content_request_revisions` table
- Capture before/after state comparisons
- Include comment text from approval desk
- Track SLA compliance metrics

---

## Script Implementation

### File: `scripts/e1-02_create_flows.ts`

**Size**: ~1000 lines
**Language**: TypeScript (Node.js with tsx runtime)
**Authentication**: Email/password login via `/auth/login`
**Idempotency**: Yes - safe to run multiple times

### Usage

```bash
# Dry-run mode (default) - shows what would be created
npx tsx scripts/e1-02_create_flows.ts

# Execute mode - actually creates/updates flows
npx tsx scripts/e1-02_create_flows.ts --execute
```

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DIRECTUS_URL` | Yes | Base URL of Directus TEST instance | `http://127.0.0.1:8080` |
| `DIRECTUS_ADMIN_EMAIL` | Yes | Admin email for authentication | From Secret Manager |
| `DIRECTUS_ADMIN_PASSWORD` | Yes | Admin password | From Secret Manager |
| `AGENT_WEBHOOK_URL` | Recommended | Agent webhook endpoint | `https://agent.run.app/webhook` |

**Setup Example**:

```bash
# Using gcloud to fetch secrets (TEST environment)
export DIRECTUS_URL="http://127.0.0.1:8085"
export DIRECTUS_ADMIN_EMAIL=$(gcloud secrets versions access latest --secret="DIRECTUS_ADMIN_EMAIL_test")
export DIRECTUS_ADMIN_PASSWORD=$(gcloud secrets versions access latest --secret="DIRECTUS_ADMIN_PASSWORD_test")
export AGENT_WEBHOOK_URL="https://your-agent-webhook.example.com/webhook"

# Run script
npx tsx scripts/e1-02_create_flows.ts --execute
```

### Script Behavior

1. **Authentication**: Logs in via `/auth/login` to obtain access token
2. **Fetch Existing Flows**: Queries `/flows` to check if flows already exist
3. **Create or Update**:
   - If flow exists: Deletes old operations, updates flow definition, recreates operations
   - If flow doesn't exist: Creates new flow and operations from scratch
4. **Link Operations**: Sets `resolve` and `reject` relationships between operations
5. **Generate Report**: Saves execution report to `reports/` directory

**Idempotency Strategy**: The script uses a "delete and recreate" approach for operations. When updating an existing flow, it:
- Deletes all old operations
- Updates the flow definition (name, description, trigger config)
- Creates fresh operations with current configuration
- Links operations with resolve/reject paths
- Updates flow to point to first operation

This ensures the flow always matches the desired state, even if previous runs failed or were interrupted.

---

## Verification Steps

### 1. Via Directus UI

1. Open Directus Admin UI: `http://127.0.0.1:8080/admin`
2. Navigate to: **Settings → Flows**
3. Verify two flows are present:
   - ✅ **E1: Content Request → Agent Trigger** (purple icon, active)
   - ✅ **E1: Content Request Audit Log** (blue icon, active)
4. Click on Flow A to open flow editor
5. Verify operations chain:
   ```
   Read Trigger → Check Status → Build Payload → POST Webhook → Log Success
                                                   ↓ (on error)
                                                 Log Error
   ```
6. Check operation settings:
   - Webhook URL should be `AGENT_WEBHOOK_URL` value
   - Condition filter: `status = 'new'`
   - Transform output: JSON with idempotency_key

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

# List all flows
curl -s -H "Authorization: Bearer $TOKEN" \
  "$DIRECTUS_URL/flows" | jq '.data[] | {name, status, trigger}'

# Expected output:
# {
#   "name": "E1: Content Request → Agent Trigger",
#   "status": "active",
#   "trigger": "event"
# }
# {
#   "name": "E1: Content Request Audit Log",
#   "status": "active",
#   "trigger": "event"
# }

# Get Flow A details
FLOW_A_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$DIRECTUS_URL/flows" | jq -r '.data[] | select(.name=="E1: Content Request → Agent Trigger") | .id')

# List operations for Flow A
curl -s -H "Authorization: Bearer $TOKEN" \
  "$DIRECTUS_URL/operations?filter[flow][_eq]=$FLOW_A_ID" \
  | jq '.data[] | {name, type, key}'

# Expected output (6 operations):
# { "name": "Read Trigger Data", "type": "trigger", "key": "read_trigger" }
# { "name": "Check Status = New", "type": "condition", "key": "condition_status_new" }
# { "name": "Build Webhook Payload", "type": "transform", "key": "transform_payload" }
# { "name": "POST to Agent Webhook", "type": "request", "key": "webhook_agent" }
# { "name": "Log Success", "type": "log", "key": "log_success" }
# { "name": "Log Error", "type": "log", "key": "log_error" }
```

### 3. Functional Testing

#### Test Flow A: Agent Webhook Trigger

```bash
# Authenticate and get token (see above)

# Create a test content_request with status='new'
curl -X POST "$DIRECTUS_URL/items/content_requests" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test: E1-02 Flow A Verification",
    "requirements": "This is a test content request created to verify Flow A webhook trigger. Expected: POST request sent to AGENT_WEBHOOK_URL with JSON payload containing this content_request data.",
    "status": "new",
    "current_holder": "agent_test"
  }'

# Expected behavior:
# 1. Directus creates content_request in database
# 2. Flow A triggers immediately (items.create event)
# 3. Condition checks: status='new' → passes
# 4. Transform builds JSON payload with idempotency_key
# 5. HTTP POST sent to AGENT_WEBHOOK_URL
# 6. If successful: "Log Success" operation writes to activity log
# 7. If failed: "Log Error" operation writes error to activity log

# Verification:
# - Check agent webhook server logs for incoming POST request
# - Check Directus activity log: Settings → Activity Log
# - Look for entries with message: "[E1-02] Agent webhook triggered..."
# - If webhook fails, look for: "[E1-02] ERROR: Failed to trigger agent..."
```

#### Test Flow B: Audit Logging

```bash
# Get an existing content_request ID (replace with actual ID)
CONTENT_REQUEST_ID="<uuid-from-previous-test>"

# Update the status to trigger Flow B
curl -X PATCH "$DIRECTUS_URL/items/content_requests/$CONTENT_REQUEST_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "drafting"}'

# Expected behavior:
# 1. Directus updates content_request
# 2. Flow B triggers (items.update event)
# 3. Condition checks: status field exists → passes
# 4. Log operation writes audit entry with user ID

# Verification:
# - Check Directus activity log
# - Look for entries with message: "[E1-02 AUDIT] content_request <uuid> status changed to drafting by <user_id>"
```

#### Test Error Handling

```bash
# Set invalid webhook URL to test error path
export AGENT_WEBHOOK_URL="http://invalid-url-that-does-not-exist.local:9999/webhook"

# Re-run script to update Flow A with invalid URL
npx tsx scripts/e1-02_create_flows.ts --execute

# Create content_request with status='new'
curl -X POST "$DIRECTUS_URL/items/content_requests" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test: Error Handling",
    "requirements": "Testing Flow A error path with invalid webhook URL",
    "status": "new",
    "current_holder": "agent_test"
  }'

# Expected behavior:
# 1. Flow A triggers
# 2. Webhook POST fails (network error or timeout)
# 3. Flow follows 'reject' path to "Log Error" operation
# 4. Error logged with details: connection refused, timeout, etc.
# 5. IMPORTANT: content_request creation succeeds despite webhook failure

# Verification:
# - Check activity log for error message: "[E1-02] ERROR: Failed to trigger agent..."
# - Verify content_request was created successfully (flows don't block writes)
# - Restore correct AGENT_WEBHOOK_URL after test
```

---

## Configuration

### Webhook Endpoint Requirements

The agent webhook endpoint (`AGENT_WEBHOOK_URL`) must meet these requirements:

**HTTP Specifications**:
- Accept HTTP POST requests
- Accept `Content-Type: application/json`
- Read request body as JSON
- Return HTTP 2xx status code on success (200, 201, 202 recommended)
- Return HTTP 4xx/5xx on validation errors

**Headers Received**:
- `Content-Type: application/json`
- `X-Directus-Event: content_request.status.new`

**Timeout Handling**:
- Respond within 30 seconds (Directus default timeout)
- Use async processing pattern: return 202 Accepted immediately, process in background
- Do NOT perform long-running operations synchronously

**Idempotency**:
- Check `idempotency_key` to detect duplicate webhook calls
- Store processed keys in cache/database
- If duplicate detected, return 200 OK without reprocessing

**Error Handling**:
- Validate payload schema
- Return 4xx for invalid requests (malformed JSON, missing required fields)
- Return 5xx for server errors
- Directus will follow reject path and log error, but won't retry automatically

**Example Express.js Implementation**:

```javascript
app.post('/webhook', async (req, res) => {
  try {
    // 1. Validate payload
    const { content_request_id, idempotency_key, event_type } = req.body;
    if (!content_request_id || !idempotency_key) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 2. Check idempotency
    if (await isProcessed(idempotency_key)) {
      console.log(`Duplicate webhook: ${idempotency_key}`);
      return res.status(200).json({ status: 'already_processed' });
    }

    // 3. Return immediately, process async
    res.status(202).json({ status: 'accepted', idempotency_key });

    // 4. Process in background (don't await)
    processContentRequestAsync(req.body).catch(err => {
      console.error('Background processing failed:', err);
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## Troubleshooting

### Issue: Flow not triggering

**Symptoms**:
- Create/update content_request but Flow A doesn't execute
- No webhook call received
- No entries in activity log

**Diagnosis**:
1. Check flow status in Directus UI (Settings → Flows)
   - Must be "active", not "inactive"
2. Verify trigger configuration:
   - Type: `event`
   - Scope: includes `items.create` and `items.update`
   - Collections: includes `content_requests`
3. Check Directus logs for flow execution errors:
   ```bash
   docker logs directus-container 2>&1 | grep -i "flow"
   ```

**Solutions**:
- If flow is inactive: Re-run script with `--execute`
- If trigger config is wrong: Re-run script to recreate flow
- If operations are missing: Check Directus UI operations panel, re-run script

### Issue: Webhook receives empty or malformed payload

**Symptoms**:
- Webhook is called but payload is missing fields
- JSON parsing fails
- Required fields are `null` or `undefined`

**Diagnosis**:
1. Check "Build Webhook Payload" operation in Flow A
2. Verify transform operation output in flow execution logs
3. Test with curl to see actual payload sent:
   ```bash
   # Set up a test endpoint that logs requests
   nc -l 8888 &
   export AGENT_WEBHOOK_URL="http://localhost:8888/webhook"
   # Trigger flow, observe raw HTTP request
   ```

**Solutions**:
- Verify content_requests has all expected fields (title, status, requirements, etc.)
- Check if field names changed in schema
- Re-run migration script `e1-01_migration_content_requests.ts` if fields are missing
- Verify transform operation JSON template matches schema

### Issue: Webhook fails with timeout

**Symptoms**:
- Error log: "Failed to trigger agent webhook... timeout"
- Webhook endpoint receives request but Directus logs show failure
- Flow takes 30+ seconds to complete

**Root Cause**: Webhook endpoint is processing synchronously and takes too long to respond.

**Solution**:
- Implement async processing pattern (return 202 immediately, process in background)
- Move long-running operations (AI calls, DB writes, external API calls) to background job queue
- Ensure webhook responds within 10-15 seconds maximum
- Add timeout monitoring on agent side

**Example Fix**:
```javascript
// Before (BAD - synchronous processing):
app.post('/webhook', async (req, res) => {
  const result = await callAI(req.body);      // 60 seconds
  await saveToDB(result);                      // 10 seconds
  res.json({ status: 'success' });             // Too late! Directus timed out
});

// After (GOOD - async processing):
app.post('/webhook', async (req, res) => {
  const jobId = await enqueueJob(req.body);    // 50ms
  res.status(202).json({ job_id: jobId });     // Immediate response
  // Job processor handles AI call and DB write in background
});
```

### Issue: Operations not linked correctly

**Symptoms**:
- Flow stops after first operation
- Condition passes but next operation doesn't execute
- Error path not working (errors not logged)

**Diagnosis**:
1. Open flow in Directus UI
2. Check visual flow diagram for missing arrows
3. Click on each operation and verify "Resolve" and "Reject" fields:
   - Read Trigger → resolve: Check Status
   - Check Status → resolve: Build Payload
   - Build Payload → resolve: POST Webhook
   - POST Webhook → resolve: Log Success, reject: Log Error

**Solution**:
- Re-run script with `--execute` flag
- Script will delete old operations and recreate with correct links
- Verify in UI that arrows connect operations properly

### Issue: Duplicate webhook calls

**Symptoms**:
- Agent receives multiple webhook calls for same content_request
- Same `idempotency_key` appears multiple times
- Content_request shows only one update but webhook called 2+ times

**Root Cause**: Directus may trigger flow multiple times if:
- Flow configured with both `items.create` and `items.update`
- Content_request updated immediately after creation
- Manual retry in Directus UI

**Solution**:
- Implement idempotency check on agent webhook endpoint
- Use `idempotency_key` to detect and skip duplicates
- Store processed keys in Redis or database for 24-48 hours
- Return 200 OK for duplicates without reprocessing

### Issue: Flow B not logging audit entries

**Symptoms**:
- Update content_request status but no audit log appears
- Flow B shows as inactive or not triggering

**Diagnosis**:
1. Check Flow B status in Directus UI
2. Verify trigger scope includes `items.update`
3. Check condition: "Check Status Changed" filter
4. Test by updating status via API (not just UI)

**Solution**:
- Ensure Flow B is active
- Verify condition filter: `$trigger.payload.status._nnull`
- Re-run script to recreate Flow B
- Check activity log for execution errors

---

## Next Steps

After successfully creating and verifying E1-02 flows:

### Immediate Next Steps
1. **Test in TEST environment**:
   - Create sample content_requests with various status transitions
   - Verify webhook calls reach agent endpoint
   - Confirm audit logs appear in activity log
   - Test error handling with invalid webhook URL

2. **Document in E1 tracker**:
   - Mark E1-02 as ✅ DONE in `docs/Web_List_to_do_01.md`
   - Update E1 Phase progress

### E1-03: Dashboard Configuration (Next Task)
- Configure Directus Insights dashboard
- Add panels for:
  - Content requests by status (pie chart)
  - SLA compliance metrics (gauge)
  - Recent activity timeline
  - Agent workload distribution
- Set up auto-refresh intervals

### E1-04: Nuxt Approval Desk UI
- Build frontend UI for editors to review content
- Display content_requests in table/kanban view
- Add filter/sort by status, current_holder, created_at
- Implement approve/reject actions
- Show linked knowledge_document preview

### E1-05: Folder/Tree Display
- Implement folder browser component in Nuxt
- Show knowledge_documents in tree structure
- Use parent_document_id relation from E1-01
- Add drag-and-drop for reorganization
- Breadcrumb navigation

### E1-06: Agent Data V12 Integration (E2E)
- Connect real agent service to webhook endpoint
- Implement Agent Data v12 protocol
- Test full closed-loop pipeline:
  - Editor creates content_request → Flow A triggers → Agent drafts → Flow B logs
- Monitor SLA metrics
- Validate MCP v5.0 envelope format

---

## References

### Documentation
- [E1 Plan](../docs/E1_Plan.md) - Blog E1.C (Trigger & Async)
- [Web_List_to_do_01.md](../docs/Web_List_to_do_01.md) - Task E1-02-FLOWS-BASIC
- [E1-01 Schema Growth Report](./E1-01_schema_growth_execution.md) - Related schema changes

### Directus Documentation
- [Flows Overview](https://docs.directus.io/app/flows.html)
- [Flow Operations](https://docs.directus.io/configuration/flows/operations.html)
- [Event Trigger](https://docs.directus.io/configuration/flows/triggers.html#event-trigger)
- [Webhook Operation](https://docs.directus.io/configuration/flows/operations.html#webhook-request)

### Related Code
- **Script**: `/scripts/e1-02_create_flows.ts` - Flow creation logic
- **Schema**: Task E1-01 created `content_requests` collection
- **Types**: Flow and Operation interfaces (lines 47-76 in script)

---

## Appendix: Flow JSON Export

For reference, the complete flow definitions can be exported via API:

```bash
# Export Flow A
curl -s -H "Authorization: Bearer $TOKEN" \
  "$DIRECTUS_URL/flows/$FLOW_A_ID" \
  | jq '.' > flow_a_export.json

# Export operations
curl -s -H "Authorization: Bearer $TOKEN" \
  "$DIRECTUS_URL/operations?filter[flow][_eq]=$FLOW_A_ID" \
  | jq '.' > flow_a_operations_export.json
```

These JSON files can be used to:
- Migrate flows between environments
- Version control flow configuration
- Restore flows if accidentally deleted
- Compare flow changes over time

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
