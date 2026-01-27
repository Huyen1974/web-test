BUSINESS OS ARCHITECTURE v2.1
"Nền tảng cho Xã hội Agent"
Status: Draft Architecture
Vision: Một nền tảng nơi hàng trăm Agents tự động xử lý công việc, con người chỉ giám sát và phê duyệt.

# LAYER A: ARCHITECTURE

## 1. NORTH STAR (Tầm nhìn)
┌─────────────────────────────────────────────────────────────────────────┐
│                         BUSINESS OS                                     │
│                                                                         │
│  "Một xã hội Agent tự vận hành, nơi công việc được xử lý tự động       │
│   theo quy trình chuẩn, con người chỉ đóng vai trò giám sát,           │
│   phê duyệt và ra quyết định chiến lược."                              │
│                                                                         │
│  Metrics:                                                               │
│  • Human Touch Points: < 5% của tổng workflow                          │
│  • Auto-completion Rate: > 80% tasks không cần can thiệp               │
│  • Context Accuracy: 100% agents có đủ ngữ cảnh để làm việc            │
└─────────────────────────────────────────────────────────────────────────┘

## 2. ACTORS (Đối tượng tham gia)
### 2.1 Agent Hierarchy
┌─────────────────────────────────────────────────────────────────────────┐
│                        AGENT ECOSYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TIER 1: ORCHESTRATORS (Điều phối viên)                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • Opus (Strategic Orchestrator)                                  │   │
│  │ • Task Router (Phân công việc)                                   │   │
│  │ • Conflict Resolver (Giải quyết xung đột)                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  TIER 2: COMMERCIAL AGENTS (MCP Connected)                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • Claude Desktop (via MCP → Agent Data)                          │   │
│  │ • Cursor/Codex (Code execution)                                  │   │
│  │ • Antigravity (Documentation)                                    │   │
│  │ • ChatGPT (Research/Analysis)                                    │   │
│  │ • Gemini CLI (Local operations)                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  TIER 3: CUSTOM AGENTS (Langroid-based)                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • CustomerCare Agent (CSKH)                                      │   │
│  │ • ProgressTracker Agent (Kiểm tra tiến độ)                       │   │
│  │ • QualityReviewer Agent (Rà soát lỗi)                            │   │
│  │ • ScheduleManager Agent (Lập lịch)                               │   │
│  │ • ... (100+ specialized agents)                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  TIER 4: READ-ONLY PARTICIPANTS                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • AI Models (ChatGPT, Gemini, Grok) - via Context Link          │   │
│  │ • Human Reviewers - via Nuxt UI                                  │   │
│  │ • External Systems - via API                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

### 2.2 Actor Capabilities Matrix
| Actor | Read | Write | Approve | Orchestrate | Create Agent |
|-------|------|-------|---------|-------------|--------------|
| Human | ✅ | ❌ (via Agent) | ✅ | ❌ | ❌ |
| Orchestrator | ✅ | ✅ | ✅ | ✅ | ✅ |
| Commercial Agent | ✅ | ✅ | ❌ | ❌ | ❌ |
| Custom Agent | ✅ | ✅* | ❌ | ❌ | ❌ |
| AI Model (Readonly) | ✅ | ❌ | ❌ | ❌ | ❌ |
*Write permission based on Agent's role/scope

## 3. CORE COMPONENTS
### 3.1 Component Architecture
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│  │    NUXT      │     │   GITHUB     │     │  DIRECTUS    │            │
│  │  (Display)   │     │   (SSOT)     │     │  (Structured │            │
│  │              │     │              │     │   Data UI)   │            │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘            │
│         │                    │                    │                     │
│         │         ┌──────────┴──────────┐         │                     │
│         │         │                     │         │                     │
│         ▼         ▼                     ▼         ▼                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      AGENT DATA (Brain)                          │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │   │
│  │  │ Vector/RAG  │ │ Task Queue  │ │ Event Bus   │ │ State      │ │   │
│  │  │ Index       │ │ & Router    │ │ (Pub/Sub)   │ │ Machine    │ │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │   │
│  │  │ Agent       │ │ Workflow    │ │ Context     │ │ Audit      │ │   │
│  │  │ Registry    │ │ Engine      │ │ Builder     │ │ Log        │ │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              │ MCP Protocol                             │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      AGENT ARMY                                  │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │   │
│  │  │ A1  │ │ A2  │ │ A3  │ │ A4  │ │ A5  │ │ ... │ │ A100│       │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

