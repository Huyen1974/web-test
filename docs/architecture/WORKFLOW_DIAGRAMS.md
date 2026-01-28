# WORKFLOW DIAGRAMS
## 4 Luồng Chính + 3 Quy Trình Nghiệp Vụ

---

## TỔNG QUAN: 4 LUỒNG CHÍNH

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BUSINESS OS - DATA FLOW OVERVIEW                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│     [Human Request]        [Agent Task]         [System Event]              │
│           │                     │                     │                      │
│           ▼                     ▼                     ▼                      │
│     ┌─────────────────────────────────────────────────────────────┐         │
│     │                    TASK FLOW (Luồng 2)                       │         │
│     │                    SSOT: Agent Data                          │         │
│     └─────────────────────────────────────────────────────────────┘         │
│                              │                                               │
│           ┌──────────────────┼──────────────────┐                           │
│           ▼                  ▼                  ▼                           │
│     ┌───────────┐     ┌───────────┐     ┌───────────┐                       │
│     │  CONTENT  │     │  FEEDBACK │     │  CONTEXT  │                       │
│     │  FLOW (1) │     │  FLOW (3) │     │  FLOW (4) │                       │
│     │           │     │           │     │           │                       │
│     │ GitHub PR │     │ Mixed     │     │ API Resp  │                       │
│     │ → Nuxt    │     │ Storage   │     │ → AI      │                       │
│     └───────────┘     └───────────┘     └───────────┘                       │
│           │                  │                  │                           │
│           └──────────────────┼──────────────────┘                           │
│                              ▼                                               │
│     ┌─────────────────────────────────────────────────────────────┐         │
│     │                        NUXT UI                               │         │
│     │                  (Display Layer)                             │         │
│     └─────────────────────────────────────────────────────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## LUỒNG 1: CONTENT FLOW (Vòng đời Tài liệu)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTENT FLOW (Document Lifecycle)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐                                                               │
│  │  IDEA    │ ◄─── Human request / Schedule / Event trigger                │
│  │          │                                                               │
│  └────┬─────┘                                                               │
│       │ Task Router phân công                                               │
│       ▼                                                                      │
│  ┌──────────┐                                                               │
│  │ DRAFTING │ ◄─── Agent tạo branch + soạn nội dung                        │
│  │          │      Branch: docs/<action>-<topic>                           │
│  │  (PR)    │      Location: GitHub                                         │
│  └────┬─────┘                                                               │
│       │ Submit PR                                                            │
│       ▼                                                                      │
│  ┌──────────┐     ┌─────────────────────────────────────┐                   │
│  │ REVIEWING│ ◄───│ Parallel Review:                    │                   │
│  │          │     │ • QualityReviewer Agent (format)    │                   │
│  │  (PR)    │     │ • DomainExpert Agent (accuracy)     │                   │
│  │  (PR)    │     │ • Human (final approval)            │                   │
│  └────┬─────┘     │           └─────────────────────────────────────┘                   │
│       │           └─────────────────────────────────────┘                   │
│       │                                                                      │
│   ┌───┴───┐                                                                 │
│   │       │                                                                 │
│   ▼       ▼                                                                 │
│ ┌────┐  ┌────────┐                                                          │
│ │PASS│  │REVISION│                                                          │
│ └──┬─┘  └───┬────┘                                                          │
│    │        │ Re-submit                                                      │
│    │        └──────────────────────┐                                        │
│    ▼                               │                                        │
│  ┌──────────┐                      │                                        │
│  │ APPROVED │ ◄────────────────────┘                                        │
│  └────┬─────┘                                                               │
│       │ Auto-merge                                                           │
│       ▼                                                                      │
│  ┌──────────┐                                                               │
│  │ MERGED   │ ◄─── PR merged to main                                        │
│  │          │      Event: docs.pr.merged                                    │
│  └────┬─────┘                                                               │
│       │ Sync trigger                                                         │
│       ▼                                                                      │
│  ┌──────────┐                                                               │
│  │  LIVE    │ ◄─── Indexed in Agent Data                                    │
│  │          │      Visible on Nuxt                                          │
│  └──────────┘                                                               │
│                                                                              │
│  SSOT: GitHub (main branch)                                                 │
│  Draft: GitHub PR                                                           │
│  Display: Nuxt                                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## LUỒNG 2: TASK FLOW (Điều phối Công việc)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TASK FLOW (Work Orchestration)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Input Sources]                                                            │
│       │                                                                      │
│       │  Human Request ───────────┐                                         │
│       │  Scheduled Job ───────────┼──► ┌────────────────┐                   │
│       │  System Event ────────────┤    │   TASK ROUTER  │                   │
│       │  Agent Request ───────────┘    │   (Orchestrator)│                  │
│                                        └────────┬───────┘                   │
│                                                 │                            │
│                                    Analyze + Context Build                   │
│                                                 │                            │
│                                                 ▼                            │
│                              ┌─────────────────────────────────┐            │
│                              │          TASK QUEUE              │            │
│                              │   ┌───┐ ┌───┐ ┌───┐ ┌───┐      │            │
│                              │   │P1 │ │P2 │ │P3 │ │...│      │            │
│                              │   └───┘ └───┘ └───┘ └───┘      │            │
│                              └───────────────┬─────────────────┘            │
│                                              │                               │
│                            ┌─────────────────┼─────────────────┐            │
│                            │                 │                 │            │
│                            ▼                 ▼                 ▼            │
│                      ┌──────────┐      ┌──────────┐      ┌──────────┐      │
│                      │ Agent A  │      │ Agent B  │      │ Agent C  │      │
│                      │ (CSKH)   │      │ (Writer) │      │ (Review) │      │
│                      └────┬─────┘      └────┬─────┘      └────┬─────┘      │
│                           │                 │                 │            │
│                           └─────────────────┼─────────────────┘            │
│                                             │                               │
│                                             ▼                               │
│                              ┌─────────────────────────────────┐            │
│                              │         STATE MACHINE            │            │
│                              │                                  │            │
│                              │  pending → assigned → working   │            │
│                              │      ↓         ↓         ↓      │            │
│                              │  cancelled  blocked   completed │            │
│                              └─────────────────────────────────┘            │
│                                                                              │
│  SSOT: Agent Data                                                           │
│  UI: Directus (Admin view)                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## LUỒNG 3: FEEDBACK FLOW (Phản hồi)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FEEDBACK FLOW (2 Đường Đi)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Feedback Input]                                                           │
│       │                                                                      │
│       ├─── Public User (Anonymous) ─────────────────┐                       │
│       │                                             │                       │
│       └─── Logged-in User ──────────────────────────┤                       │
│                                                     │                       │
│                                                     ▼                       │
│                              ┌─────────────────────────────────┐            │
│                              │       FEEDBACK ROUTER           │            │
│                              │       (Classification)          │            │
│                              └───────────────┬─────────────────┘            │
│                                              │                               │
│                         ┌────────────────────┼────────────────────┐         │
│                         │                    │                    │         │
│                         ▼                    ▼                    ▼         │
│              ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│              │ DOC CHANGE      │  │ STRUCTURED      │  │ BUG REPORT      │ │
│              │                 │  │                 │  │                 │ │
│              │ "Typo ở dòng 5" │  │ "Rating: 4/5"   │  │ "Lỗi 500"       │ │
│              │ "Update số liệu"│  │ "Feature req"   │  │ "UI broken"     │ │
│              └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│                       │                    │                    │          │
│                       ▼                    ▼                    ▼          │
│              ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│              │  GitHub Issue   │  │    Directus     │  │  GitHub Issue   │ │
│              │  hoặc PR        │  │   (feedback     │  │  (bug label)    │ │
│              │                 │  │    collection)  │  │                 │ │
│              └────────┬────────┘  └─────────────────┘  └─────────────────┘ │
│                       │                                                     │
│                       ▼                                                     │
│              ┌─────────────────┐                                            │
│              │  CONTENT FLOW   │  ◄─── Đi vào luồng 1 nếu cần sửa doc     │
│              │  (nếu approved) │                                            │
│              └─────────────────┘                                            │
│                                                                              │
│  SSOT: Mixed (GitHub Issues cho docs, Directus cho structured)             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## LUỒNG 4: CONTEXT FLOW (Cung cấp Ngữ cảnh cho AI)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONTEXT FLOW (AI Consumption)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [AI Request]                                                               │
│       │                                                                      │
│       │  ChatGPT paste link ──────────────┐                                 │
│       │  Cursor query via MCP ────────────┼──► ┌────────────────────┐       │
│       │  Agent request context ───────────┘    │   CONTEXT BUILDER   │      │
│       │                                        │                     │      │
│                                                └──────────┬─────────┘      │
│                                                           │                  │
│                            ┌──────────────────────────────┼──────┐          │
│                            │                              │      │          │
│                            ▼                              ▼      ▼          │
│                   ┌───────────────┐           ┌───────────────────────┐    │
│                   │    GitHub     │           │     Agent Data        │    │
│                   │   (Docs)      │           │  (Index + Metadata)   │    │
│                   └───────┬───────┘           └───────────┬───────────┘    │
│                           │                               │                 │
│                           └───────────────┬───────────────┘                 │
│                                           │                                  │
│                                           ▼                                  │
│                            ┌─────────────────────────────────┐              │
│                            │         CONTEXT PACKER          │              │
│                            │                                 │              │
│                            │  1. Fetch requested files       │              │
│                            │  2. Add metadata (3 layers)     │              │
│                            │  3. Add relations               │              │
│                            │  4. Trim to token_budget        │              │
│                            │  5. Format (json/raw/html)      │              │
│                            └───────────────┬─────────────────┘              │
│                                            │                                 │
│                                            ▼                                 │
│                            ┌─────────────────────────────────┐              │
│                            │       CONTEXT PACKAGE           │              │
│                            │                                 │              │
│                            │  {                              │              │
│                            │    "ref": "main",               │              │
│                            │    "commit": "abc123",          │              │
│                            │    "files": [...],             │              │
│                            │    "metadata": {...},          │              │
│                            │    "packed_context": "..."     │              │
│                            │  }                              │              │
│                            └─────────────────────────────────┘              │
│                                                                              │
│  API: /api/docs/context?paths=...&token_budget=8000&format=raw             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## QUY TRÌNH 1: KHỞI TẠO TÀI LIỆU (Genesis)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GENESIS WORKFLOW (Tạo tài liệu mới)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: TRIGGER                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  User: "Tạo kế hoạch marketing Q2"                                  │    │
│  │         hoặc                                                        │    │
│  │  System: Scheduled task (1st of quarter)                            │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 2: TASK CREATION (Auto)                                               │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Agent Data creates:                                                │    │
│  │  {                                                                  │    │
│  │    "task_type": "create_document",                                  │    │
│  │    "doc_type": "plan",                                              │    │
│  │    "title": "Kế hoạch Marketing Q2 2026",                           │    │
│  │    "doc_code": "PLAN-MKT-2026-Q2",  ← Auto-generated                │    │
│  │    "status": "pending",                                             │    │
│  │    "assignee": null                                                 │    │
│  │  }                                                                  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 3: ASSIGNMENT (Router Agent)                                          │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Router analyzes:                                                   │    │
│  │  • Required skills: planning, marketing domain                      │    │
│  │  • Agent availability                                               │    │
│  │  • Workload balance                                                 │    │
│  │                                                                     │    │
│  │  → Assign to: "Planner Agent"                                       │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 4: CONTEXT GATHERING (Planner Agent)                                  │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Agent queries Agent Data:                                          │    │
│  │  • Previous plans: PLAN-MKT-2026-Q1, PLAN-MKT-2025-Q4              │    │
│  │  • Brand guidelines: POLICY-BRAND-2026                              │    │
│  │  • Budget constraints: BUDGET-MKT-2026                              │    │
│  │  • Performance data: REPORT-MKT-2025-ANNUAL                        │    │
│  │                                                                     │    │
│  │  Total context: ~12,000 tokens                                      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 5: DRAFTING (Planner Agent)                                           │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  1. Create branch: docs/create-plan-mkt-q2-2026                     │    │
│  │  2. Generate draft content                                          │    │
│  │  3. Create file: docs/plans/plan-mkt-2026-q2.md                     │    │
│  │  4. Commit + Open PR                                                │    │
│  │  5. Update task status: "reviewing"                                 │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 6: REVIEW (Parallel)                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │    │
│  │  │  Format Check   │ │  Domain Check   │ │  Human Review   │       │    │
│  │  │  (QA Agent)     │ │  (Expert Agent) │ │  (Marketing Mgr)│       │    │
│  │  │  ✓ Auto         │ │  ✓ Auto         │ │  ⏳ Manual      │       │    │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘       │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 7: COMPLETION                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  All approvals ✓ → Auto-merge → Index refresh → Notify             │    │
│  │                                                                     │    │
│  │  Final status: "published", version: "1.0.0"                        │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  METRICS:                                                                   │
│  • Total time: ~2 hours (mostly waiting for human)                         │
│  • Human touch: 1 point (approval) = 14% of steps                          │
│  • Auto-completion: 6/7 steps = 86%                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## QUY TRÌNH 2: CẬP NHẬT TÀI LIỆU (Evolution)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EVOLUTION WORKFLOW (Sửa đổi tài liệu)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: REQUEST EDIT                                                       │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  User/Agent: "Cập nhật số liệu Q1 vào kế hoạch Q2"                  │    │
│  │  Target: docs/plans/plan-mkt-2026-q2.md (v1.0.0, status: published) │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 2: LOCK CHECK (System)                                                │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Check: is_locked = false?                                          │    │
│  │                                                                     │    │
│  │  IF locked → Return "Document being edited by [agent_name]"         │    │
│  │  IF not locked → Set is_locked = true, locked_by = requester        │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 3: CREATE REVISION BRANCH                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  1. Create snapshot → doc_history (for rollback)                    │    │
│  │  2. Create branch: docs/update-plan-mkt-q2-numbers                  │    │
│  │  3. Update version: 1.0.0 → 1.1.0-draft                             │    │
│  │  4. Update status: published → revision_pending                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 4: EDIT (Agent)                                                       │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Agent makes changes + adds to change_log:                          │    │
│  │  "Updated Q1 actual figures: Revenue +12%, Leads +25%"              │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 5: REVIEW + APPROVE                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Same as Genesis Step 6                                             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 6: FINALIZE                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  1. Merge PR                                                        │    │
│  │  2. Update version: 1.1.0-draft → 1.1.0                             │    │
│  │  3. Update status: revision_pending → published                     │    │
│  │  4. Set is_locked = false                                           │    │
│  │  5. Invalidate cache (Nuxt)                                         │    │
│  │  6. Notify stakeholders                                             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  CONFLICT HANDLING:                                                         │
│  • If another edit request comes while locked:                              │
│  • Option A: Queue the request                                              │
│  • Option B: Notify requester to wait                                       │
│  • Option C: Force unlock (admin only) after timeout (30 min)               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## QUY TRÌNH 3: XỬ LÝ PHẢN HỒI KHÁCH HÀNG (Support Flow)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SUPPORT FLOW (Khách hàng hỏi qua Chatwoot)                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: INPUT (3 words)                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Customer: "Đơn hàng đâu rồi?"                                      │    │
│  │  Channel: Chatwoot widget on website                                │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 2: CONTEXT ENRICHMENT (< 500ms)                                       │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 1: Actor                                                     │    │
│  │  ├─ customer_id: cust_12345                                         │    │
│  │  ├─ tier: VIP                                                       │    │
│  │  └─ last_order: ORD-2025-001234                                     │    │
│  │                                                                     │    │
│  │  LAYER 2: Context                                                   │    │
│  │  ├─ session: mobile, from /support page                             │    │
│  │  ├─ history: 8 orders, 12 contacts, 1 open ticket                   │    │
│  │  └─ relations: FAQ-SHIPPING (relevance: 0.9)                        │    │
│  │                                                                     │    │
│  │  LAYER 3: Operational                                               │    │
│  │  ├─ workflow: support_inquiry                                       │    │
│  │  ├─ sentiment: neutral (urgency: 0.3)                               │    │
│  │  └─ sla_deadline: 4 hours from now                                  │    │
│  │                                                                     │    │
│  │  OUTPUT: ~4000 tokens context package                               │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 3: INTENT CLASSIFICATION                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Detected: order_inquiry (confidence: 0.92)                         │    │
│  │  Subtypes: [shipping_status, delivery_eta]                          │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 4: AGENT SELECTION                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  Router selects: CSKH Agent (order_specialist)                      │    │
│  │  Reason: VIP customer + order inquiry + available                   │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 5: RESPONSE GENERATION                                                │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  CSKH Agent receives context package:                               │    │
│  │                                                                     │    │
│  │  "Khách hàng VIP Nguyễn Văn A hỏi về đơn hàng.                      │    │
│  │   Đơn ORD-2025-001234 đang giao, shipper: GHN, ETA: 28/01.         │    │
│  │   Tracking: abc123xyz                                               │    │
│  │   Khách thường hỏi về shipping (3 lần gần đây).                    │    │
│  │   Tone bình thường."                                                │    │
│  │                                                                     │    │
│  │  Agent generates:                                                   │    │
│  │  "Chào anh A! Đơn hàng ORD-2025-001234 đang được giao bởi GHN,     │    │
│  │   dự kiến đến trong ngày 28/01. Anh có thể theo dõi tại: [link].   │    │
│  │   Cần hỗ trợ thêm gì không ạ?"                                      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 6: QUALITY CHECK (Optional for complex cases)                         │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  • Hallucination check: ✓ (order info matches DB)                   │    │
│  │  • Tone check: ✓ (professional, friendly)                           │    │
│  │  • PII check: ✓ (no sensitive data exposed)                         │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  STEP 7: SEND + LOG                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  1. Send response via Chatwoot                                      │    │
│  │  2. Log to Agent Data (audit trail)                                 │    │
│  │  3. Update customer history                                         │    │
│  │  4. Update metrics (response time, tokens used)                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ESCALATION RULES:                                                          │
│  • sentiment = angry → escalate to human immediately                        │
│  • 3+ messages without resolution → escalate                                │
│  • refund/legal keywords → escalate                                         │
│                                                                              │
│  TOTAL TIME: < 5 seconds (no human needed for simple queries)              │
│  HUMAN TOUCH: 0% (unless escalated)                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## TÓM TẮT LUỒNG + QUY TRÌNH

| # | Luồng/Quy trình | SSOT | Human Touch Target | Key Metric |
|---|-----------------|------|-------------------|------------|
| **L1** | Content Flow | GitHub | 14% (1 approval) | Time to Live |
| **L2** | Task Flow | Agent Data | 5% | Auto-completion Rate |
| **L3** | Feedback Flow | Mixed | 20% | Response Accuracy |
| **L4** | Context Flow | GitHub | 0% | P95 Latency < 500ms |
| **W1** | Genesis | GitHub | 14% | Doc Quality Score |
| **W2** | Evolution | GitHub | 14% | Version Consistency |
| **W3** | Support | Agent Data | 0-20% | First Response Time |
