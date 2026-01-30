``
# 📋 UNIVERSAL FEEDBACK SYSTEM - DESIGN DOCUMENT

**Document ID:** BOS-FEEDBACK-DESIGN-001  
**Version:** 1.0  
**Status:** APPROVED  
**Created:** 2026-01-30  
**Author:** Opus (với input từ Huyen, Gemini)  
**Scope:** Business OS - Core Infrastructure Layer

---

## 1. TẦM NHÌN & MỤC TIÊU

### 1.1 Tầm nhìn (Vision Statement)

> **"Bất kỳ ai, bất kỳ lúc nào, ở bất kỳ khâu nào, đều có thể đưa ra ý kiến về bất kỳ điều gì - và TẤT CẢ các ý kiến quý báu đó sẽ được xử lý tự động qua các quy trình ngày càng tối ưu."**

### 1.2 Mục tiêu chiến lược

| # | Mục tiêu | Đo lường |
|---|----------|----------|
| 1 | Không ý kiến nào bị bỏ sót | 100% feedbacks có status tracking |
| 2 | Xử lý tự động tối đa | >80% feedbacks trigger workflows |
| 3 | Mở rộng không giới hạn | Hỗ trợ N entity types, N gates |
| 4 | Audit trail đầy đủ | Mọi thay đổi được ghi nhận |

### 1.3 Nguyên tắc thiết kế

```
┌────────────────────────────────────────────────────────────────────┐
│                    DESIGN PRINCIPLES                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. ID HÓA MỌI THỨ (Universal Identity)                            │
│     └── Mọi entity trong Business OS đều có ID duy nhất            │
│                                                                     │
│  2. EVENT-DRIVEN (Hướng sự kiện)                                   │
│     └── Mọi thay đổi đều tạo event → trigger workflows             │
│                                                                     │
│  3. FLEXIBLE LINKING (Liên kết linh hoạt)                          │
│     └── M:N relationships, có thể thêm/bớt bất kỳ lúc nào          │
│                                                                     │
│  4. FUTURE-PROOF METADATA (Metadata mở rộng)                       │
│     └── JSON fields cho dữ liệu tương lai (HR, CRM, etc.)          │
│                                                                     │
│  5. NO FEEDBACK LEFT BEHIND (Không bỏ sót)                         │
│     └── Anonymous → Known flow, offline sync                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. KIẾN TRÚC HỆ THỐNG

### 2.1 Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     UNIVERSAL FEEDBACK SYSTEM                            │
│                     (Business OS Core Layer)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Web UI     │  │   Agent     │  │   API       │  │  External   │     │
│  │  (Nuxt)     │  │   (Claude)  │  │   Direct    │  │  Systems    │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │                │             │
│         └────────────────┼────────────────┼────────────────┘             │
│                          │                │                              │
│                          ▼                ▼                              │
│                   ┌─────────────────────────────┐                        │
│                   │     DIRECTUS API GATEWAY    │                        │
│                   └──────────────┬──────────────┘                        │
│                                  │                                       │
│         ┌────────────────────────┼────────────────────────┐              │
│         │                        │                        │              │
│         ▼                        ▼                        ▼              │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐       │
│  │  feedbacks  │◀────────▶│feedback_links│◀────────▶│   entities  │       │
│  │  (Core)     │          │ (Relations) │          │  (doc,task  │       │
│  └──────┬──────┘          └─────────────┘          │   customer) │       │
│         │                                          └─────────────┘       │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────┐                                                         │
│  │feedback_    │─────────▶ DIRECTUS FLOWS ─────────▶ WORKFLOWS           │
│  │events       │           (Event Handlers)         (Automation)         │
│  │(Triggers)   │                                                         │
│  └─────────────┘                                                         │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────┐                                                         │
│  │    MCP      │─────────▶ AGENTS (Claude/Codex)                         │
│  │  (Bridge)   │           Real-time notification                        │
│  └─────────────┘                                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
INPUT SOURCES                    PROCESSING                     OUTPUTS
─────────────                    ──────────                     ───────

┌─────────────┐
│ Web Comment │──┐
│ (logged in) │  │
└─────────────┘  │
                 │     ┌─────────────┐     ┌─────────────┐
┌─────────────┐  │     │             │     │  Workflow   │
│ Web Comment │──┼────▶│  feedbacks  │────▶│  Triggers   │
│ (anonymous) │  │     │             │     │             │
└─────────────┘  │     └──────┬──────┘     └─────────────┘
                 │            │                   │
┌─────────────┐  │            │                   ├──▶ Auto-assign
│ Agent       │──┤            ▼                   ├──▶ Notifications
│ (Claude)    │  │     ┌─────────────┐            ├──▶ Escalations
└─────────────┘  │     │ feedback_   │            ├──▶ Analytics
                 │     │ events      │            └──▶ Reports
┌─────────────┐  │     └─────────────┘
│ API/        │──┘            │
│ Integration │               ▼
└─────────────┘         ┌─────────────┐
                        │    MCP      │──────▶ Agent Response
                        │  Push to    │        (Real-time)
                        │  Agents     │
                        └─────────────┘
```