### 3.2 Agent Data Sub-Systems
| Sub-system | Responsibility | Technology |
|------------|----------------|------------|
| Vector/RAG Index | Semantic search, context retrieval | Qdrant + OpenAI Embeddings |
| Task Queue | Job distribution, priority handling | Redis/Cloud Tasks |
| Event Bus | Inter-agent communication | Pub/Sub |
| State Machine | Workflow state tracking | Firestore |
| Agent Registry | Agent metadata, capabilities, permissions | Firestore |
| Workflow Engine | Process definition & execution | Custom (Langroid) |
| Context Builder | Pack context for token budget | Custom |
| Audit Log | Complete activity history | BigQuery/Firestore |

### 3.3 FOLDER CONVENTIONS (web-test repo)
```
web-test/
├── docs/                 # Knowledge Base (SSOT)
│   ├── plans/            # Kế hoạch
│   ├── reports/          # Báo cáo
│   ├── processes/        # Quy trình (potentially thousands)
│   ├── policies/         # Chính sách
│   ├── contracts/        # Hợp đồng
│   └── templates/        # Mẫu tài liệu
├── .github/
│   ├── workflows/        # CI/CD
│   └── CODEOWNERS        # Protected files
└── web/                  # Nuxt application
```
**Naming Convention:**
- Folder: `kebab-case`
- File: `kebab-case.md`
- No spaces, no special characters
- Example: `docs/plans/q2-2026-marketing.md`

## 4. DATA FLOW PATTERNS
### 4.1 Pattern: Document Creation (Agent-First)
┌─────────────────────────────────────────────────────────────────────────┐
│  DOCUMENT CREATION FLOW                                                 │
│                                                                         │
│  1. TRIGGER                                                             │
│     ┌─────────────────────────────────────────────────────────────┐    │
│     │ Event: "Create Plan Q2 2026"                                 │    │
│     │ Source: Human request / Scheduled task / Another workflow    │    │
│     └─────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  2. ORCHESTRATION                                                       │
│     ┌─────────────────────────────────────────────────────────────┐    │
│     │ Task Router analyzes request                                 │    │
│     │ → Determines required capabilities                           │    │
│     │ → Selects appropriate Agent(s)                               │    │
│     │ → Builds context package                                     │    │
│     └─────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  3. EXECUTION                                                           │
│     ┌─────────────────────────────────────────────────────────────┐    │
│     │ Selected Agent receives task + context                       │    │
│     │ → Creates GitHub branch                                      │    │
│     │ → Drafts document                                            │    │
│     │ → Opens PR                                                   │    │
│     │ → Notifies Event Bus: "PR Created"                          │    │
│     └─────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  4. REVIEW (Parallel)                                                   │
│     ┌─────────────────────────────────────────────────────────────┐    │
│     │ QualityReviewer Agent: Check format, style                   │    │
│     │ DomainExpert Agent: Check accuracy                           │    │
│     │ AI Models (via Context Link): Provide feedback               │    │
│     │ Human (optional): Final approval                             │    │
│     └─────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  5. COMPLETION                                                          │
│     ┌─────────────────────────────────────────────────────────────┐    │
│     │ All approvals collected                                      │    │
│     │ → Auto-merge PR to main                                      │    │
│     │ → Trigger downstream sync (Agent Data index refresh)         │    │
│     │ → Notify stakeholders                                        │    │
│     │ → Archive workflow state                                     │    │
│     └─────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

### 4.2 FEEDBACK PROCESSING (2 Types)

