# P6: Integration Audit — Nuxt + Agency OS + Directus + Agent Data

**Date**: 2026-02-14
**Commit**: `5c33b28` (main)
**VPS**: 38.242.240.89 — all 6 containers healthy

---

## 1. Connection Status Summary

| Connection | Status | Details |
|------------|--------|---------|
| Nuxt ↔ Directus | **WORKING** | VPS internal `http://directus:8055` (SSR) + public `directus.incomexsaigoncorp.vn` (client) |
| Nuxt ↔ Agent Data | **WORKING** | VPS internal `http://agent-data:8000` + public `/api` via nginx |
| Directus ↔ Agent Data | **PARTIAL** | Sync flows DISABLED (prevent circular sync). Health/Chat webhook flows active. |
| Agency OS → Nuxt | **PARTIAL** | Core pages + portal layer active. 36 OS collections missing from Directus schema. |
| Firebase → VPS | **WORKING** | `ai.incomexsaigoncorp.vn` → Cloud Run nginx → VPS. HTTP 200 (3.3s). |

---

## 2. VPS Docker Stack (all healthy)

| Container | Status | Uptime | Port |
|-----------|--------|--------|------|
| incomex-nginx | Up | 21h | 80, 443 |
| incomex-nuxt | Up (healthy) | 11h | 8080 |
| incomex-directus | Up (healthy) | 16h | 8055 |
| incomex-agent-data | Up (healthy) | 39h | 8080 |
| incomex-mysql | Up (healthy) | 39h | 3306 |
| incomex-qdrant | Up (healthy) | 39h | 6333 |

### Nuxt Runtime Env (inside container)
```
NUXT_DIRECTUS_INTERNAL_URL=http://directus:8055
NUXT_DIRECTUS_URL=http://directus:8055
NUXT_PUBLIC_DIRECTUS_URL=https://directus.incomexsaigoncorp.vn
NUXT_PUBLIC_AGENT_DATA_BASE_URL=http://agent-data:8000
NUXT_PUBLIC_SITE_URL=https://vps.incomexsaigoncorp.vn
NUXT_AGENT_DATA_API_KEY=C38FE9FA-...
```

---

## 3. Nuxt ↔ Agency OS

### Origin
Project is forked from **AgencyOS** (Directus + NuxtLabs). README confirms: "AgencyOS is everything you need to get your agency off the ground."

### Architecture
- **Core**: `web/` directory = Agency OS base (pages, components, types)
- **Layers**: `web/layers/portal/` (client portal), `web/layers/proposals/` (proposals)
- **Custom additions**: knowledge/, approval-desk/, admin/, AI/agent-data integrations

### Pages (28 total)

| Page | Origin | Status |
|------|--------|--------|
| `[...permalink].vue` | Agency OS | WORKING — CMS page builder |
| `posts/index.vue`, `posts/[slug].vue` | Agency OS | WORKING — 2 posts in Directus |
| `posts/categories/[category].vue` | Agency OS | AVAILABLE — 0 categories |
| `projects.vue` | Agency OS | WORKING — HTTP 200 |
| `login.vue`, `register.vue`, `logout.vue` | Agency OS | WORKING — auth pages |
| `forgot-password.vue` | Agency OS | WORKING |
| `profile.vue` | Agency OS | WORKING |
| `auth/signin.vue`, `auth/logout.vue` | Agency OS | WORKING |
| `portal/**` (14 pages) | Agency OS layer | PARTIAL — UI exists, 0 projects/tasks/invoices |
| `proposals/[id].vue` | Agency OS layer | AVAILABLE — 0 proposals |
| `blueprints/index.vue`, `blueprints/[id].vue` | Agency OS | AVAILABLE |
| `help/**` (3 pages) | Agency OS | AVAILABLE — needs help_collections/help_articles |
| `docs/**` | Custom | WORKING |
| `knowledge/**` | Custom | WORKING — 72 knowledge docs |
| `knowledge-tree/` | Custom | WORKING |
| `approval-desk/**` | Custom | WORKING — 2 content requests |
| `admin/**` (3 pages) | Custom | WORKING |