---

## 3. DATA MODEL CHI TIẾT

### 3.1 Collection: `feedbacks` (Core)

**Mục đích:** Lưu trữ mọi feedback/comment/ý kiến trong hệ thống

```yaml
Collection: feedbacks
Description: Universal feedback storage - core of Business OS

Fields:
  # === IDENTITY ===
  id:
    type: uuid
    primary_key: true
    description: "Universal ID - format: fb-{uuid}"
    
  feedback_code:
    type: string
    unique: true
    description: "Human-readable code: FB-2026-00001"

  # === THREADING (Reply support) ===
  parent_id:
    type: uuid
    nullable: true
    foreign_key: feedbacks.id
    indexed: true
    description: |
      Self-reference để tạo chuỗi thảo luận (Thread)
      - null = feedback gốc (root)
      - có giá trị = reply cho feedback khác
      Cho phép tạo cấu trúc phân cấp: Comment → Reply → Reply to Reply
      
  thread_root_id:
    type: uuid
    nullable: true
    indexed: true
    description: |
      ID của feedback gốc trong thread (denormalized để query nhanh)
      - null = chính nó là root
      - có giá trị = ID của root feedback
      
  reply_count:
    type: integer
    default: 0
    description: "Số lượng reply trực tiếp (denormalized)"
    
  # === CLASSIFICATION ===
  feedback_type:
    type: enum
    values: [comment, review, request, suggestion, complaint, question, praise]
    default: comment
    description: "Loại feedback để routing đúng workflow"
    
  priority:
    type: enum
    values: [low, normal, high, urgent, critical]
    default: normal
    
  # === CONTENT ===
  title:
    type: string
    max_length: 500
    description: "Tiêu đề ngắn gọn"
    
  content:
    type: text
    description: "Nội dung chi tiết (hỗ trợ Markdown)"
    
  content_format:
    type: enum
    values: [plain, markdown, html, json]
    default: markdown
    
  attachments:
    type: json
    description: "Array of file references [{id, name, type, url}]"
    
  # === STATUS & WORKFLOW ===
  status:
    type: enum
    values: [draft, open, in_review, processing, resolved, archived, cancelled]
    default: open
    
  review_gates:
    type: json
    description: |
      Flexible N-gates review system
      [
        {
          gate_order: 1,
          gate_name: "Technical Review",
          required_role: "agent",
          reviewer_id: null,
          reviewer_name: null,
          status: "pending|approved|rejected|skipped",
          feedback: "",
          reviewed_at: null
        },
        {
          gate_order: 2,
          gate_name: "Owner Approval",
          required_role: "admin",
          ...
        }
      ]
      
  current_gate:
    type: integer
    default: 1
    description: "Gate đang active"
    
  resolution:
    type: json
    description: |
      {
        resolved_by_id: uuid,
        resolved_by_name: string,
        resolved_at: datetime,
        resolution_type: "completed|rejected|duplicate|wont_fix",
        resolution_note: string
      }
      
  # === CREATOR INFO ===
  created_by_id:
    type: uuid
    nullable: true
    description: "User ID nếu đã login, null nếu anonymous"
    
  created_by_name:
    type: string
    description: "Display name"
    
  created_by_type:
    type: enum
    values: [human, agent, system, anonymous]
    
  created_by_email:
    type: string
    nullable: true
    
  # === ANONYMOUS TRACKING (Gemini suggestion) ===
  fingerprint_id:
    type: string
    nullable: true
    indexed: true
    description: "Browser fingerprint for anonymous users - enables merge when login"
    
  anonymous_session_id:
    type: string
    nullable: true
    description: "Session tracking for anonymous"
    
  # === LOCATION DATA ===
  location_data:
    type: json
    description: |
      {
        country: "VN",
        country_name: "Vietnam",
        city: "Ho Chi Minh",
        region: "Ho Chi Minh City",
        timezone: "Asia/Ho_Chi_Minh",
        ip_hash: "sha256...",  // Không lưu IP gốc
        coordinates: {lat, lng}  // Optional, nếu user cho phép
      }
      
  # === CONTEXT DATA ===
  context_data:
    type: json
    description: |
      {
        page_url: "/docs/architecture",
        page_title: "System Architecture",
        
        // === CONTENT SNAPSHOT (NEW) ===
        content_snapshot: {
          enabled: true,
          captured_at: "2026-01-30T10:00:00Z",
          linked_entities: [
            {
              entity_ref: "doc:abc-123",
              entity_title: "System Architecture v2.0",
              content_hash: "sha256:...",  // Để verify nếu đã thay đổi
              content_preview: "First 500 chars of content...",
              content_full: "..." // Optional, chỉ lưu nếu < 10KB
            }
          ]
        },
        referrer: "https://google.com",
        user_agent: "...",
        device_type: "desktop|mobile|tablet",
        browser: "Chrome",
        os: "MacOS",
        screen_resolution: "1920x1080",
        session_id: "sess-xxx",
        session_duration_seconds: 120
      }
      
  # === SNAPSHOT CONFIG ===
  # Quy tắc lưu snapshot:
  # 1. Luôn lưu: content_hash, content_preview (max 500 chars)
  # 2. Lưu full content nếu: size < 10KB AND entity type in [doc, process]
  # 3. Không lưu full content: files, images, large data
      
  # === TIMESTAMPS ===
  created_at:
    type: datetime
    auto_now_add: true
    
  updated_at:
    type: datetime
    auto_now: true
    
  first_response_at:
    type: datetime
    nullable: true
    description: "SLA tracking - thời điểm phản hồi đầu tiên"
    
  resolved_at:
    type: datetime
    nullable: true
    
  # === EXTENSIBLE METADATA ===
  metadata:
    type: json
    description: |
      Future-proof field cho các use case cụ thể:
      {
        hr_data: {candidate_id, position, round...},
        crm_data: {deal_id, stage...},
        support_data: {ticket_id, severity...},
        custom_fields: {...}
      }
      
  tags:
    type: json
    description: "Array of tags for categorization"
    
  # === AUDIT ===
  history:
    type: json
    description: |
      Array of all changes:
      [
        {
          timestamp: datetime,
          action: "created|updated|status_changed|gate_approved|linked|unlinked",
          actor_id: uuid,
          actor_name: string,
          changes: {field: {old, new}},
          note: string
        }
      ]
      
  version:
    type: integer
    default: 1
    description: "Optimistic locking"

Indexes:
  - [status, created_at]  # For listing
  - [feedback_type, status]  # For filtering
  - [created_by_id]  # For user history
  - [fingerprint_id]  # For anonymous merge
  - [created_at]  # For timeline
  - [parent_id]  # For threading
  - [thread_root_id, created_at]  # For loading full thread
```

