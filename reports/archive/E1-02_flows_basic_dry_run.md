# Task E1-02: Flows Creation Report

**Timestamp**: 2025-12-10T20:44:46.207Z
**Mode**: DRY-RUN

---

## Summary

- **Flows Created**: 0
- **Flows Updated**: 0
- **Operations Created**: 0
- **Errors**: 0

---

## Flows Created/Updated

### Flow A: Content Request → Agent Webhook

**Key**: `e1_content_request_to_agent`
**Trigger**: When `content_requests` item is created or updated with `status = 'new'`
**Purpose**: Sends HTTP POST to agent webhook to initiate drafting process

**Operations Chain**:
1. **Read Trigger Data** - Captures the trigger event payload
2. **Check Status = New** - Condition: only proceed if status is 'new'
3. **Build Webhook Payload** - Transforms data into standard envelope format
4. **POST to Agent Webhook** - Sends HTTP request to `AGENT_WEBHOOK_URL`
5. **Log Success** - Logs successful webhook call
6. **Log Error** - Logs failed webhook call (reject path)

**Webhook Payload Structure**:
```json
{
  "content_request_id": "uuid",
  "title": "string",
  "status": "new",
  "current_holder": "string",
  "requirements": "text",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "idempotency_key": "id_timestamp",
  "correlation_id": "content_request_new",
  "event_type": "content_request.status.new",
  "timestamp": "now"
}
```

### Flow B: Content Request Audit Log (Skeleton)

**Key**: `e1_content_request_audit`
**Trigger**: When `content_requests` item is updated
**Purpose**: Logs workflow transitions for audit trail

**Operations Chain**:
1. **Read Trigger Data** - Captures the trigger event
2. **Check Status Changed** - Condition: only if status field changed
3. **Log Audit Entry** - Writes to Directus activity log

---

## Verification Steps

### 1. Via Directus UI

1. Open Directus Admin UI
2. Navigate to: **Settings → Flows**
3. Verify two flows exist:
   - ✅ "E1: Content Request → Agent Trigger" (active, purple)
   - ✅ "E1: Content Request Audit Log" (active, blue)
4. Click each flow to view operations chain

### 2. Via API

```bash
# Authenticate
TOKEN=$(curl -s -X POST "$DIRECTUS_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'$DIRECTUS_ADMIN_EMAIL'","password":"'$DIRECTUS_ADMIN_PASSWORD'"}' \
  | jq -r '.data.access_token')

# List flows
curl -s -H "Authorization: Bearer $TOKEN" \
  "$DIRECTUS_URL/flows" | jq '.data[] | {name, status, trigger}'

# List operations for a flow (replace FLOW_ID)
curl -s -H "Authorization: Bearer $TOKEN" \
  "$DIRECTUS_URL/operations?filter[flow][_eq]=FLOW_ID" \
  | jq '.data[] | {name, type, key}'
```

### 3. Functional Testing

**Test Flow A (Agent Webhook)**:

```bash
# Create a test content_request with status='new'
curl -X POST "$DIRECTUS_URL/items/content_requests" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Content Request",
    "requirements": "Test requirements for E1-02 flow verification",
    "status": "new",
    "current_holder": "agent_test"
  }'

# Expected: Flow A triggers and sends POST to AGENT_WEBHOOK_URL
# Check agent webhook logs for incoming request
# Check Directus activity log for flow execution
```

**Test Flow B (Audit Log)**:

```bash
# Update content_request status
curl -X PATCH "$DIRECTUS_URL/items/content_requests/REQUEST_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "drafting"}'

# Expected: Flow B triggers and creates audit log entry
# Check Directus activity log for audit entry
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DIRECTUS_URL` | Yes | Base URL of Directus instance |
| `DIRECTUS_ADMIN_EMAIL` | Yes | Admin email for authentication |
| `DIRECTUS_ADMIN_PASSWORD` | Yes | Admin password |
| `AGENT_WEBHOOK_URL` | Recommended | Webhook URL for agent notifications |

**Example**:
```bash
export DIRECTUS_URL="http://127.0.0.1:8080"
export AGENT_WEBHOOK_URL="https://your-agent.run.app/webhook"
```

### Webhook Endpoint Requirements

The agent webhook endpoint must:
- Accept HTTP POST requests
- Accept `Content-Type: application/json`
- Return 2xx status on success
- Handle idempotency via `idempotency_key`
- Process payload asynchronously (avoid timeout)

---

## Troubleshooting

### Issue: Flow not triggering

**Check**:
1. Flow status is "active" in Directus UI
2. Collection trigger matches: `content_requests`
3. Event type includes `items.create` and `items.update`
4. Test by creating/updating a content_request

### Issue: Webhook fails with timeout

**Solution**:
- Webhook endpoint must respond quickly (< 30s)
- Use async processing on agent side
- Return 202 Accepted immediately
- Process request in background

### Issue: Operations not linked correctly

**Solution**:
- Re-run script with `--execute`
- Script will delete old operations and recreate
- Verify links in Directus UI (flow diagram)

---

## Next Steps

After flows are created and verified:

1. **E1-03**: Configure Dashboards for SLA tracking
2. **E1-04**: Build Nuxt Approval Desk UI
3. **E1-05**: Implement Folder/Tree display
4. **E1-06**: Connect Agent Data V12 for E2E testing

---

## References

- [E1 Plan](../docs/E1_Plan.md) - Blog E1.C (Trigger & Async)
- [Web_List_to_do_01.md](../docs/Web_List_to_do_01.md) - E1-02-FLOWS-BASIC
- [Directus Flows Docs](https://docs.directus.io/app/flows.html)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