#### Type 1: Doc-Change Feedback → GitHub PR
**Trigger:** User comments on specific document content
**Flow:**
User comment (Nuxt) → Directus captures metadata (source, doc_id, content) → Event: feedback.doc_change → FeedbackRouter Agent analyzes → Creates GitHub Issue/PR with proposed fix → Normal PR review cycle

#### Type 2: Structured Feedback → Directus
**Trigger:** User fills form, rates content, general feedback
**Flow:**
User feedback (Nuxt form) → Direct to Directus collection feedback → Event: feedback.structured → Agent processes (no GitHub PR needed) → Response stored in Directus

**Decision Rule:**
| Feedback About | Route To |
|----------------|----------|
| Content accuracy, typo, update request | GitHub PR |
| General opinion, rating, feature request | Directus |
| Bug report (technical) | GitHub Issue |

### 4.3 Pattern: Context Link (Zero Copy-Paste)
AI Model wants to review document
        │
        ▼
┌───────────────────────────────────────────────────────┐
│ Nuxt UI: Click "Copy Context Link"                    │
│                                                       │
│ Generated URL:
│ /api/context?ref=main&paths=docs/plan.md,docs/ref.md │
│ &token_budget=8000                                    │
└───────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│ AI Model calls URL → Receives:                        │
│ {
│   "repo": "web-test",
│   "ref": "main",
│   "commit": "abc123",
│   "files": [
│     {"path": "docs/plan.md", "content": "..."},
│     {"path": "docs/ref.md", "content": "..."}
│   ],
│   "packed_context": "... (within token budget) ..."   │
│ }
└───────────────────────────────────────────────────────┘
        │
        ▼
AI Model can now analyze with full context
(No copy-paste needed)

### 4.4 Canonical Workflow: "Sửa đổi Hiến pháp"
**Scenario:** Agent đề xuất sửa HP-05 trong `ALL_LAWs_MD.md`

1. **TRIGGER:** Agent gọi MCP endpoint với proposal
2. **DRAFT:** Agent Data tạo entry trong Draft Zone
3. **PR CREATION:** System tạo branch `docs/update-hp05-secret-model`
4. **REVIEW:** 
   - QualityReviewer Agent: Check format ✅
   - Human (Owner): Required approval ⏳
5. **MERGE:** After approval → auto-merge
6. **SYNC:** `docs.pr.merged` → Agent Data promotes to Official Zone
7. **LIVE:** Nuxt displays updated content

**Total Steps:** 7 | **Human Touch Points:** 1 (approval) = 14%

## 5. WORKFLOW STATE MACHINE
### 5.1 Document Lifecycle States
┌─────────────────────────────────────────────────────────────────────────┐
│                     DOCUMENT STATE MACHINE                              │
│                                                                         │
│  ┌──────────┐                                                          │
│  │  IDEA    │ ← Human request / Scheduled / Triggered                  │
│  └────┬─────┘                                                          │
│       │ create_task                                                     │
│       ▼                                                                 │
│  ┌──────────┐                                                          │
│  │ ASSIGNED │ ← Task Router assigns to Agent                           │
│  └────┬─────┘                                                          │
│       │ start_draft                                                     │
│       ▼                                                                 │
│  ┌──────────┐                                                          │
│  │ DRAFTING │ ← Agent working on GitHub branch                         │
│  └────┬─────┘                                                          │
│       │ submit_pr                                                       │
│       ▼                                                                 │
│  ┌──────────┐                                                          │
│  │ REVIEW   │ ← PR open, awaiting reviews                              │
│  └────┬─────┘                                                          │
│       │                                                                 │
│       ├──────────────────┐                                             │
│       │ request_changes  │ approve_all                                  │
│       ▼                  ▼                                              │
│  ┌──────────┐      ┌──────────┐                                        │
│  │ REVISION │      │ APPROVED │                                        │
│  └────┬─────┘      └────┬─────┘                                        │
│       │ re_submit       │ merge                                         │
│       └────────────────►│                                               │
│                         ▼                                               │
│                   ┌──────────┐                                          │
│                   │ MERGED   │ ← In main branch (SSOT)                  │
│                   └────┬─────┘                                          │
│                        │ sync_complete                                  │
│                        ▼                                                │
│                   ┌──────────┐                                          │
│                   │ LIVE     │ ← Indexed, visible on Nuxt               │
│                   └──────────┘                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