### 3.2 Collection: `feedback_links` (Relations)

**Mục đích:** Many-to-Many relationships giữa feedback và các entities

```yaml
Collection: feedback_links
Description: Flexible linking between feedbacks and any entity

Fields:
  id:
    type: uuid
    primary_key: true
    
  feedback_id:
    type: uuid
    foreign_key: feedbacks.id
    indexed: true
    
  # === ENTITY REFERENCE (Gemini suggestion: type:uuid format) ===
  linked_entity_type:
    type: enum
    values: [doc, task, customer, case, process, conversation, person, 
             project, product, order, ticket, campaign, event, other]
    indexed: true
    
  linked_entity_id:
    type: uuid
    indexed: true
    description: "ID của entity được link"
    
  linked_entity_ref:
    type: string
    description: "Composite key: {type}:{id} (e.g., doc:abc-123)"
    indexed: true
    
  linked_entity_name:
    type: string
    description: "Display name tại thời điểm link (denormalized)"
    
  # === LINK METADATA ===
  link_type:
    type: enum
    values: [primary, related, mentioned, cc, blocking, blocked_by, parent, child]
    default: primary
    description: |
      - primary: Đây là subject chính của feedback
      - related: Liên quan
      - mentioned: Được đề cập trong nội dung
      - cc: Được copy để biết
      - blocking/blocked_by: Dependencies
      - parent/child: Hierarchy
      
  link_note:
    type: string
    nullable: true
    description: "Ghi chú về mối quan hệ"
    
  # === LIFECYCLE ===
  is_active:
    type: boolean
    default: true
    description: "Soft delete - cho phép unlink mà không mất history"
    
  linked_at:
    type: datetime
    auto_now_add: true
    
  linked_by_id:
    type: uuid
    
  linked_by_name:
    type: string
    
  unlinked_at:
    type: datetime
    nullable: true
    
  unlinked_by_id:
    type: uuid
    nullable: true

Indexes:
  - [feedback_id, is_active]
  - [linked_entity_type, linked_entity_id, is_active]
  - [linked_entity_ref]
```

### 3.3 Collection: `feedback_events` (Triggers)

**Mục đích:** Event log cho audit trail và workflow triggers

