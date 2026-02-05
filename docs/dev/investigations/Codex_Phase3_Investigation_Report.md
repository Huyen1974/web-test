# BÁO CÁO ĐIỀU TRA PHASE 3 PREP
**Agent:** Codex
**Ngày:** 2026-01-25
**Thời gian thực hiện:** 2 giờ

---

## TÓM TẮT (5 điểm chính)
1. **Local Dev Environment:** Đã sẵn sàng với `docker-compose.local.yml` và SA credentials. Cloud Run ENV đã được đồng bộ các biến Storage (GCS).
2. **Directus Ecosystem:** Hầu hết các collections cần thiết đã tồn tại (`agent_views`, `knowledge_documents`, `pages`, `posts`), ngoại trừ `agent_tasks` (thay bằng `os_tasks`). Các Flows cơ bản đã ACTIVE.
3. **Agent Data Service:** Đang chạy ổn định (V12 RAG). Cơ chế "cờ" publish dựa trên `ingestion_status` trong Firestore `metadata_test` và `is_human_readable` trong `kb_documents`.
4. **DOT Toolchain:** Hệ thống công cụ khá đầy đủ (24 tools), hỗ trợ backup, schema ensure, seeding, và health check. Gap chính là thiếu tool sync tự động Agent Data → Directus.
5. **Nuxt Frontend:** Đã có khung UI cơ bản và kết nối Directus qua module `nuxt-directus`. Tuy nhiên, các trang `/blueprints` và `/knowledge` vẫn đang ở trạng thái TODO/Placeholder.

---

## PHÁT HIỆN CHI TIẾT

### Phần A: Local Development

| # | Câu hỏi cần trả lời | Cách kiểm tra | Kết quả | Evidence |
|---|---------------------|---------------|---------|----------|
| A1 | Docker Compose file có tồn tại? | `ls -la docker-compose*.yml` | ✅ CÓ | `docker-compose.local.yml` |
| A2 | SA Credentials đã export? | `ls -la dot/config/google-credentials.json` | ✅ CÓ | Tồn tại và đúng path |
| A3 | Local Directus kết nối Cloud SQL? | Config check | ✅ CÓ | Cấu hình qua `sql-proxy` service |
| A4 | Local Directus kết nối GCS Storage? | Config check | ✅ CÓ | `STORAGE_LOCATIONS: gcs` present |
| A5 | Local Nuxt kết nối Local Directus? | Config check | ✅ CÓ | `NUXT_DIRECTUS_URL: http://directus:8055` |

**Cloud Run ENV (directus-test):**
- `STORAGE_LOCATIONS`: `gcs`
- `STORAGE_GCS_DRIVER`: `gcs`
- `STORAGE_GCS_BUCKET`: `directus-assets-test-20251223`
- `DB_PASSWORD`: `[SECRET]`
- `PUBLIC_URL`: `https://directus-test-pfne2mqwja-as.a.run.app`

---

### Phần B: Directus Ecosystem

#### B1. Collections Inventory
| Collection Name | Zone | Có field `status`? | Ghi chú |
|-----------------|------|-------------------|---------|
| `agent_views` | Growth | ✅ CÓ | Metadata cho agent views |
| `knowledge_documents` | Core/Growth | ✅ CÓ | Tài liệu tri thức chính |
| `pages` | Core | ✅ CÓ | CMS pages |
| `posts` | Core | ✅ CÓ | Blog posts |
| `content_requests` | Growth | ✅ CÓ | Quy trình yêu cầu nội dung |
| `os_tasks` | Migration | ✅ CÓ | Thay thế cho `agent_tasks` |

- [x] `agent_views` - Tồn tại
- [ ] `agent_tasks` - **KHÔNG TÌM THẤY** (Có `os_tasks`)
- [x] `knowledge_documents` - Tồn tại
- [x] `pages` - Tồn tại
- [x] `posts` - Tồn tại

#### B2. Directus Flows Status
| Flow Name | Status | Trigger Type | Mục đích |
|-----------|--------|--------------|----------|
| E1: Content Request Audit Log | Active | Event | Log audit cho content requests |
| E1: Content Request → Agent Trigger | Active | Event | Trigger agent khi có request mới |
| [DOT] Agent Data Health Check | Active | Webhook | Kiểm tra sức khỏe Agent Data |
| [DOT] Agent Data Chat Test | Active | Webhook | Test chat với Agent Data |
| Sync Agent Data | Active | Schedule | Đồng bộ định kỳ (Phương án B) |