### Components

| Category | Count | Origin |
|----------|-------|--------|
| Block components (blocks/) | 14 types | Agency OS page builder |
| Navigation (navigation/) | Footer, Header, etc. | Agency OS |
| AI components (ai/) | Chat, search | Custom |
| Knowledge components | Tree, Diff, Taxonomy | Custom |
| Base components (base/) | Layout primitives | Agency OS |
| Portal components (layers/portal/) | 15 components | Agency OS |
| Proposals components (layers/proposals/) | 3 components | Agency OS |

---

## 4. Agency OS Features — Full Inventory

### A. ENABLED (working with data)

| Feature | Directus Collection | Records | Notes |
|---------|-------------------|---------|-------|
| CMS Pages | `pages` | 3 | Home, Privacy, Terms. Page builder with 14 block types. |
| Blog/Posts | `posts` | 2 | Working. Categories empty. |
| Navigation | `navigation` + `navigation_items` | 2 + 6 | Header + footer menus. |
| Globals/Branding | `globals` | 1 | Company name, logo, description configured. |
| Authentication | Directus auth | 9 users | signin/logout/register pages working. 9 roles defined. |
| User Profile | `directus_users` | 9 | Profile page working. |
| Multi-language | `languages` | 8 | 8 languages defined in Directus. i18n module loaded. |
| Color Mode | nuxt module | - | Dark/light toggle working. |
| SEO | `@nuxtjs/seo` | - | Module loaded, OG image configured. |

### B. ENABLED (custom — not Agency OS)

| Feature | Collection/API | Records | Notes |
|---------|---------------|---------|-------|
| Knowledge Base | `knowledge_documents` | 72 | Full CRUD + vector search via Agent Data. |
| AI Discussions | `ai_discussions` + comments | 7 + 17 | AI-powered content discussions. |
| Content Requests | `content_requests` | 2 | Approval workflow with review gate. |
| Doc Reviews | `doc_reviews` | 3 | Review/approval pipeline. |
| Agent Views | `agent_views` | 26 | AI agent interaction logs. |
| Feedback | `feedbacks` | 9 | User feedback collection. |
| Agent Data API | REST + MCP | 88 docs, 280 vectors | Health, search, chat, KB endpoints all working. |

### C. AVAILABLE (UI exists, needs Directus collections)

| Feature | Missing Collections | Effort |
|---------|-------------------|--------|
| **Help Center** | `help_collections`, `help_articles`, `help_feedback` | CONFIG — create 3 collections in Directus |
| **Projects** | Page exists but `os_projects` has 0 records | CONFIG — add data |
| **Tasks** | `os_tasks` exists (0 records) | CONFIG — add data |
| **Invoices** | `os_invoices` exists (0 records) | CONFIG — add data |
| **Proposals** | Needs: `os_proposals`, `os_proposal_blocks`, `os_proposal_contacts`, `os_proposal_approvals` | SCHEMA + CONFIG — create 4 collections |
| **Page Builder Blocks** | 14 block types exist (hero, CTA, FAQ, gallery, etc.) | CONFIG — add blocks to pages via Directus UI |
| **Team Page** | `team` collection exists (0 records) | CONFIG — add team members |
| **Testimonials** | `testimonials` collection exists (0 records) | CONFIG — add testimonials |
| **Categories** | `categories` exists (0 records) | CONFIG — add blog categories |

### D. NOT CONNECTED (needs Directus schema + possible code)