```yaml
Collection: feedback_events
Description: Event sourcing for feedbacks - enables automation and audit

Fields:
  id:
    type: uuid
    primary_key: true
    
  feedback_id:
    type: uuid
    foreign_key: feedbacks.id
    indexed: true
    
  # === EVENT INFO ===
  event_type:
    type: enum
    values: [
      created,           # Feedback mới
      updated,           # Cập nhật content
      status_changed,    # Đổi status
      gate_submitted,    # Submit để review
      gate_approved,     # Gate được approve
      gate_rejected,     # Gate bị reject
      gate_skipped,      # Gate bị skip
      linked,            # Link entity mới
      unlinked,          # Unlink entity
      assigned,          # Assign cho người/agent
      escalated,         # Escalate lên cấp cao hơn
      commented,         # Có reply/comment con
      resolved,          # Resolved
      reopened,          # Mở lại sau resolved
      archived,          # Archived
      merged,            # Merge từ anonymous
      tagged,            # Thêm tag
      mentioned,         # Được mention trong feedback khác
      critical_alert,     # NEW: Immediate alert triggered
      alert_acknowledged  # NEW: Admin acknowledged alert
    ]
    indexed: true
    
  event_data:
    type: json
    description: |
      Chi tiết sự kiện:
      {
        previous_status: "open",
        new_status: "in_review",
        gate_number: 1,
        reviewer_id: "...",
        changes: {...},
        trigger_source: "user|agent|system|flow"
      }
      
  # === TRIGGER TRACKING ===
  triggered_workflows:
    type: json
    description: |
      Array của workflows đã được trigger:
      [
        {
          workflow_id: "flow-001",
          workflow_name: "Auto-assign Reviewer",
          triggered_at: datetime,
          status: "triggered|completed|failed",
          result: {...}
        }
      ]
      
  # === MCP INTEGRATION (Gemini suggestion) ===
  mcp_dispatched:
    type: boolean
    default: false
    description: "Đã gửi qua MCP cho agents chưa"
    
  mcp_dispatched_at:
    type: datetime
    nullable: true
    
  mcp_recipients:
    type: json
    description: "Array of agent IDs đã nhận"
    
  # === PROCESSING ===
  processed:
    type: boolean
    default: false
    indexed: true
    
  processed_at:
    type: datetime
    nullable: true
    
  processing_errors:
    type: json
    nullable: true
    
  # === ACTOR ===
  actor_id:
    type: uuid
    nullable: true
    
  actor_name:
    type: string
    
  actor_type:
    type: enum
    values: [human, agent, system, flow]
    
  # === TIMESTAMP ===
  timestamp:
    type: datetime
    auto_now_add: true
    indexed: true

Indexes:
  - [feedback_id, timestamp]  # Timeline per feedback
  - [event_type, processed]   # For workflow processing
  - [timestamp]               # Global timeline
  - [mcp_dispatched]          # For MCP queue
```

---

## 4. IDENTITY RESOLUTION PROTOCOL

### 4.1 Chuẩn Entity Reference (Gemini suggestion)

```
FORMAT: {entity_type}:{uuid}

EXAMPLES:
- doc:a1b2c3d4-e5f6-7890-abcd-ef1234567890
- customer:cust-001-2026
- task:task-00123
- feedback:fb-2026-00001
- person:emp-vietnam-001
```

### 4.2 Anonymous-to-Known Merge Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                 ANONYMOUS TO KNOWN MERGE FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: Anonymous Submit                                            │
│  ─────────────────────────                                           │
│  User chưa login → Submit feedback                                   │
│  └── fingerprint_id = "fp-abc123..."                                │
│  └── created_by_type = "anonymous"                                   │
│  └── created_by_id = null                                            │
│                                                                      │
│  STEP 2: User Registers/Logins                                       │
│  ─────────────────────────────                                       │
│  Directus Flow triggers on login event                               │
│  └── Check: feedbacks WHERE fingerprint_id = current_fingerprint     │
│      AND created_by_id IS NULL                                       │
│                                                                      │
│  STEP 3: Merge Prompt (Optional)                                     │
│  ──────────────────────────────                                      │
│  UI shows: "Bạn có 3 góp ý trước đó. Liên kết vào tài khoản?"       │
│  └── User confirms → Proceed to merge                                │
│  └── User declines → Keep separate                                   │
│                                                                      │
│  STEP 4: Execute Merge                                               │
│  ─────────────────────                                               │
│  UPDATE feedbacks SET                                                │
│    created_by_id = {user_id},                                        │
│    created_by_type = 'human',                                        │
│    history = history + [merge_event]                                 │
│  WHERE fingerprint_id = {fp} AND created_by_id IS NULL               │
│                                                                      │
│  STEP 5: Create Event                                                │
│  ────────────────────                                                │
│  INSERT feedback_events (event_type = 'merged', ...)                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

### 4.3 Processing Engine Principle

NGUYÊN TẮC BẮT BUỘC: "Directus Flows = Business Logic Engine"

┌─────────────────────────────────────────────────────────────────────┐
│                    PROCESSING RESPONSIBILITY                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  NUXT (Web UI):                                                      │
│  └── CHỈ LÀM: Gửi data vào + Hiển thị kết quả                       │
│  └── KHÔNG ĐƯỢC: Xử lý logic, tính toán, quyết định                 │
│                                                                      │
│  DIRECTUS FLOWS (Engine):                                            │
│  └── BẮT BUỘC XỬ LÝ:                                                │
│      • Status transitions (draft → open → in_review...)              │
│      • Auto-assignment (phân việc tự động)                           │
│      • Notifications (gửi thông báo)                                 │
│      • Gate validation (kiểm tra điều kiện review)                   │
│      • Event creation (tạo feedback_events)                          │
│      • SLA monitoring (theo dõi deadline)                            │
│      • Escalation logic (leo thang khi quá hạn)                      │
│                                                                      │
│  AGENT DATA:                                                         │
│  └── CHỈ LÀM: RAG query, Vector search                              │
│  └── KHÔNG ĐƯỢC: Business logic của Feedback System                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

