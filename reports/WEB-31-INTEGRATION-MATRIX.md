# WEB-31 External Integration Matrix

**Generated:** 2026-01-30
**Purpose:** Audit khả năng tích hợp external systems với Business OS

---

## Integration Capability Matrix

| System | Integration Method | Directus Native? | Cần Code? | Priority | Notes |
|--------|-------------------|------------------|-----------|----------|-------|
| **Larkbase** | Webhook/REST API | Partial | TBD | E2+ | Cần test Directus Flow → Lark webhook |
| **Kestra** | Webhook trigger | Yes | No | E2+ | Directus Flow có thể trigger Kestra workflow |
| **Chatwoot** | Embed/Webhook | Yes | No | E2+ | Widget embed + webhook for events |
| **Email (SMTP)** | Directus Flow | Yes | No | E1+ | Directus có built-in email operation |
| **YouTube embed** | iFrame | Yes | No | E1+ | Standard HTML embed |
| **Google Forms** | iFrame/Embed | Yes | No | E1+ | Standard embed code |
| **Facebook embed** | iFrame | Yes | No | E1+ | Standard social embed |
| **Slack** | Webhook | Yes | No | E2+ | Directus Flow → Slack webhook |
| **Discord** | Webhook | Yes | No | E2+ | Directus Flow → Discord webhook |
| **GPT Actions** | OpenAPI import | Yes | No | E1 | Ready via agent_data_openapi.yaml |
| **Gemini Extensions** | OpenAPI import | Yes | No | E1 | Ready via agent_data_openapi.yaml |

---

## Directus Flow Capabilities (Native)

### Available Operations

| Operation | Type | Use Case |
|-----------|------|----------|
| `webhook` | Trigger | Receive external webhooks |
| `request` | Action | Make HTTP requests to external APIs |
| `mail` | Action | Send emails via SMTP |
| `log` | Action | Write to Directus activity log |
| `item-create` | Action | Create records |
| `item-update` | Action | Update records |
| `condition` | Logic | Conditional branching |
| `transform` | Data | Transform payload |

### Existing Flows (7 Active)

| Flow Name | Trigger | Purpose |
|-----------|---------|---------|
| E1: Content Request Audit Log | event | Log content access |
| E1: Content Request → Agent Trigger | event | Trigger agent on content request |
| [DOT] Agent Data Health Check | webhook | External health monitoring |
| [DOT] Agent Data Chat Test | webhook | Chat integration test |
| [TEST] Agent Data Health Check | manual | Manual testing |
| [TEST] Agent Data Chat | manual | Manual testing |
| Review Notification | event | Notify on review status change |

### Pending Flows

| Flow Name | Spec File | Status |
|-----------|-----------|--------|
| Feedback Notification | `dot/specs/feedback_notification_flow.v2.json` | NOT DEPLOYED |

---

## Integration Categories

### Category A: Ready Now (No Code)

These integrations work with current infrastructure:

1. **GPT Actions** - Import OpenAPI, configure Bearer token
2. **Gemini Extensions** - Import OpenAPI, configure Bearer token
3. **YouTube/Facebook/Google Forms** - Standard HTML embed in Directus content
4. **Email notifications** - Directus Flow with mail operation

### Category B: Ready with Configuration (No Code)

These need webhook URL configuration only:

1. **Slack** - Add Slack webhook URL to Directus Flow
2. **Discord** - Add Discord webhook URL to Directus Flow
3. **Kestra** - Add Kestra webhook URL to Directus Flow
4. **Generic webhooks** - Directus Flow request operation

### Category C: Requires Investigation (May Need Code)

| System | Investigation Needed | Effort |
|--------|---------------------|--------|
| Larkbase | API authentication method, rate limits | M |
| Chatwoot | Widget integration pattern | S |
| Custom CRM | API spec review | L |

---

## Gaps Requiring Code (Exception Ticket Candidates)

```yaml
gaps:
  - name: "Agent Data Vector Search Proxy"
    reason: "Current Nuxt proxy returns 503 when Agent Data IAM protected"
    effort: "S"
    recommendation: "Investigate Nuxt proxy error handling, may need service account configuration"

  - name: "Larkbase Bidirectional Sync"
    reason: "Larkbase API requires OAuth2 flow, Directus native webhook insufficient"
    effort: "M"
    recommendation: "Defer to E2, evaluate if simple webhook sufficient for MVP"

  - name: "Real-time Agent Data Updates"
    reason: "Current architecture is request-response, no WebSocket support"
    effort: "L"
    recommendation: "Defer to E2+, not required for E1"
```

---

## Recommendations

### For E1 (Current Phase)

1. Complete GPT/Gemini integration using existing manifest
2. Enable email notifications via Directus Flow
3. Deploy feedback_notification_flow.v2.json when webhook URL ready

### For E2 (Next Phase)

1. Configure Slack/Discord webhooks for team notifications
2. Investigate Larkbase integration requirements
3. Set up Kestra workflows for batch operations

### For E2+ (Future)

1. Evaluate real-time requirements
2. Consider custom integrations if Directus native insufficient
3. Request Exception Tickets for code-required features