### 5.2 State Transitions (Who Can Trigger)
| Transition | Triggerable By |
|------------|----------------|
| create_task | Human, Orchestrator, Event |
| start_draft | Assigned Agent |
| submit_pr | Assigned Agent |
| request_changes | Reviewer Agent, Human |
| approve_all | Reviewer Agent (auto), Human |
| re_submit | Assigned Agent |
| merge | System (auto when approved) |
| sync_complete | System (auto when merge) |

## 6. AGENT REGISTRY SCHEMA
```json
{
  "agent_id": "customer-care-v1",
  "name": "CustomerCare Agent",
  "tier": 3,
  "type": "langroid",
  "status": "active",
  
  "capabilities": [
    "answer_customer_query",
    "create_support_ticket",
    "escalate_to_human"
  ],
  
  "permissions": {
    "read": ["docs/*", "kb/*"],
    "write": ["support/tickets/*"],
    "approve": false,
    "orchestrate": false
  },
  
  "triggers": [
    {"event": "customer.message", "priority": 1},
    {"schedule": "*/5 * * * *", "task": "check_pending_tickets"}
  ],
  
  "resource_limits": {
    "max_concurrent_tasks": 10,
    "token_budget_per_task": 4000,
    "timeout_seconds": 300
  },
  
  "mcp_endpoint": "https://agent-data.../mcp/customer-care",
  "health_check": "https://agent-data.../health/customer-care",
  
  "metadata": {
    "created_at": "2026-01-01",
    "created_by": "admin",
    "version": "1.2.0"
  }
}
```

## 7. IMPLEMENTATION PHASES
Phase 1: Foundation (Current - E1 Complete ✅)
	•	[x] Nuxt + Agency OS UI
	•	[x] Directus CMS
	•	[x] Agent Data (RAG basic)
	•	[x] GitHub CI/CD
	•	[x] DOT Tools
Phase 2: Content Pipeline (E2 - 3 weeks)
	•	[ ] Docs API: /tree, /file, /context
	•	[ ] GitHub → Agent Data sync
	•	[ ] PR integration on Nuxt
	•	[ ] Context Link feature
Phase 3: Agent Infrastructure (E3 - 4 weeks)
	•	[ ] Agent Registry
	•	[ ] Task Queue & Router
	•	[ ] Event Bus (Pub/Sub)
	•	[ ] State Machine
Phase 4: Workflow Automation (E4 - 4 weeks)
	•	[ ] Document Creation workflow
	•	[ ] Review workflow
	•	[ ] Feedback processing workflow
	•	[ ] Auto-merge logic
Phase 5: Scale & Optimize (E5 - Ongoing)
	•	[ ] 100+ Custom Agents
	•	[ ] Advanced orchestration
	•	[ ] Conflict resolution
	•	[ ] Analytics & monitoring

## 8. DESIGN PRINCIPLES
	1	GitHub PR = Vùng nháp chuẩn
	◦	Không tạo "vùng nháp copy" riêng
	◦	Tận dụng branch/PR/review flow có sẵn
	2	Một nguồn chân lý (SSOT)
	◦	web-test main = Official
	◦	Agent Data = Index + State (không phải SSOT docs)
	3	Event-driven over Polling
	◦	Webhook triggers > Cron jobs
	◦	"Gọi là chạy" > "Chạy rồi kiểm tra"
	4	Agent-first, Human-approve
	◦	Agents làm việc, con người phê duyệt
	◦	Minimize human touch points
	5	Context over Copy
	◦	Context Link thay vì copy-paste
	◦	Token budget aware
	6	Capability-based Access
	◦	Agents chỉ làm được những gì được phép
	◦	Registry-driven permissions