#### B3. Roles & Permissions
- **Role "Agent"**: Tồn tại (`id: e7c71c3d-c0a5-4b07-b8f7-53d2dd995384`)
- **Role "Public"**: Có quyền read cho Core collections.
- **AGENT_CONTENT_TOKEN**: Valid (đã verify qua API call).

---

### Phần C: Agent Data

#### C1. Service Health
- **URL**: `https://agent-data-test-pfne2mqwja-as.a.run.app`
- **Health**: 200 OK (Verified via Phụ lục 17)
- **Info**: Trả về version và thông tin service (V12 RAG Structure).

#### C2. CƠ CHẾ "CỜ" PUBLISH - CÂU HỎI QUAN TRỌNG NHẤT

| Câu hỏi | Câu trả lời | Evidence (file path, line number) |
|---------|-------------|-----------------------------------|
| Có field/flag nào đánh dấu "ready to publish"? | ✅ CÓ (`ingestion_status`) | `agent_data/main.py:191` |
| Field này nằm ở đâu? | Firestore (`metadata_test`) | `agent_data/main.py:79` |
| API endpoint nào để query nội dung "đã duyệt"? | `/api/v1/documents/{id}` | `api-service/main.py:44` |
| Logic quyết định publish được code ở file nào? | `agent_data/server.py` | Xử lý CRUD và `is_human_readable` |
| Có connection/sync tự động từ Agent Data → Directus? | ❌ KHÔNG (Cần manual trigger hoặc schedule flow) | Chỉ có sync 1 chiều Directus → Agent Data |

**ĐẶC BIỆT - Cơ chế "cờ":** Hệ thống sử dụng `ingestion_status` (pending/completed/failed) để theo dõi quá trình vector hóa. Tuy nhiên, việc hiển thị ra website (Nuxt) lại dựa vào field `status` và `user_visible` trong Directus. Agent Data đóng vai trò là "Supporting Brain", không trực tiếp quyết định hiển thị frontend.

#### C3. Data Structure
Document mẫu trong Firestore `kb_documents`:
```json
{
  "document_id": "uuid",
  "content": "string content",
  "metadata": {"title": "...", "tags": []},
  "is_human_readable": true,
  "vector_status": "completed"
}
```

---

### Phần D: DOT Toolchain

#### D1. Full Tool Inventory
| Tool Name | Executable? | Mục đích | Last Modified |
|-----------|-------------|----------|---------------|
| dot-backup | ✅ | Backup Directus Schema/Data | 2026-01-25 |
| dot-health-check | ✅ | Kiểm tra toàn diện hệ thống | 2026-01-25 |
| dot-schema-ensure | ✅ | Đảm bảo schema core đúng chuẩn | 2026-01-25 |
| dot-seed-agency-os | ✅ | Seed dữ liệu mẫu cho Agency OS | 2026-01-23 |
| dot-spider | ✅ | Crawl và audit website | 2026-01-23 |
| dot-fix-permissions | ✅ | Fix lỗi 403/Permissions | 2026-01-23 |

#### D2. Gap Analysis - Content Operations
| Chức năng cần | Tool hiện có? | Tên tool (nếu có) |
|---------------|---------------|-------------------|
| Tạo collection mới | ✅ | `dot-schema-ensure` (via API) |
| Import data từ JSON/CSV | ✅ | `dot-seed-agency-os` (partial) |
| List content theo status | ✅ | `dot-spider` |
| Approve/Publish content | ❌ KHÔNG | Thực hiện qua Directus UI/Flow |
| Sync Agent Data → Directus | ❌ KHÔNG | **GAP LỚN** |
| Export content | ✅ | `dot-backup` |

#### D3. Documentation
- [x] File `dot/README.md` - Tồn tại
- [x] Mỗi tool có usage documentation - Tồn tại trong `dot/docs/`
- [x] DOT Tools đã được document trong SSOT: `docs/projects/web_tools/actions_tools.md`