RATIONALE:
- Đảm bảo nguyên tắc "UI để View, Tools để Action"
- Logic tập trung = dễ maintain, dễ audit
- No-Code first = thay đổi nhanh không cần deploy
- Single source of truth cho business rules
```

---

## 5. DIRECTUS FLOWS (Event Handlers)

### 5.1 Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DIRECTUS FLOWS OVERVIEW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  FLOW 1: On Feedback Created (UPDATED)                               │
│  ──────────────────────────                                          │
│  Trigger: items.create (feedbacks)                                   │
│  Actions:                                                            │
│    1. Generate feedback_code (FB-YYYY-NNNNN)                         │
│    2. Create feedback_event (type: created)                          │
│    3. *** CRITICAL ALERT CHECK (NEW) ***                             │
│       └── Query linked entities via feedback_links                   │
│       └── If ANY entity has tag: "protected" OR "critical"           │
│           └── BYPASS Gate 1 review wait                              │
│           └── Send IMMEDIATE notification:                           │
│               - Telegram (if configured)                             │
│               - Email to admin@example.com                           │
│               - Create feedback_event (type: "critical_alert")       │
│    4. Else if priority = urgent|critical → Notify admins             │
│    5. Auto-assign based on feedback_type                             │
│    6. Push to MCP for agents                                         │
│                                                                      │
│  FLOW 1.5: Capture Content Snapshot (NEW)                            │
│  ────────────────────────────────────────                            │
│  Trigger: items.create (feedback_links)                              │
│  Actions:                                                            │
│    1. Fetch linked entity content                                    │
│    2. Generate content_hash (SHA256)                                 │
│    3. Extract content_preview (first 500 chars)                      │
│    4. If size < 10KB → store full content                            │
│    5. Update feedback.context_data.content_snapshot                  │
│                                                                      │
│  FLOW 2: On Status Changed                                           │
│  ────────────────────────                                            │
│  Trigger: items.update (feedbacks) WHERE status changed              │
│  Actions:                                                            │
│    1. Create feedback_event (type: status_changed)                   │
│    2. If status = in_review → Notify assigned reviewer               │
│    3. If status = resolved → Send thank you to creator               │
│    4. If status = resolved → Update linked entities                  │
│    5. Update SLA metrics                                             │
│                                                                      │
│  FLOW 3: On Gate Approved                                            │
│  ───────────────────────                                             │
│  Trigger: items.update (feedbacks) WHERE review_gates changed        │
│  Actions:                                                            │
│    1. Create feedback_event (type: gate_approved)                    │
│    2. Advance to next gate OR set status = processing                │
│    3. Notify next reviewer                                           │
│    4. If all gates passed → Auto-resolve or proceed                  │
│                                                                      │
│  FLOW 4: On Link Created                                             │
│  ──────────────────────                                              │
│  Trigger: items.create (feedback_links)                              │
│  Actions:                                                            │
│    1. Create feedback_event (type: linked)                           │
│    2. Update related entity (add back-reference)                     │
│    3. Notify stakeholders of linked entity                           │
│                                                                      │
│  FLOW 5: MCP Dispatcher (Scheduled)                                  │
│  ─────────────────────────────────                                   │
│  Trigger: Schedule (every 1 minute)                                  │
│  Actions:                                                            │
│    1. Query: feedback_events WHERE mcp_dispatched = false            │
│    2. Batch send to MCP endpoint                                     │
│    3. Update mcp_dispatched = true                                   │
│                                                                      │
│  FLOW 6: SLA Monitor (Scheduled)                                     │
│  ──────────────────────────────                                      │
│  Trigger: Schedule (every 15 minutes)                                │
│  Actions:                                                            │
│    1. Check feedbacks WHERE status = open                            │
│       AND created_at < NOW() - SLA_THRESHOLD                         │
│    2. Auto-escalate if breaching SLA                                 │
│    3. Send alerts                                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Flow Details (Cấu hình Directus)

```yaml
# Flow 1: On Feedback Created
flow_id: feedback-on-created
name: "UFS: On Feedback Created"
trigger: 
  type: event_hook
  event: items.create
  collection: feedbacks
  