## 9. DECISIONS (Resolved)
| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Docs API hosting | **Cloud Run** | Consistent with existing infra (Agent Data) |
| 2 | Auth for Context Link | **Rate-limited + Optional Token** | Public for convenience, token for private repos |
| 3 | PR on Nuxt | **Proxy qua Agent Data** | Single gateway, audit logging, no direct GitHub exposure |
| 4 | First Custom Agents | **DocReviewer → CustomerCare** | DocReviewer aligns with Phase 2 (Content Pipeline) |

---

# LAYER B: EXECUTION SPEC

## B1: HARD RULES (Decision Log)

### R1: SSOT Definition
| Data Type | SSOT Location | Consumers |
|-----------|---------------|-----------|
| **Docs/Markdown** | GitHub (`web-test/docs/`) | Agent Data, Nuxt |
| **Structured Data** | Directus | Nuxt, Agents |
| **Vector/Index** | Agent Data | MCP Clients |
| **State/Workflow** | Agent Data | All |

### R2: Directus Role (Strict)
- ✅ Structured data UI (forms, tables)
- ✅ Metadata storage (permissions, status)
- ✅ Flows automation
- ❌ KHÔNG là SSOT cho docs Markdown
- ❌ KHÔNG nằm trong đường đọc docs (Nuxt → GitHub direct)

### R3: Agent Data Two-Zone Architecture
| Zone | Purpose | Write Access | Read Access |
|------|---------|--------------|-------------|
| **Draft** | Proposals, revisions, comments | All Agents | All |
| **Official** | Verified content | System only (after GH merge) | All |

### R4: PR = Official Draft Space
- Mọi thay đổi docs đi qua GitHub PR
- KHÔNG tạo "vùng nháp copy" riêng ngoài PR
- Branch naming: `docs/<action>-<topic>`

## B2: API CONTRACTS (MVP Phase 1)

### Docs API (Gateway to GitHub)

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/docs/tree` | GET | Lấy cấu trúc thư mục | `{folders: [], files: []}` |
| `/api/docs/file` | GET | Lấy nội dung file | `{path, content, metadata}` |
| `/api/docs/context` | GET | Context Link (packed) | `{files: [], packed_context}` |

#### Query Parameters
```yaml
# /api/docs/tree
ref: string          # main | pr-123 | commit-sha
path: string         # docs/plans (optional, default: docs/)

# /api/docs/file
ref: string
path: string         # Required: docs/plans/q2-2026.md

# /api/docs/context
ref: string
paths: string[]      # Multiple files
token_budget: number # Max tokens for packed context (default: 8000)
```

#### Response Schemas
**GET /api/docs/tree**
```json
{
  "ref": "main",
  "commit": "abc123",
  "path": "docs/",
  "folders": [
    {"name": "plans", "path": "docs/plans", "item_count": 12},
    {"name": "processes", "path": "docs/processes", "item_count": 847}
  ],
  "files": [
    {"name": "README.md", "path": "docs/README.md", "size": 1024, "updated_at": "2026-01-27"}
  ]
}
```

**GET /api/docs/file**
```json
{
  "path": "docs/plans/q2-2026.md",
  "ref": "main",
  "commit": "abc123",
  "content": "# Q2 2026 Plan\n...",
  "metadata": {
    "size": 2048,
    "encoding": "utf-8",
    "updated_at": "2026-01-27",
    "author": "agent-antigravity"
  }
}
```

### Security & Auth
| Component | Auth Strategy | Limits |
|-----------|---------------|--------|
| **Docs API (Read)** | Public (cached) or Token (if private) | CDN Cache: 1h |
| **Context Link** | Rate-limited + Optional Temp Token | 100 req/IP/hour; Max 30k tokens/req |
| **PR Operations** | GitHub App Token / PAT (System) | Strict role-based access |

### PR API (Phase 2)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/prs` | GET | List open PRs |
| `/api/prs/{id}` | GET | PR details + diff |
| `/api/prs/{id}/comments` | GET/POST | PR comments |

## B3: EVENT SCHEMA (Chuẩn hóa)

