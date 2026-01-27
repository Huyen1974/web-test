BUSINESS OS ARCHITECTURE v2.0
"Nền tảng cho Xã hội Agent"
Status: Draft Architecture
Vision: Một nền tảng nơi hàng trăm Agents tự động xử lý công việc, con người chỉ giám sát và phê duyệt.

1. NORTH STAR (Tầm nhìn)
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

2. ACTORS (Đối tượng tham gia)
2.1 Agent Hierarchy
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
2.2 Actor Capabilities Matrix
Actor
Read
Write
Approve
Orchestrate
Create Agent
Human
✅
❌ (via Agent)
✅
❌
❌
Orchestrator
✅
✅
✅
✅
✅
Commercial Agent
✅
✅
❌
❌
❌
Custom Agent
✅
✅*
❌
❌
❌
AI Model (Readonly)
✅
❌
❌
❌
❌
*Write permission based on Agent's role/scope

3. CORE COMPONENTS
3.1 Component Architecture
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
3.2 Agent Data Sub-Systems
Sub-system
Responsibility
Technology
Vector/RAG Index
Semantic search, context retrieval
Qdrant + OpenAI Embeddings
Task Queue
Job distribution, priority handling
Redis/Cloud Tasks
Event Bus
Inter-agent communication
Pub/Sub
State Machine
Workflow state tracking
Firestore
Agent Registry
Agent metadata, capabilities, permissions
Firestore
Workflow Engine
Process definition & execution
Custom (Langroid)
Context Builder
Pack context for token budget
Custom
Audit Log
Complete activity history
BigQuery/Firestore

4. DATA FLOW PATTERNS
4.1 Pattern: Document Creation (Agent-First)
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
4.2 Pattern: Human Feedback Processing
Human comments on Nuxt
        │
        ▼
┌───────────────────┐
│ Directus captures │
│ comment metadata  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Event Bus:        │
│ "feedback.new"    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐     ┌───────────────────┐
│ FeedbackClassifier│────►│ Route to:         │
│ Agent             │     │ • Bug? → BugFixer │
│                   │     │ • Q? → Answerer   │
│                   │     │ • Suggestion? →   │
│                   │     │   ContentImprover │
└───────────────────┘     └─────────┬─────────┘
                                    │
                                    ▼
                          ┌───────────────────┐
                          │ Assigned Agent    │
                          │ creates PR        │
                          │ addressing issue  │
                          └───────────────────┘
4.3 Pattern: Context Link (Zero Copy-Paste)
AI Model wants to review document
        │
        ▼
┌───────────────────────────────────────────────────────┐
│ Nuxt UI: Click "Copy Context Link"                    │
│                                                       │
│ Generated URL:                                        │
│ /api/context?ref=main&paths=docs/plan.md,docs/ref.md │
│ &token_budget=8000                                    │
└───────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│ AI Model calls URL → Receives:                        │
│ {                                                     │
│   "repo": "web-test",                                 │
│   "ref": "main",                                      │
│   "commit": "abc123",                                 │
│   "files": [                                          │
│     {"path": "docs/plan.md", "content": "..."},       │
│     {"path": "docs/ref.md", "content": "..."}         │
│   ],                                                  │
│   "packed_context": "... (within token budget) ..."   │
│ }                                                     │
└───────────────────────────────────────────────────────┘
        │
        ▼
AI Model can now analyze with full context
(No copy-paste needed)

5. WORKFLOW STATE MACHINE
5.1 Document Lifecycle States
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
5.2 State Transitions (Who Can Trigger)
Transition
Triggerable By
create_task
Human, Orchestrator, Event
start_draft
Assigned Agent
submit_pr
Assigned Agent
request_changes
Reviewer Agent, Human
approve_all
Reviewer Agent (auto), Human
re_submit
Assigned Agent
merge
System (auto when approved)
sync_complete
System (auto when merge)

6. AGENT REGISTRY SCHEMA
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

7. IMPLEMENTATION PHASES
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

8. DESIGN PRINCIPLES
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

9. NEXT QUESTIONS (For Phase 2)
	1	Docs API: Cloud Run hay Cloud Functions?
	2	Auth for Context Link: Public hay token-based?
	3	PR on Nuxt: GitHub API direct hay proxy qua Agent Data?
	4	First Custom Agents: Nên bắt đầu với agents nào?