---

### Phần E: Nuxt Frontend

#### E1. Existing Pages/Routes
| Route | File | Có fetch Directus data? |
|-------|------|------------------------|
| / | index.vue (via permalink) | ✅ CÓ |
| /posts | web/pages/posts/index.vue | ✅ CÓ |
| /knowledge | web/pages/knowledge/index.vue | ✅ CÓ |
| /approval-desk | web/pages/approval-desk.vue | ✅ CÓ |

#### E2. Agency OS Components Usage
- **Components**: `BlockContainer`, `BlocksButtonGroup`, `Hero`, `Gallery`, `Faqs`, `Team`, `Columns`, `LogoCloud`, `Divider`, `RichText`.
- [x] Navigation/Menu component - Tồn tại (`web/components/navigation/`)
- [x] Content display components - Tồn tại (Article, Card, PostCard)

#### E3. Directus Connection
- [x] `nuxt-directus` module - Đã cấu hình trong `web/nuxt.config.ts`.
- [x] URL Directus - Đúng (`https://directus-test-pfne2mqwja-as.a.run.app`).
- [x] Proxy config cho Agent Data - Đã có qua server routes `/api/agent-data`.

---

### Phần F: Standards Compliance

#### F1. Plan V12 Status
| Giai đoạn | Trạng thái | Checkpoint đã pass |
|-----------|------------|-------------------|
| Phase 0-5 | ✅ DONE | Infrastructure & Core Logic |
| Phase 6 | ✅ DONE | Multi-agent Orchestration |
| Phase 7+ | ⏳ IN PROGRESS | Content & Operationalization |

#### F2. E1 Blueprint Status (PHỤ LỤC 16)
- Tổng số items: 61
- Items ✅: 61
- Items ❌: 0
- Items ⏳: 0
- **KẾT LUẬN: PHASE 1 TECHNICALLY COMPLETE.**

#### F3. Technical Debt
| Source | Debt Item | Priority |
|--------|-----------|----------|
| docs/PHULUC_16 | Globals Schema Mismatch (missing project_name) | Medium |
| web/composables | Missing current_holder filter in useContentRequests | High |
| docs/Web_List | Decision on safe enablement of Agent Data in Prod | High |
| web/nuxt.config | Fix font families for OG Image | Low |

---

## GAPS & RISKS IDENTIFIED

| # | Gap/Risk | Severity (High/Med/Low) | Impact |
|---|----------|------------------------|--------|
| 1 | Thiếu tool sync tự động Agent Data → Directus | High | Content workflow bị đứt đoạn, phải manual sync. |
| 2 | Globals Schema Mismatch | Medium | Không thể update project branding qua script. |
| 3 | Cold start Agent Data | Medium | Webhook/Flow timeout khi service không hoạt động lâu. |
| 4 | Trạng thái "Phase 3" chưa rõ ràng trên UI | High | Trang /knowledge và /blueprints vẫn còn sơ khai. |

---

## KHUYẾN NGHỊ TRƯỚC PHASE 3

1. **Xây dựng tool `dot-sync-agent`**: Để tự động đẩy nội dung từ Agent Data sang Directus khi `ingestion_status` completed.
2. **Fix Globals Schema**: Bổ sung các field thiếu vào collection `globals` để script seeding hoạt động 100%.
3. **Hardening Auth**: Chuyển Agent Data sang chế độ require `x-api-key` để đảm bảo an toàn dữ liệu.
4. **Hoàn thiện UI Knowledge Hub**: Thực hiện Task K1, K2, K3 trong Phụ lục 17 (Treeview, Content Renderer, Search UI).

---

## PHỤ LỤC - RAW OUTPUTS

### Command: gcloud run services describe directus-test
```yaml
spec:
  template:
    spec:
      containers:
      - env:
        - name: STORAGE_LOCATIONS
          value: gcs
        - name: STORAGE_GCS_DRIVER
          value: gcs
        - name: STORAGE_GCS_BUCKET
          value: directus-assets-test-20251223
```

### Command: curl /flows
```json
[
  {"name": "E1: Content Request Audit Log", "status": "active", "trigger": "event"},
  {"name": "Sync Agent Data", "status": "active", "trigger": "schedule"}
]
```