### Event Envelope (Bắt buộc)
```json
{
  "event_id": "uuid-v4",
  "event_type": "docs.pr.merged",
  "correlation_id": "uuid-v4",
  "source": "github-webhook | directus-flow | agent-data",
  "timestamp": "ISO-8601",
  "payload": { ... }
}
```

### Event Types
| Event | Trigger | Consumer Actions |
|-------|---------|------------------|
| docs.pr.created | PR opened | Index draft, notify reviewers |
| docs.pr.updated | PR pushed | Re-index draft |
| docs.pr.merged | PR merged | Promote to Official, sync Directus |
| docs.pr.closed | PR closed (no merge) | Cleanup draft index |
| feedback.new | Comment on Nuxt | Route to appropriate agent |
| context.requested | Context Link called | Log for analytics |

### Idempotency Rule
- Consumer PHẢI check event_id trước khi xử lý
- Nếu đã xử lý → return cached result
- Tránh: double PR creation, duplicate index

## B4: GUARDRAILS (Chống Agent Làm Bậy)

### GitHub Protection
| Rule | Config | Purpose |
|------|--------|---------|
| Branch Protection | `main` required PR | Không commit trực tiếp |
| Required Reviews | 1 approval minimum | Human oversight |
| Status Checks | CI must pass | Quality gate |
| CODEOWNERS | `docs/` → @.github/CODEOWNERS | Critical files protection |

### CI Guard Rules
```yaml
# .github/workflows/guard.yml
- name: Prevent Blueprint Deletion
  run: |
    DELETED=$(git diff --name-only --diff-filter=D HEAD~1)
    if echo "$DELETED" | grep -E "BLUEPRINT|CONSTITUTION|LAW"; then
      echo "❌ Cannot delete protected files"
      exit 1
    fi
```

### Agent Permissions Matrix
| Agent Tier | Can Create PR | Can Merge | Can Delete Files |
|------------|---------------|-----------|------------------|
| Orchestrator | ✅ | ✅ (with approval) | ❌ |
| Commercial Agent | ✅ | ❌ | ❌ |
| Custom Agent | ✅ | ❌ | ❌ |
| AI Model (Readonly) | ❌ | ❌ | ❌ |

## B5: PHASE 1 DoD (Definition of Done)

### Functional Requirements
| # | Requirement | Acceptance Criteria |
|---|-------------|---------------------|
| F1 | Tree View | Hiển thị cấu trúc `docs/` từ GitHub |
| F2 | Document Viewer | Render Markdown với syntax highlight |
| F3 | Context Link | Copy button → URL với token_budget |
| F4 | Branch Selector | Switch giữa `main` và `pr-xxx` |

### Metrics (Đo lường)
| Metric | Target | How to Measure |
|--------|--------|----------------|
| Human Touch Points | < 5% | `(manual_actions / total_workflow_steps) * 100` |
| Context Accuracy | 100% | `agents_with_sufficient_context / total_agents` |
| API Latency P95 | < 500ms | Cloud Monitoring |

### NOT in Phase 1 (Defer)
- [ ] PR diff viewer
- [ ] Inline comments on docs
- [ ] Full-text search
- [ ] Agent Registry UI

## B6: TECHNICAL DEBT & KNOWN ISSUES

### Failure Modes & Mitigation
| Mode | Risk | Mitigation |
|------|------|------------|
| GitHub Rate Limit | High | Cache heavily (Layer A 4.1), use multiple tokens if needed |
| PR Conflicts | Medium | Rebase strategy (not merge), conflict resolver agent |
| Token Budget Exceeded | High | "Context Link" must support aggressive packing/summarization |
| Agent Hallucination | Medium | Strict "Reviewer" agents required before Human loop |

### Cost-Control Notes
| Strategy | Implementation | Impact |
|----------|----------------|--------|
| Cache by SHA/ETag | GitHub API responses cached by commit SHA | -70% API calls |
| Avoid sync dư thừa | Only sync on `docs.pr.merged` event | -50% redundant syncs |
| Token budget enforcement | Context Link hard limit 30k tokens | Predictable costs |
| CDN for docs | Static docs cached at edge (1h TTL) | -80% origin requests |