operations:
  - id: generate-code
    type: run_script
    options:
      code: |
        const year = new Date().getFullYear();
        const count = await database('feedbacks')
          .whereRaw('YEAR(created_at) = ?', [year])
          .count('id as total');
        const seq = String(count[0].total + 1).padStart(5, '0');
        return { feedback_code: `FB-${year}-${seq}` };
        
  - id: create-event
    type: create_data
    options:
      collection: feedback_events
      payload:
        feedback_id: "{{$trigger.key}}"
        event_type: created
        event_data: "{{$trigger.payload}}"
        actor_id: "{{$trigger.accountability.user}}"
        actor_type: "{{$trigger.accountability.role == null ? 'system' : 'human'}}"
        
  - id: check-priority
    type: condition
    options:
      filter:
        _and:
          - priority: { _in: [urgent, critical] }
          
  - id: notify-admin
    type: mail
    options:
      to: ["admin@example.com"]
      subject: "[{{$trigger.payload.priority}}] New Feedback: {{$trigger.payload.title}}"
```

### 5.3 Critical Alert Configuration

```yaml
# Critical Alert Configuration
critical_alert:
  description: |
    Cơ chế "Treo cờ Đỏ" - bypass normal review flow cho entities quan trọng
    
  trigger_conditions:
    - entity_tags_contain: ["protected", "critical", "sensitive"]
    - entity_types: ["doc:constitution", "doc:law"]  # Specific entity refs
    - feedback_types: ["complaint", "security_issue"]
    
  notification_channels:
    primary: telegram  # Fastest
    secondary: email
    tertiary: slack
    
  escalation:
    if_no_response_in: 30m
    escalate_to: owner
    
  audit:
    log_all_alerts: true
    require_acknowledgment: true
```

---

## 6. API ENDPOINTS

### 6.1 Feedback CRUD

```yaml
# Tất cả qua Directus REST API

# Create Feedback
POST /items/feedbacks
Body:
  feedback_type: "comment"
  title: "Suggestion for improvement"
  content: "..."
  context_data: {...}
  location_data: {...}

# List Feedbacks (with filters)
GET /items/feedbacks?filter[status][_eq]=open&sort=-created_at&limit=20

# Get Single Feedback (with links)
GET /items/feedbacks/{id}?fields=*,links.feedback_links.*

# Update Feedback
PATCH /items/feedbacks/{id}
Body:
  status: "in_review"

# Submit Gate Review
PATCH /items/feedbacks/{id}
Body:
  review_gates: [...updated gates...]
  current_gate: 2
```

### 6.2 Link Management

```yaml
# Link Entity to Feedback
POST /items/feedback_links
Body:
  feedback_id: "fb-xxx"
  linked_entity_type: "doc"
  linked_entity_id: "doc-123"
  linked_entity_ref: "doc:doc-123"
  link_type: "primary"

# Unlink (Soft Delete)
PATCH /items/feedback_links/{id}
Body:
  is_active: false
  unlinked_at: "2026-01-30T..."
  unlinked_by_id: "user-xxx"
```

### 6.3 Nuxt Server Routes (Cần code - Phase 2)

```typescript
// server/api/feedback/submit.post.ts
// Handles: Web form submission, anonymous handling, location detection

// server/api/feedback/[id]/link.post.ts
// Handles: Link entity to feedback

// server/api/feedback/[id]/review.post.ts
// Handles: Gate review submission

### 6.4 Context-Aware Entity Linking (Auto-fill)

NGUYÊN TẮC: User không cần gõ/chọn ID bằng tay

┌─────────────────────────────────────────────────────────────────────┐
│                    AUTO-FILL ENTITY REF FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: User đang xem trang                                         │
│  ────────────────────────────                                        │
│  URL: /docs/system-architecture                                      │
│  Nuxt page có access tới: doc.id = "abc-123"                        │
│                                                                      │
│  STEP 2: User click "Góp ý" button                                   │
│  ────────────────────────────────                                    │
│  FeedbackForm component tự động nhận props:                          │
│  - entity_type: "doc"                                                │
│  - entity_id: "abc-123"                                              │
│  - entity_ref: "doc:abc-123"                                         │
│  - entity_name: "System Architecture"                                │
│                                                                      │
│  STEP 3: Form submit                                                 │
│  ───────────────────                                                 │
│  1. POST /items/feedbacks → create feedback                          │
│  2. POST /items/feedback_links → auto-create link                    │
│     với entity_ref đã có sẵn                                         │
│                                                                      │
│  USER KHÔNG CẦN:                                                     │
│  ✗ Gõ ID tài liệu                                                    │
│  ✗ Chọn từ dropdown                                                  │
│  ✗ Copy-paste reference                                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

IMPLEMENTATION (Nuxt Component):

```vue
<!-- FeedbackButton.vue - Đặt ở mọi trang có thể góp ý -->
<template>
  <button @click="openFeedback">Góp ý</button>
</template>

<script setup>
const props = defineProps({
  entityType: String,  // 'doc', 'task', 'customer'...
  entityId: String,    // UUID của entity
  entityName: String   // Display name
})

// Auto-generate entity_ref
const entityRef = computed(() => 
  `${props.entityType}:${props.entityId}`
)

// Pass to FeedbackForm
const openFeedback = () => {
  // Form sẽ có sẵn context, không cần user điền
}
</script>
```