| Feature | Missing Collections | Effort |
|---------|-------------------|--------|
| **CRM/Contacts** | `contacts` exists but `organizations`, `organization_addresses` missing | SCHEMA — create 2 collections |
| **Deals Pipeline** | `os_deals`, `os_deal_stages`, `os_deal_contacts` | SCHEMA — create 3 collections |
| **Expense Tracking** | `os_expenses`, `os_items`, `os_tax_rates` | SCHEMA — create 3 collections |
| **Payment Management** | `os_payments`, `os_payment_terms` | SCHEMA — create 2 collections |
| **Email Templates** | `os_email_templates` | SCHEMA — create 1 collection |
| **Activities/CRM Log** | `os_activities`, `os_activity_contacts` | SCHEMA — create 2 collections |
| **Project Templates** | `os_project_templates`, `os_project_files`, `os_project_contacts` | SCHEMA — create 3 collections |
| **Subscriptions** | `os_subscriptions` | SCHEMA — create 1 collection |
| **Stripe Billing** | `useStripe.ts` composable exists | CODE — needs Stripe keys + webhook setup |
| **Chat Config** | `chat_config` | SCHEMA — create 1 collection |
| **Metrics/Events** | `metrics`, `events` | SCHEMA — create 2 collections |
| **Settings (OS)** | `os_settings`, `projects_settings`, `page_settings` | SCHEMA — create 3 collections |
| **Inbox/Conversations** | `inbox`, `conversations`, `messages` | SCHEMA — create 3 collections |

---

## 5. Directus Collections — Full List (45 non-system)

### In Directus AND in code schema (present)
```
agent_views              block_cta               block_form
block_gallery            block_hero              block_html
block_logocloud          block_quote             block_richtext
block_steps              block_team              block_testimonials
block_video              categories              contacts
content_requests         forms                   globals
knowledge_documents      navigation              os_invoices
os_projects              os_tasks                pages
pages_blocks             pages_blog              pages_projects
posts                    redirects               seo
team                     testimonials
```

### In Directus but NOT in code schema (11 extra)
```
ai_discussion_comments   ai_discussions          block_button_groups
block_buttons            block_divider           doc_reviews
feedbacks                languages               navigation_items
navigation_navigation_items                      pages_translations
```

### In code schema but MISSING from Directus (36 missing)
```
chat_config              conversations           events
help_articles            help_collections        help_feedback
inbox                    messages                metrics
organization_addresses   organizations           organizations_contacts
os_activities            os_activity_contacts    os_deal_contacts
os_deal_stages           os_deals                os_email_templates
os_expenses              os_invoice_items        os_items
os_payment_terms         os_payments             os_project_contacts
os_project_files         os_project_templates    os_proposal_approvals
os_proposal_blocks       os_proposal_contacts    os_proposals
os_settings              os_subscriptions        os_task_files
os_tax_rates             page_settings           projects_settings
```

---

## 6. Directus Flows (12 total)

| Status | Flow Name | Trigger |
|--------|-----------|---------|
| **active** | E1: Content Request Audit Log | event |
| **active** | AI Discussion Auto-Approval Timer | event |
| **active** | Review Gate Enforcement | event |
| **inactive** | [DOT] Knowledge Delete from Agent Data | event |
| **active** | Cache Invalidation — Knowledge Update | event |
| **active** | E1: Content Request → Agent Trigger | event |
| **active** | User Supreme Authority Override | event |
| **active** | [DOT] Agent Data Health Check | webhook |
| **active** | [DOT] Agent Data Chat Test | webhook |
| **active** | E1: Auto-Activate Drafter | event |
| **active** | Review Notification | event |
| **inactive** | [DOT] Knowledge Sync to Agent Data | event |

**Note**: 2 sync flows intentionally disabled to prevent circular sync.

---

## 7. Agent Data Health (live)

```json
{
  "status": "healthy",
  "langroid_available": true,
  "services": {
    "qdrant": { "status": "ok", "latency_ms": 213.2 },
    "firestore": { "status": "ok", "latency_ms": 2011.9 },
    "openai": { "status": "ok", "latency_ms": 0.0 }
  },
  "data_integrity": {
    "document_count": 88,
    "vector_point_count": 280,
    "sync_status": "ok"
  }
}
```

---

## 8. External Integrations Scan

