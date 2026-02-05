# BUSINESS_OS_BLUEPRINT
**Status:** Draft (SSOT Blueprint)  
**Owner:** web-test repo (GitHub = SSOT)  
**Last updated:** 2026-01-27  
**⚠️ DO NOT DELETE:** This file is required. If GitHub Actions guard is enabled, deleting it must fail CI.

---

## 1) North Star
Xây dựng một “Business OS” tự động tối đa trên nền web, nơi:
- **GitHub (repo `web-test`) = SSOT** cho tài liệu/kế hoạch/quy trình.
- **Nuxt = màn hình** để con người đọc/duyệt/comment.
- **Agent Data = bộ não** (index, điều phối, trạng thái quy trình, ngữ cảnh cho Agents/Models).
- **Directus = lớp UI dữ liệu có cấu trúc (tuỳ chọn)**; không nên nằm trong đường đọc docs thuần Markdown nếu không bắt buộc.

Mục tiêu dài hạn: giảm tối đa copy-paste, giảm số “bản sao dữ liệu”, tăng tự động hoá dựa trên quy trình chuẩn.

---

## 2) Đối tượng tham gia (Actors)
1. **Con người**: chỉ đọc/duyệt/comment trên Nuxt.
2. **Agent thương mại** (Claude Desktop, Cursor/Codex, Antigravity…): tham gia soạn thảo qua API/MCP, tạo branch/PR, cập nhật PR.
3. **Agent tự tạo**: xử lý nghiệp vụ chuyên biệt (CSKH, kiểm tra tiến độ…), chạy theo sự kiện.
4. **AI Models (Reviewer/Reader)**: đọc nội dung qua link (Context URL) để phản biện/soát lỗi mà không cần paste nội dung.

---

## 3) Nguyên tắc thiết kế (Principles)
- **GitHub PR = vùng nháp chuẩn** (thay vì copy nháp sang nơi khác).
- **Một nguồn chân lý**: `web-test` main branch là bản chính thức.
- **Giảm tầng đồng bộ**: càng nhiều bước copy GH → Agent Data → Directus → Nuxt càng dễ drift.
- **Event-driven** (dài hạn): “gọi là chạy” thay vì lập lịch thủ công.
- **Tối ưu chi phí và rủi ro**: ưu tiên reuse nền tảng có sẵn (GitHub workflow/PR/comments), hạn chế tự phát minh quy trình mới.

---

## 4) Kiến trúc tối giản đề xuất
### 4.1 Docs (tri thức dùng chung) — đọc trực tiếp từ GitHub
**Khuyến nghị:** Nuxt hiển thị docs trực tiếp từ repo `web-test` thông qua một lớp API mỏng (Docs API):
- `GET /tree?ref=main&path=docs/` → trả cây thư mục + file
- `GET /file?ref=main&path=docs/x.md` → raw content
- Cache theo **commit SHA / ETag** để giảm rate-limit và tăng tốc.

> Kết luận: đạt mục tiêu test “Nuxt hiển thị được toàn bộ treeview + file trong repo web-test” mà **không cần Directus nằm trong đường đọc docs**.

### 4.2 Nháp/Review — dùng GitHub PR thay cho “vùng nháp copy riêng”
**Vùng nháp = GitHub branch/PR**:
- Agent tạo branch → commit → mở PR → update PR.
- Con người review/comment/approve (trên Nuxt UI, nhưng bản chất là PR comments/diff).
- Merge vào main = chính thức.

### 4.3 Agent Data — “não” (index + workflow state), không phải SSOT docs
Agent Data sync từ GitHub để:
- semantic index/search
- context packing (cắt theo token budget)
- lưu trạng thái quy trình (pending/reviewed/approved…), nhật ký tác vụ, điều phối Agents

Nhưng **không coi Agent Data là bản chính thức của docs** (SSOT vẫn là GitHub).

### 4.4 Directus — dùng đúng vai (tuỳ chọn)
Directus phù hợp để:
- hiển thị dữ liệu có cấu trúc (cards, forms, lists)
- mapping dữ liệu nghiệp vụ
Không nên bắt Directus “gánh SSOT docs Markdown” nếu không bắt buộc, vì tạo thêm bản sao + sync rules.

---

## 5) Luồng dữ liệu tối giản (thay cho mô hình 5 bước nhiều bản sao)
### 5.1 Luồng đọc (ai cũng dùng)
**Nuxt → Docs API → GitHub**
- Con người: đọc trên Nuxt
- AI reviewer/reader: dùng “Context Link” để tự tải nội dung raw (không copy-paste)

### 5.2 Luồng sửa (agent-first)
**Agent → GitHub branch/PR**
- Agent làm việc trên branch/PR: sửa, commit, mở PR, update PR.
- Agent Data nhận webhook để index + cập nhật trạng thái.

### 5.3 Luồng comment/approval (con người)
**Nuxt comment → GitHub PR comments**
- Comment của người dùng ghi vào PR (đúng SSOT của thay đổi).
- Approve/merge theo policy (dài hạn có thể tự động hoá qua GitHub App + rules).

---

## 6) “Context Link” để triệt copy-paste cho AI Models
Nuxt cần nút **Copy Context Link** tạo URL kiểu:
- `/context?ref=main&paths=docs/a.md,docs/b.md`
- hoặc `/context?pr=123&paths=...`

Endpoint trả JSON gồm:
- metadata: repo, ref/pr, commit sha, list files
- raw content từng file
- (tuỳ chọn) packed context theo token budget

AI chỉ cần đọc link → gọi API → phân tích.

---

## 7) Phase 1 — Module “Knowledge UI” (DoD rõ ràng)
**Mục tiêu Phase 1 (demo ngay, đặt nền móng dài hạn):**
1. Nuxt hiển thị **treeview** repo `web-test` (main)
2. Click xem nội dung (raw + render markdown)
3. Search tối thiểu (filename); fulltext có thể Phase 1.5
4. Có nút **Copy Context Link**
5. Có “Draft mode”: xem PR list + xem diff + comments (chưa cần merge tự động cũng OK, nhưng phải định hình)

**Deliverables cần chốt với Chief Architect (Opus):**
- Quy ước cấu trúc thư mục docs trong `web-test`
- API contract Docs API: `/tree`, `/file`, `/context`, và (tuỳ chọn) `/prs`, `/pr/{id}/diff`, `/pr/{id}/comment`
- Cache strategy + auth strategy

---

## 8) Nhận xét về mô hình hiện tại (điểm cần tối ưu)
- Ý tưởng tổng thể đúng: SSOT + màn hình + bộ não + agent-first.
- Điểm làm hệ thống dễ bế tắc là **quá nhiều bản sao dữ liệu** (GH → Agent Data → Directus → Nuxt).
- Tối ưu thông minh nhất là:
  - **PR = nháp**
  - **Nuxt = UI của GitHub workflow**
  - **Agent Data = index + điều phối + trạng thái**
  - **Directus = UI dữ liệu có cấu trúc khi thực sự cần**

---

## 9) Next questions (để bàn với Opus)
1. Phase 1: Docs API nên chạy ở Cloud Run hay Cloud Functions? (ưu tiên “mỏng”, có cache)
2. Repo docs là public hay private? Auth strategy cho AI models (Context Link) như thế nào?
3. PR workflow: Nuxt hiển thị PR comments/diff bằng GitHub API hay sync vào DB?
4. Guardrails: branch protection + CODEOWNERS có được bật/enforced không?