SUPPORTED CONTEXTS:
- /docs/[slug] → entity_type: "doc"
- /tasks/[id] → entity_type: "task"  
- /customers/[id] → entity_type: "customer"
- /cases/[id] → entity_type: "case"
- / (homepage, no context) → entity_ref: null (general feedback)
```

---

## 7. PERMISSIONS MATRIX

### 7.1 Role-Based Access Control

```
┌──────────────┬─────────┬─────────┬─────────┬─────────┬──────────────┐
│    Role      │ Create  │  Read   │ Update  │ Delete  │    Notes     │
├──────────────┼─────────┼─────────┼─────────┼─────────┼──────────────┤
│ Public       │   ✅*   │   ✅**  │   ❌    │   ❌    │ *Anonymous   │
│ (Anonymous)  │         │         │         │         │ **Resolved   │
├──────────────┼─────────┼─────────┼─────────┼─────────┼──────────────┤
│ Authenticated│   ✅    │   ✅*** │   ✅****│   ❌    │ ***Own +     │
│ (User)       │         │         │         │         │    Resolved  │
│              │         │         │         │         │ ****Own only │
├──────────────┼─────────┼─────────┼─────────┼─────────┼──────────────┤
│ Agent        │   ✅    │   ✅    │   ✅    │   ❌    │ Gate 1 only  │
│ (Claude/     │         │         │         │         │              │
│  Codex)      │         │         │         │         │              │
├──────────────┼─────────┼─────────┼─────────┼─────────┼──────────────┤
│ Admin        │   ✅    │   ✅    │   ✅    │   ✅    │ Full access  │
│              │         │         │         │         │ All gates    │
└──────────────┴─────────┴─────────┴─────────┴─────────┴──────────────┘
```

### 7.2 Field-Level Permissions

```yaml
Agent Role:
  feedbacks:
    create: all fields except [resolution, status: resolved/archived]
    read: all fields
    update:
      - review_gates (only gate where required_role = 'agent')
      - status (only: open → in_review)
      - history (append only)
      
  feedback_links:
    create: all fields
    read: all fields
    update: none
    
  feedback_events:
    create: all fields
    read: all fields
    update: none
```

---

## 8. MIGRATION PLAN

### 8.1 Phase 1: Foundation (WEB-27)

| Task | Type | Priority | Est. Time |
|------|------|----------|-----------|
| Rename doc_reviews → feedbacks | Config | P0 | 15 min |
| Add new fields to feedbacks | Config | P0 | 30 min |
| Create feedback_links collection | Config | P0 | 20 min |
| Create feedback_events collection | Config | P0 | 20 min |
| Setup Directus Flows (1-4) | No-Code | P0 | 45 min |
| Configure RBAC | Config | P0 | 30 min |
| Migrate existing data | Script | P1 | 30 min |
| Documentation | Docs | P1 | 30 min |

**Total: ~4 hours**

### 8.2 Phase 2: Web Integration (WEB-28) - **NEEDS CODE APPROVAL ✅ APPROVED**

| Task | Type | Priority | Est. Time |
|------|------|----------|-----------|
| FeedbackForm.vue component | Code | P0 | 2 hours |
| FeedbackPanel.vue component | Code | P0 | 2 hours |
| Server routes (submit, link, review) | Code | P0 | 2 hours |
| Anonymous handling flow | Code | P1 | 2 hours |
| Location detection integration | Code | P1 | 1 hour |
| UI tests | Code | P1 | 2 hours |

**Total: ~11 hours**

### 8.3 Phase 3: Automation (WEB-29+)

| Task | Type | Priority | Est. Time |
|------|------|----------|-----------|
| MCP integration | Config + Code | P1 | 4 hours |
| SLA monitoring flow | No-Code | P2 | 2 hours |
| Analytics dashboard | No-Code | P2 | 3 hours |
| Notification system | No-Code | P2 | 2 hours |

---

## 9. APPENDIX

### 9.1 Entity Type Registry

```yaml
# Danh sách Entity Types được hỗ trợ
# Có thể mở rộng bằng cách thêm vào enum

entity_types:
  # === KNOWLEDGE ===
  doc:
    description: "Tài liệu tri thức"
    collection: agent_views
    
  # === OPERATIONS ===
  task:
    description: "Công việc"
    collection: tasks (future)
    
  process:
    description: "Quy trình"
    collection: processes (future)
    
  # === CRM ===
  customer:
    description: "Khách hàng"
    collection: customers (future)
    
  case:
    description: "Vụ việc/Ticket"
    collection: cases (future)
    
  # === HR ===
  person:
    description: "Nhân sự/Ứng viên"
    collection: persons (future)
    
  # === COMMUNICATION ===
  conversation:
    description: "Hội thoại"
    collection: conversations (future)
    
  # === OTHER ===
  project:
    description: "Dự án"
    collection: projects (future)
    
  product:
    description: "Sản phẩm"
    collection: products (future)
    
  order:
    description: "Đơn hàng"
    collection: orders (future)
    
  campaign:
    description: "Chiến dịch"
    collection: campaigns (future)
    
  event:
    description: "Sự kiện"
    collection: events (future)

  feedback:
    description: "Feedback khác (cho reply/mention)"
    collection: feedbacks