| Integration | Status | Evidence |
|-------------|--------|----------|
| **Stripe** | CODE EXISTS, NOT CONFIGURED | `useStripe.ts` composable, `@stripe/stripe-js` + `stripe` in deps. No Stripe keys in env. |
| **Firebase Auth** | CONFIGURED | Firebase config in nuxt.config.ts. Used for hosting + auth. |
| **Sentry** | CODE EXISTS, NOT CONFIGURED | `@sentry/nuxt` in deps. `NUXT_PUBLIC_SENTRY_DSN` empty. |
| **Larkbase** | NOT FOUND | No code references. |
| **Kestra** | NOT FOUND | No code references. |
| **Chatwoot** | NOT FOUND | No code references. |
| **Email (SMTP/SendGrid)** | NOT FOUND | No email service code. Directus has built-in email (not configured). |
| **Directus Extensions** | NONE INSTALLED | 0 extensions via API. |

---

## 9. Live Endpoint Tests

| Endpoint | HTTP | Response Time |
|----------|------|--------------|
| `https://vps.incomexsaigoncorp.vn/` | 200 | 3.6s |
| `https://vps.incomexsaigoncorp.vn/knowledge` | 200 | 2.1s |
| `https://vps.incomexsaigoncorp.vn/posts` | 200 | 2.3s |
| `https://vps.incomexsaigoncorp.vn/portal` | 200 | 1.9s |
| `https://vps.incomexsaigoncorp.vn/projects` | 200 | 2.0s |
| `https://ai.incomexsaigoncorp.vn/` | 200 | 3.3s |
| `https://directus.incomexsaigoncorp.vn/items/posts?limit=1` | 200 | — |
| `https://vps.incomexsaigoncorp.vn/api/health` | 200 | — |

---

## 10. Recommendations — Priority Order

### Tier 1: CONFIG ONLY (no code changes)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | **Add team members** to `team` collection | 5 min | Team page shows real people |
| 2 | **Add blog categories** to `categories` | 5 min | Blog filtering works |
| 3 | **Add testimonials** to `testimonials` | 5 min | Testimonial blocks functional |
| 4 | **Add page blocks** to Home/Privacy/Terms pages | 15 min | Rich landing pages via page builder |
| 5 | **Configure Sentry DSN** env var | 5 min | Error tracking enabled |

### Tier 2: DIRECTUS SCHEMA (create collections, no code)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 6 | Create `help_collections` + `help_articles` + `help_feedback` | 30 min | Help center functional (pages already exist) |
| 7 | Create `os_settings`, `projects_settings`, `page_settings` | 20 min | Agency OS settings panels work |
| 8 | Create `os_invoice_items` | 10 min | Invoice line items for existing `os_invoices` |

### Tier 3: SCHEMA + SOME CONFIG

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 9 | Create proposals collections (4 tables) | 1 hr | Proposals feature fully functional |
| 10 | Create CRM collections (organizations, deals — 8 tables) | 2 hr | Full CRM pipeline |
| 11 | Create inbox/conversations/messages (3 tables) | 1 hr | Client messaging |

### Tier 4: NEEDS CODE + CONFIG

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 12 | Configure Stripe keys + webhook | 2 hr | Online payments/billing |
| 13 | Set up email service (SMTP/SendGrid) in Directus | 1 hr | Notifications, password reset emails |
| 14 | Install Directus extensions (optional) | Varies | Custom fields, interfaces |

### nuxt.config.ts hardcoded fallback URLs

**Note**: `nuxt.config.ts` lines 70, 78, 80, 85, 110, 139 still have hardcoded Cloud Run fallback URLs (`directus-test-pfne2mqwja-as.a.run.app`). These are only used if env vars are not set — on VPS they're overridden by container env vars. Consider cleaning up for consistency (low priority, no functional impact).

---

## 11. Summary

| Metric | Value |
|--------|-------|
| Total Agency OS features | ~25 modules |
| Currently ENABLED | 9 core + 7 custom = 16 |
| AVAILABLE (config-only) | 5 |
| Needs SCHEMA creation | 36 missing collections |
| Needs CODE | 2 (Stripe, Email) |
| Directus collections (non-system) | 45 present / 70 expected |
| Directus flows | 12 (10 active, 2 disabled) |
| Directus extensions | 0 |
| Users | 9 (across 9 roles) |
| Agent Data documents | 88 docs, 280 vectors |
