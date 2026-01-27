KNOWLEDGE HUB MVP
"Con Mương Đầu Tiên"
Mục tiêu: Có công cụ tri thức dùng chung để viết kế hoạch/báo cáo tốt hơn Nguyên tắc: Nhỏ nhưng đúng hướng, không đập đi làm lại

SCOPE MVP (Chỉ làm những gì cần thiết)
┌─────────────────────────────────────────────────────────────────────────┐
│                        KNOWLEDGE HUB UI                                 │
│                                                                         │
│  ┌──────────────────┐  ┌────────────────────────────────────────────┐  │
│  │                  │  │                                            │  │
│  │   TREE VIEW      │  │              CONTENT PANEL                 │  │
│  │   (Cột trái)     │  │              (Cột phải)                    │  │
│  │                  │  │                                            │  │
│  │  📁 docs/        │  │  # Kế hoạch Q2 2026                        │  │
│  │  ├─ 📁 plans/    │  │                                            │  │
│  │  │  ├─ q2.md  ◄──┼──┼─ [Đang xem]                                │  │
│  │  │  └─ q3.md     │  │  ## Mục tiêu                               │  │
│  │  ├─ 📁 reports/  │  │  - Launch product X                        │  │
│  │  └─ 📁 process/  │  │  - Expand market Y                         │  │
│  │                  │  │                                            │  │
│  │  [Refresh]       │  │  ─────────────────────────────             │  │
│  │                  │  │  💬 Comments (from Agent Data)             │  │
│  │                  │  │  ┌──────────────────────────┐              │  │
│  │                  │  │  │ @Opus: Cần thêm budget   │              │  │
│  │                  │  │  │ @Codex: Đã review code   │              │  │
│  │                  │  │  └──────────────────────────┘              │  │
│  │                  │  │                                            │  │
│  └──────────────────┘  └────────────────────────────────────────────┘  │
│                                                                         │
│  [Copy Context Link]  [View on GitHub]  [Create PR]                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

3 THÀNH PHẦN CẦN XÂY
1️⃣ DOCS API (Cầu nối GitHub → Nuxt)
Đã có sẵn:
	•	Agent Data service đang chạy
	•	GitHub repo web-test với folder docs/
Cần thêm:
GET /api/docs/tree?ref=main&path=docs/
→ Trả về cấu trúc thư mục

GET /api/docs/file?ref=main&path=docs/plans/q2.md
→ Trả về nội dung file

GET /api/docs/context?paths=docs/plans/q2.md&token_budget=8000
→ Trả về context đóng gói cho AI
Effort: ~2 ngày (extend Agent Data API)

2️⃣ NUXT UI (Giao diện 2 cột)
Đã có sẵn:
	•	Agency OS template
	•	Nuxt SSR đang chạy
	•	Directus connection
Cần thêm:
	•	Page /knowledge với layout 2 cột
	•	Tree component (recursive folder display)
	•	Markdown renderer (content panel)
	•	Comment section (pull from Agent Data)
Effort: ~3 ngày (dùng components có sẵn, NO NEW CODE)

3️⃣ AGENT DATA COMMENTS (Agents tham gia)
Đã có sẵn:
	•	Agent Data Firestore
	•	MCP endpoint
Cần thêm:
	•	Collection doc_comments trong Agent Data
	•	Schema: {doc_path, author, content, created_at, type}
	•	API: POST /api/comments, GET /api/comments?doc_path=...
Effort: ~1 ngày

KHÔNG LÀM TRONG MVP
Feature
Lý do defer
PR creation từ UI
Phức tạp, agents tự tạo được
Inline editing
Cần GitHub App auth
Full-text search
Cần index, làm sau
Version history
GitHub đã có
Real-time collab
Overkill cho MVP

DATA FLOW (Đơn giản)
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  GitHub (SSOT)                                                          │
│  └─ web-test/docs/*.md                                                  │
│           │                                                             │
│           │ GET /api/docs/tree                                          │
│           │ GET /api/docs/file                                          │
│           ▼                                                             │
│  Agent Data (Gateway)                                                   │
│  ├─ Proxy GitHub API (với cache)                                        │
│  └─ Store comments (Firestore)                                          │
│           │                                                             │
│           │                                                             │
│           ▼                                                             │
│  Nuxt (Display)                                                         │
│  └─ /knowledge page                                                     │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Agents (Participants)                                                  │
│  ├─ Claude (via MCP) ──► Agent Data ──► Add comment                    │
│  ├─ Cursor/Codex ──────► Agent Data ──► Add comment                    │
│  └─ Antigravity ───────► Agent Data ──► Add comment                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

IMPLEMENTATION PLAN
Phase 0: Chuẩn bị (Đã xong ✅)
	•	[x] Docker Directus Local chạy
	•	[x] Nuxt SSR deploy
	•	[x] Agent Data service live
	•	[x] Blueprint có tầm nhìn
Phase 1: Docs API (2 ngày)
Day 1:
├─ Extend Agent Data với /api/docs/tree
├─ Extend Agent Data với /api/docs/file
└─ Test với curl/Postman

Day 2:
├─ Add caching (5 min TTL)
├─ Add /api/docs/context
└─ Deploy to Cloud Run
Phase 2: Nuxt UI (3 ngày)
Day 3:
├─ Create /knowledge page
├─ Tree component (sử dụng Agency OS base)
└─ Connect to Docs API

Day 4:
├─ Content panel với Markdown render
├─ Styling 2-column layout
└─ Mobile responsive (optional)

Day 5:
├─ Comments section
├─ Copy Context Link button
└─ Integration test
Phase 3: Agent Comments (1 ngày)
Day 6:
├─ Add doc_comments collection (Agent Data)
├─ API endpoints
├─ Test với Claude Desktop (MCP)
└─ Verify agents có thể comment
Phase 4: Go Live
Day 7:
├─ Final testing
├─ Deploy tất cả
└─ Team bắt đầu dùng

SUCCESS CRITERIA
Metric
Target
Tree view hiển thị đúng
100% folders/files
File content render
Markdown → HTML
Comment hiển thị
< 2s load time
Agent có thể comment
Via MCP hoặc API
Context Link hoạt động
Copy → Paste → AI đọc được

LIÊN KẾT VỚI BUSINESS OS
MVP này là PHASE 2 trong Blueprint:
"Content Pipeline"

Khi MVP hoàn thành:
├─ Có công cụ viết kế hoạch tốt hơn
├─ Agents có thể tham gia review
├─ Context sharing không còn copy-paste
└─ Foundation cho các phases tiếp theo

Mở rộng sau (thành sông):
├─ PR creation workflow
├─ Full document lifecycle
├─ Agent orchestration
└─ 100+ custom agents

BẮT ĐẦU NGAY
Bước 1: Xác nhận scope MVP này OK? Bước 2: Bắt đầu Phase 1 (Docs API) Bước 3: Song song chuẩn bị UI components
Ai làm gì:
	•	Opus: Orchestrate, review
	•	Codex: Implement Docs API
	•	Claude Code: Implement Nuxt UI
	•	Antigravity: Document & test