```

### 9.2 Status Transition Rules

```
┌───────────────────────────────────────────────────────────────────┐
│                    STATUS STATE MACHINE                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  draft ─────────────▶ open ─────────────▶ in_review               │
│    │                   │                      │                    │
│    │                   │                      ▼                    │
│    │                   │                 processing                │
│    │                   │                      │                    │
│    │                   │                      ▼                    │
│    │                   └──────────────▶ resolved ◀─────────┘      │
│    │                                         │                     │
│    ▼                                         ▼                     │
│  cancelled                              archived                   │
│                                                                    │
│  ALLOWED TRANSITIONS:                                              │
│  - draft → open, cancelled                                         │
│  - open → in_review, resolved, cancelled                           │
│  - in_review → processing, open (reject)                           │
│  - processing → resolved, in_review (needs more review)            │
│  - resolved → archived, open (reopen)                              │
│  - cancelled → (terminal)                                          │
│  - archived → (terminal)                                           │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

### 9.3 SLA Configuration (Future)

```yaml
sla_config:
  default:
    first_response:
      low: 48h
      normal: 24h
      high: 8h
      urgent: 2h
      critical: 30m
      
    resolution:
      low: 7d
      normal: 3d
      high: 1d
      urgent: 4h
      critical: 2h
      
  by_feedback_type:
    complaint:
      first_response: 1h
      resolution: 24h
```

### 9.4 Content Snapshot Policy

```yaml
content_snapshot_policy:
  purpose: |
    Lưu trữ "ảnh chụp" nội dung tại thời điểm feedback được tạo,
    đảm bảo context không bị mất khi tài liệu gốc thay đổi.
    
  rules:
    always_capture:
      - content_hash: true  # Always
      - content_preview: true  # Max 500 chars
      - entity_metadata: true  # Title, version, etc.
      
    conditionally_capture_full:
      - max_size: 10KB
      - entity_types: [doc, process, task]
      - exclude: [file, image, video, attachment]
      
    retention:
      duration: forever  # Không xóa snapshot
      storage: inline (JSON)  # Lưu trong context_data
      
  verification:
    - On feedback view: Compare current content_hash với snapshot
    - If changed: Show indicator "⚠️ Nội dung đã thay đổi từ lúc góp ý"

UI BEHAVIOR - CONTENT CHANGE WARNING:

┌─────────────────────────────────────────────────────────────────────┐
│                    SNAPSHOT COMPARISON UI                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WHEN DISPLAYING FEEDBACK:                                           │
│  ─────────────────────────                                           │
│                                                                      │
│  1. Fetch current content của linked entity                          │
│  2. Generate current_content_hash                                    │
│  3. Compare với snapshot.content_hash                                │
│                                                                      │
│  IF MATCH (content unchanged):                                       │
│  └── Display feedback bình thường                                    │
│                                                                      │
│  IF MISMATCH (content changed):                                      │
│  └── Display warning banner:                                         │
│                                                                      │
│      ┌─────────────────────────────────────────────────────┐        │
│      │ ⚠️ Nội dung đã thay đổi từ lúc góp ý                │        │
│      │                                                      │        │
│      │ Góp ý này được tạo khi tài liệu ở phiên bản khác.  │        │
│      │ Nội dung gốc có thể không còn chính xác.           │        │
│      │                                                      │        │
│      │ [Xem nội dung gốc] [Đóng]                           │        │
│      └─────────────────────────────────────────────────────┘        │
│                                                                      │
│  "XEM NỘI DUNG GỐC" ACTION:                                          │
│  └── Show modal với content_preview hoặc content_full                │
│      từ snapshot                                                     │
│                                                                      │
│  VISUAL INDICATORS:                                                  │
│  └── 🟢 Content unchanged: No indicator                              │
│  └── 🟡 Content changed: Yellow warning badge                        │
│  └── 🔴 Entity deleted: Red "Nguồn đã bị xóa" badge                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

IMPLEMENTATION NOTE:
- Hash comparison chạy client-side để không tốn server resources
- Warning chỉ là informational, không block user
- "Xem nội dung gốc" chỉ available nếu content_full được lưu
```

---

## 10. APPROVAL & SIGN-OFF

| Role | Name | Status | Date |
|------|------|--------|------|
| Product Owner | Huyen | ✅ APPROVED | 2026-01-30 |
| Technical Lead | Opus | ✅ APPROVED | 2026-01-30 |
| Supervisor | Gemini | ✅ REVIEWED | 2026-01-30 |
| Implementation | Claude/Codex | ⏳ PENDING | - |

---

**Document Status:** ✅ APPROVED FOR IMPLEMENTATION

**Next Step:** Gửi lệnh WEB-27 cho Claude Code để triển khai Phase 1 (Foundation)
