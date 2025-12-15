# Giai đoạn E1 – Content Operations & Agent Workflows (ĐỀ BÀI)

> **Tài liệu yêu cầu (Requirements) – Format lại toàn bộ theo chuẩn Markdown, giữ nguyên nội dung và bố cục logic.**

---

## 0. MỤC TIÊU CỐT LÕI & BỐI CẢNH

Đây là 5 mục tiêu chiến lược của Giai đoạn E1, đóng vai trò "hiến pháp" cho toàn bộ phần kỹ thuật phía sau. Mọi yêu cầu chi tiết phải phục vụ các mục tiêu này.

1. **Collaboration Workspace – Nơi làm việc chung giữa Người & Máy**

   *Mục tiêu:* Xóa bỏ ranh giới giữa Người và Máy; hệ thống không chỉ là kho lưu trữ mà là cái bàn để làm việc.

   *Tiêu chí đạt:* Agent và Con người cùng thao tác trên một văn bản. Agent viết nháp, Con người sửa/duyệt, Agent học hỏi và sửa tiếp. Tất cả diễn ra trên cùng một giao diện, minh bạch ai làm gì.

2. **Closed Loop Workflow – Quy trình không lọt việc (Closed Loop & Async Control)**

   *Mục tiêu:* Kiểm soát toàn bộ vòng đời của một yêu cầu, từ lúc ý tưởng manh nha đến khi xuất bản, bất kể thời gian chờ đợi là bao lâu.

   *Tiêu chí đạt:* Không bao giờ có chuyện "giao việc cho Agent rồi quên". Hệ thống phải có Dashboard nhắc việc: "Cái này Agent đang làm", "Cái này chờ Sếp duyệt". Mọi yêu cầu đều phải đi đến trạng thái cuối cùng (Done/Cancel).

3. **Contextual Intelligence – Viết lách dựa trên tri thức thực**

   *Mục tiêu:* Chấm dứt cảnh Agent "chém gió" (hallucination) hoặc viết lại những thứ đã có.

   *Tiêu chí đạt:* **Contextual Intelligence**: Agent BẮT BUỘC phải gọi API Search (`/search` của Agent Data V12/Qdrant) để lấy dữ liệu liên quan trước khi thực hiện bất kỳ lệnh viết (Draft) nào. Nghiêm cấm viết "mù" (Zero-shot).
    * **Bắt buộc**: Chạy bước "tìm & tổng hợp context" từ Agent Data/Directus (search + lọc xung đột) trước khi Agent viết Draft. Context lưu log/metadata (Revisions/Comments) để Người/Agent khác xem "Agent đã đọc gì".
    * **Cấm zero-shot**: Trước khi Agent viết/sửa Draft, bắt buộc gọi Search Agent Data/Directus để lấy/tóm tắt context liên quan, lọc xung đột; lưu context (comment/log Revisions) làm căn cứ minh bạch.
    * **Ràng buộc bắt buộc**: Trước soạn thảo/sửa Draft, hệ thống chạy tìm kiếm context (Agent Data/Directus); không cho phép viết mù (zero-shot) dựa prompt trống. Context dùng log lại (comment/revision) để tra "Agent đã đọc gì".

4. **One-Touch UX – Trải nghiệm Con người một chạm**

   *Mục tiêu:* Tiết kiệm tối đa thời gian não bộ và thao tác của con người.

   *Tiêu chí đạt:* **Giao diện phê duyệt 1-chạm**: Diff side-by-side (Directus Revisions iframe read-only); Comment inline form (gọi Comments API, no sidebar); Actions: Nút lớn `[Approve]` (1-click trigger Directus Flow publish + update status) / `[Request Change]` (gửi Pub/Sub envelope đến Agent). Không form phức tạp hay CLI.
    * **1 màn hình chuyên dụng**: Approval Desk hiển thị Diff + Comment inline + 2 nút lớn; không tab/bước trung gian (giữ One-Touch, no-code embed Directus).
    * **Trên Document Detail**: Hành động chính kiểu "1-2 nút lớn" (e.g., "Phê duyệt", "Yêu cầu sửa") – tránh nhiều bước lắt nhắt / dialog lồng nhau (giữ One-Touch).
    * **RBAC UI**: Ẩn/disable hành động vượt quyền (Agent không thấy Publish; Editor không sửa schema). Hành động nhạy cảm (Publish/Archive) qua Editor/Admin, không đường tắt.
    * **Approval Desk**: Diff (reuse Revisions) + Comment inline + 2 nút lớn. Form nhập liệu phức tạp reuse Directus Admin (Dynamic Forms). Nuxt chỉ màn hình chuyên dụng (Approval Desk/My Tasks/Graph), không build form engine mới.

5. **Anti-Stupid Architecture – Kiến trúc lắp ráp & tận dụng (No-code-first)**

   *Mục tiêu:* Đạt được 4 mục tiêu trên với chi phí code và bảo trì thấp nhất.

   *Tiêu chí đạt:* Cần Log? Dùng Directus Revisions. Cần Quy trình? Dùng Directus Flows. Cần Chat/Trao đổi? Dùng Directus Comments. Tuyệt đối không viết code mới cho những thứ nền tảng đã có sẵn.

**Bối cảnh E1**:

Các khối A, B, E đã hoàn thành và được đánh dấu ổn định bằng tag **v1.2.0-content-engine**. Tuy nhiên hệ thống mới chỉ có **bộ máy lõi**, chưa hình thành **không gian làm việc chung** giữa Người – AI – Agent.

**E1 ra đời để giải quyết khoảng trống này**, chuyển hệ thống từ “Content Engine” sang **Content Operations Floor**:

* Agent/AI làm phần việc nặng: tìm, soạn, gợi ý, kiểm tra.
* Người dùng chỉ tập trung vào quyết định cuối cùng.
* Mọi trạng thái, backlog và xung đột được kiểm soát bằng cơ chế rõ ràng.

---

## 1. Nguyên tắc & Ràng buộc

1. **Không phá vỡ thành quả Phase A/B/E** – chỉ bổ sung, chỉ sửa khi có sai rõ ràng.
2. **Tuân thủ Luật Data Flow v1.1**:

   * 3 Zone: Core / Migration / Growth.
   * Không chạm Core Zone.
   * MySQL-first.
   * Không viết script tuỳ tiện.
3. **Agent-first nhưng Human quyết định cuối**:

   * Agent làm draft, Human duyệt.
4. **Full Async – No Lost Work**:

   * Không tồn tại yêu cầu bị thất lạc.
5. **SSOT rõ ràng theo loại dữ liệu**:

   * Agent Data/Qdrant: tri thức & vector.
   * Directus: content chính thức, versioning.
   * Nuxt: hiển thị, không là nơi lưu dữ liệu.
6. **Serverless-first**:

   * Cloud Run / Functions / Workflows, Secret Manager.
7. **Anti-Stupid**:

   * **Nếu Directus/Agency OS đã có feature → bắt buộc dùng trước**.
   * Không tự dựng backend mới nếu không bắt buộc.
   * Directus/Agency OS (Flows/Dashboards/Comments) trước, backend mới (code) sau – chỉ nếu no-code không đáp ứng (kiểm tra docs trước).
8. **Agent CLI là Passive**:

   * Cursor, Claude, Codex, Antigravity không “luôn chạy”.
   * Chỉ chạy khi được trigger (User hoặc Job).

---

## 2. Phạm vi của Giai đoạn E1

### 2.1. Trong phạm vi

* Kết nối Agent Data → Web (Nuxt) theo Data Laws.
* Quy trình soạn thảo – phê duyệt – xuất bản.
* Dashboard vận hành & trạng thái bất đồng bộ.

**Bổ sung: Tổng hợp & Báo cáo vận hành (Operational Reporting)**

* Hệ thống phải cung cấp **các báo cáo tổng hợp theo tuần/tháng/quý**, bao gồm:

  * Số lượng nội dung được **tạo mới**.
  * Số lượng nội dung được **sửa đổi** (draft → review → approve).
  * Phân bổ khối lượng công việc theo **tác nhân**:

    * Con người (Reviewer/Approver).
    * Agent hệ thống (Cursor/Claude/Codex/Antigravity).
    * Agent Langroid tự build.
  * Tổng hợp thời gian xử lý trung bình cho từng bước workflow.

* Báo cáo điều hành phải chỉ rõ **trạng thái hiện tại của toàn hệ thống**:

  * Bao nhiêu nội dung **đang chờ được xem xét**.
  * Bao nhiêu nội dung **đang chờ phê duyệt**.
  * Bao nhiêu nội dung **đã đủ điều kiện public nhưng chưa public**.
  * Bao nhiêu Request **chưa có ai nhận xử lý** (Agent chưa vào draft).

* Báo cáo phải hỗ trợ **lọc theo**:

  * Thời gian.
  * Loại nội dung.
  * Người phụ trách.
  * Agent phụ trách.

* **Operational Reporting**: Dùng **Directus Dashboards** (tính năng built-in no-code) để filter metrics (số lượng nội dung tạo/phê duyệt theo tuần/tháng). Thiết lập Flow để auto-export CSV/PDF định kỳ nếu cần. Tuyệt đối không code dashboard riêng trên Nuxt.

**Hạ tầng kết nối**: Kết nối Async giữa Nuxt (User) và Agent Data (AI) thông qua **Google Cloud Workflows & Pub/Sub**. Loại bỏ cơ chế Polling thủ công để tối ưu chi phí và tốc độ.

Vue Flow

---

### **Trụ cột 2 – “Bản đồ Tri thức” (Visualization / Graph View — BỔ SUNG QUAN TRỌNG)**

Hệ thống phải cung cấp chế độ xem **Graph View** để người dùng nhìn toàn cảnh mối quan hệ giữa các tài liệu.

#### Yêu cầu UI/UX:

* Sử dụng **Vue Flow** phía Nuxt.
* Tự động vẽ sơ đồ dựa trên:

  * `parent_document_id`
  * Các trường tham chiếu (`references`, `related_links`).
* Node = tài liệu / quy trình / chính sách.
* Edge = quan hệ cha–con hoặc tham chiếu.
* Không tạo schema mới — chỉ map từ dữ liệu Directus.

#### Mục tiêu:

* Giảm tải nhận thức cho User.
* Thấy được cấu trúc “hệ tri thức” thay vì đọc List View dài.

---

(read-only) mức MVP. (read-only) mức MVP.

### 2.2. Ngoài phạm vi

* Search nâng cao.
* Analytics nâng cao.
* Mobile App.
* Luồng pháp lý ngoài hệ thống.

---

## 3. Yêu cầu nghiệp vụ chi tiết

### **Trụ cột 1 – “Đôi mắt của Agent” (Search & Context Strategy — BỔ SUNG QUAN TRỌNG)**

Trước khi bất kỳ Agent nào thực hiện nhiệm vụ soạn thảo hoặc sửa đổi, **bắt buộc phải có bước Tìm kiếm (Research)**. Đây là điều kiện đầu vào của toàn bộ quy trình.

#### Yêu cầu kỹ thuật:

* Tích hợp **API Search** từ Agent Data (Qdrant Semantic Search thông qua các module như `DocChatAgent` theo Plan V12, hoặc Keyword Search từ Directus theo nhu cầu cụ thể).
* Agent phải:

  1. Nhận mục tiêu nội dung.
  2. Gọi Search API để lấy danh sách các văn bản liên quan.
  3. Đọc, tóm tắt và ghi lại bối cảnh vào comment (format signature `[Agent_Name]`).
* Hệ thống phải bảo đảm rằng *KHÔNG Agent nào* được phép viết mà không có dữ liệu tham chiếu: trước mỗi lần soạn thảo, Agent bắt buộc phải gọi API Agent Data (Langroid/Qdrant) để lấy context phù hợp; không cho phép viết "mù" (zero-shot) dựa trên prompt trống.

#### Mục tiêu:

* Tránh mâu thuẫn giữa văn bản mới và văn bản cũ.
* Tăng chất lượng reasoning.
* Tự động hóa bước “tra cứu tài liệu nền tảng”.

---

### 3.1. (Đã làm rõ ở trên — bổ sung Search Strategy bắt buộc)

### 3.1. Lớp hiển thị & khai thác dữ liệu Agent Data → Web

**Mục tiêu:**

* Chỉ hiển thị dữ liệu cần cho quyết định.
* Không rác kỹ thuật.
* Không lộ thông tin nhạy cảm.

**Yêu cầu:**

#### View Models

* `ContentRequestView`
* `DocumentSummaryView`
* `WorkflowItemView`
* `AgentActivityView`

#### Summary & Provenance

* Mọi nội dung Agent đề xuất phải có tóm tắt + nguồn.

#### Map dữ liệu phức tạp → đơn giản
 
 * Từ vector/chunk → View Model.
 
 #### Quản lý Folder
 
 * **Quản lý Folder**: Không tạo bảng mới. Sử dụng chính bảng `knowledge_documents` với trường quan hệ tự tham chiếu `parent_id` để tạo cấu trúc cây thư mục (Giống Google Drive).

#### Auto-Graph bằng Vue Flow

* Dựa trên:

  * `parent_document_id`
  * `references`
  * `related_links`
* Không tạo schema mới cho graph.

#### Zone Filtering

* Tuân thủ luật 3 Zone.
* Chỉ hiển thị `published + user_visible = true`.

---

### 3.2. Quy trình soạn thảo – phê duyệt – xuất bản

#### **Cơ chế Trigger – Mô hình "Hòm thư" (Làm rõ hoàn toàn)**

* Nuxt **KHÔNG** gọi trực tiếp Agent.
* Nuxt chỉ cập nhật trạng thái bản ghi trong Directus, ví dụ:

  * **Bảng content_requests**: Đây là bảng mới thuộc **Growth Zone** (theo Luật Data v1.1). Chứa các trường: `title`, `requirements`, `status` (new, drafting, review...), và `current_holder` (Enum: user, agent_claude, agent_codex...). Được phép chỉnh sửa schema thoải mái.
   * Gán `agent_status = "pending"` cho bản ghi `content_requests` vừa tạo.
   * (Tuỳ trường hợp có thể dùng thêm bảng `agent_tasks`, nhưng `content_requests` là điểm vào chuẩn cho mọi yêu cầu nội dung).
* Agent (Cursor/Codex/Claude/Antigravity hoặc Langroid Agent) chạy ở **CLI hoặc Cron**, thực hiện:

  1. **Event-Driven Trigger (Kiến trúc chính)**: Khi `content_requests` có bản ghi mới (hoặc update) → **Directus Webhook** gọi **Google Cloud Workflows** → Đẩy tin nhắn vào **Pub/Sub** → Kích hoạt **Agent Data (Langroid)**. Cơ chế Polling chỉ là dự phòng (fallback).
3. Nếu thấy task có `agent_status = "pending"` → nhận xử lý.
4. Xử lý xong → cập nhật lại trạng thái (`awaiting_review`, log, comment...).

> **Lý do:** Phù hợp hạ tầng hiện tại (CLI-based), tránh over-engineering queue/webhook.

#### Định nghĩa đối tượng

* **Content Request**: `new → assigned → drafting → awaiting_review → awaiting_approval → published/rejected`.
* **Document Version**: dùng workflow Phase E.

#### Quy trình xử lý

1. User tạo yêu cầu.
2. Nuxt gán trạng thái: `agent_status = "pending"`.
3. Agent nhận tín hiệu Pub/Sub → nhận task.
4. Agent xử lý & tạo Draft trong Directus (`draft`).
5. Chuyển sang `awaiting_review`.
6. Reviewer comment → Agent sửa.
7. Approver duyệt → `published`.
8. Khi Approver bấm **“Request Change”** trên UI phê duyệt, hệ thống cập nhật lại trạng thái (ví dụ: `agent_status = "drafting"`) và ghi comment mới vào `directus_comments`. Agent CLI chỉ nhận sửa lại khi thấy bản ghi `content_requests` ở trạng thái `drafting` **và** có comment mới, dùng chính `status` + comment làm tín hiệu chuyển bóng trong vòng lặp phản hồi; việc cập nhật trạng thái này được cấu hình bằng **Directus Flows** (no-code), không cần viết thêm code xử lý riêng ở Nuxt hoặc backend Python.

#### Trường “Ai đang giữ bóng?”

* Field: `current_holder`:

  * Agent đang xử lý.
  * Reviewer.
  * Approver.
* Trường `current_holder` là một trường dạng string nằm trong collection `content_requests` (Growth Zone), dùng để thể hiện rõ "ai đang giữ bóng" mà không chạm vào Core Zone.
* Dashboard phải dựa trên thông tin này.

---

### 3.3. Dashboard & Giám sát vận hành

#### Hàng đợi tối thiểu

* Chờ Agent (chưa có draft).
* Chờ Reviewer.
* Chờ Approver.

#### Chức năng Dashboard

* Biểu đồ số lượng Request theo trạng thái: Sử dụng Panel chuẩn trong **Directus Dashboards** (No-code).
* Danh sách tài liệu nghẽn.
* Badge màu cảnh báo quá hạn.
* Filter theo người phụ trách / loại content.
* Trang **“My Dashboard” (Bàn làm việc của tôi)** là điểm vào chính với widget **“My Tasks”**: tối thiểu có hai cột rõ ràng:

  * **Waiting for Me** – các Request đang chờ tôi duyệt/xử lý (Reviewer/Approver đang giữ bóng).
  * **Waiting for Agent** – các Request tôi đã giao, Agent đang xử lý.
    Một click vào item ở cột **Waiting for Me** phải đưa thẳng tới màn hình Diff/Approve tương ứng (One-touch).

---

### 3.4. Hợp tác đa Agent & Comments / Responsibility

#### Danh tính Agent – Đơn giản hóa theo "Chữ ký"

* **Không tạo nhiều Virtual Users**, không quản lý nhiều Token riêng cho từng Agent.
* Hạ tầng chỉ cần **01 Token duy nhất cho tự động hóa** (có thể là Admin Token hoặc một user duy nhất kiểu `system-bot`).
* Mọi thao tác tự động (Agent ghi comment, cập nhật trạng thái...) đều dùng chung Token này.

#### Cơ chế định danh: In-text Signature

* Mỗi Agent (Claude, Codex, Cursor, Antigravity, Langroid Agent...) **bắt buộc** khi ghi comment/log vào Directus phải dùng chuẩn:

  * `[<Agent_Name>] Nội dung...`
* Ví dụ:

  * `[Claude] Tôi phát hiện mâu thuẫn ở điều 3.1 so với luật Data.`
  * `[Codex] Đã refactor xong hàm handle_request, cần review.`
  * `[Langroid-Policy] Đã kiểm tra toàn bộ luật liên quan, không thấy xung đột.`
* Quy tắc này sẽ được đưa vào Prompt của từng Agent để đảm bảo tuân thủ.

#### Comment chuẩn hóa

* Vẫn **bắt buộc** dùng `directus_comments` làm nơi lưu trữ comment chính thức.
* Agent ghi comment qua API Directus bằng **Token hệ thống chung**.
* UI Nuxt chỉ cần hiển thị nguyên văn nội dung comment (bao gồm cả `[Agent_Name]`), không cần xử lý Avatar/User Profile riêng cho từng Bot.

#### Task Queue & Log

* Task Queue vẫn liệt kê các việc cần Agent xử lý (viết draft, sửa theo comment, kiểm tra xung đột...).
* Log/báo cáo Agent có thể tóm tắt thêm, nhưng **Signature `[Agent_Name]`** là chuẩn nhận diện tối thiểu phải có.

### 3.5. UI/UX vận hành

---

### **Trụ cột 3 – “Bàn điều khiển Tối giản” (Simplified Human UX — BỔ SUNG QUAN TRỌNG)**

Đây là trải nghiệm mà User mong muốn ngay từ đầu: *Con người chỉ làm phần quyết định cuối, không phải xử lý UI phức tạp*.

#### Yêu cầu giao diện phê duyệt (Approval Desk):

#### Giao diện 1 Chạm (One-Touch):
 
 * **Diff View**: Sử dụng Iframe hoặc Component hiển thị Side-by-side từ **Directus Revisions** (Read-only).
 * **Comment**: Form nhập liệu Inline (ngay dưới đoạn văn hoặc bên cạnh), không dùng Sidebar phức tạp.
 * **Action**: 2 Nút lớn: `[Approve]` và `[Request Change]`.

#### Mục tiêu:

* Giảm thời gian duyệt nội dung.
* Tạo trải nghiệm “điều hành như Google Docs nhưng đơn giản hơn”.

---

#### **Giới hạn phạm vi UI – Tránh xây lại Directus (Rất quan trọng)**

* **Gạch bỏ yêu cầu “Dynamic Form Engine”** (form động tự sinh theo schema) vì Directus đã có hệ thống này.
* Chỉ xây UI chuyên biệt cho các tác vụ đặc thù:

  * So sánh phiên bản (Diff UI).
  * Duyệt nội dung.
  * Thêm comment.
  * Dashboard hàng đợi.
* Các form nhập liệu cơ bản (CRUD) nên:

  * Dùng Directus Admin (đã có Dynamic Form).
  * Hoặc làm **form tĩnh đơn giản** trên Nuxt nếu thực sự cần.

> **Anti-Stupid:** Không tái tạo lại thứ Directus đã làm rất tốt.

#### Workspace

* Danh sách task, widget trạng thái.

#### Request Detail

* Timeline đầy đủ.

#### Document Detail

* Tabs: Content / History / Diff / Comments / Agents.

#### UI 1-chạm (Thay thế Graph):
 
 * **UI 1-chạm**: Tóm tắt + Nguồn (từ Qdrant metadata); Diff side-by-side (Directus Revisions iframe, read-only); Comment inline form (gọi Comments API, no sidebar); Actions: `[Approve]` (1-click trigger Flow publish) / `[Change]` (gửi Pub/Sub đến Agent). Không graph phức tạp – dùng text tree nếu cần quan hệ.

#### Đơn giản hóa nghiệp vụ

* Tái sử dụng tối đa component của Agency OS / Directus..

---

### 3.6. Hạ tầng kết nối & bảo mật

#### API Gateway

* Một gateway duy nhất cho Agent Data, **tái sử dụng FastAPI/Gateway đã có trong Agent Data Langroid Plan V12** (không dựng dịch vụ mới), chỉ cần cấu hình các endpoint cần thiết (ví dụ: `/search`, `/ingest`) để Directus Flows và Workflows có thể gọi.

#### Secrets

* Lấy qua Secret Manager.
* Không hard-code.

#### Trigger / Eventing

* **Luồng Trigger**: User/Nuxt → Directus Update → **Directus Webhook** → **Google Cloud Workflows** (Serverless Orchestration) → **Pub/Sub Topic** (e.g. `agent-tasks`) → **Agent Data** (Cloud Run Service).
* **Lợi ích**: Tối ưu chi phí (**Scale-to-zero**), không cần Agent chạy ngầm liên tục để poll.
* Agent xử lý và **chỉ** cập nhật lại trạng thái/draft vào Directus (Growth Zone), không ghi trực tiếp vào các hệ thống khác; Directus vẫn là SSOT cho nội dung, Agent Data/Qdrant là SSOT cho vector & tri thức.

#### Giới hạn write

* Agent chỉ được viết Draft trong Growth Zone.
* Publish = User.

---

## 4. Thừa kế từ kế hoạch cũ

* Phase E (0047–0049) là nền tảng cố định.
* E1 chỉ mở rộng, không phá vỡ thiết kế cũ.
* Chỉ sửa nội dung cũ khi vi phạm luật hoặc không khả thi.

---

## 5. Đầu ra mong muốn của E1

Sau khi E1 hoàn thành, hệ thống phải đạt được **một mô hình vận hành rõ ràng, đo được, không mơ hồ**, đáp ứng yêu cầu hợp tác hiệu quả giữa **Con người ↔ Agents hệ thống ↔ Agents Langroid tự build**.

### 5.1. "Nơi làm việc chung" – Định nghĩa rõ ràng

Một **Workspace hợp tác thống nhất**, nơi **mọi tác nhân trong hệ thống** (Human + Codex + Cursor + Claude + Antigravity + Langroid Agents do ta tự xây) đều tương tác theo chuẩn chung:

1. **Con người:**

   * Tạo yêu cầu nội dung (Content Request).
   * Xem trạng thái, review, comment, yêu cầu sửa.
   * Thực hiện phê duyệt cuối cùng.

2. **Agent có sẵn (Codex, Cursor, Claude, Antigravity):**

   * **Agent hoạt động theo sự kiện (Event-driven)**: Agent chỉ thức dậy và làm việc khi nhận được tín hiệu từ Pub/Sub (do Directus Flow kích hoạt), không chạy ngầm lãng phí tài nguyên.
   * Xuất log + comment vào Directus.
   * Trả draft/bản sửa về Directus đúng chuẩn workflow.

3. **Agent Langroid (tự build theo V12 – Agent Data):**

   * Là lớp Agent nội bộ, chạy trên hạ tầng serverless.
   * Có khả năng xử lý tri thức, reasoning, tổng hợp nội dung, phát hiện xung đột.
   * Tích hợp chặt với Agent Data (Qdrant) và Directus.
   * Được thiết kế để đảm nhiệm các phần việc lặp lại hoặc logic sâu mà Agents bên ngoài không xử lý tốt.
 
 4. **Quy trình chuẩn của Agent (Standard Process)**:
 
    * Nhận lệnh (Pub/Sub) → Gọi API Search (Agent Data) → Tổng hợp Context → Viết Draft vào Directus → Update Status.

### 5.2. Mục tiêu vận hành cụ thể

E1 phải tạo ra **một hệ thống vận hành khép kín**, trong đó tập trung vào ba trục chính:

1. **Vòng đời khép kín**

   * Mọi yêu cầu nội dung đều có vòng đời rõ ràng: đi qua đầy đủ `new → drafting → awaiting_review → awaiting_approval → published`.
   * Directus Flows giữ vai trò SSOT cho trạng thái workflow (không xây thêm workflow engine riêng).

2. **Ai đang giữ bóng**

   * Trường `current_holder` trong `content_requests` (Growth Zone) luôn thể hiện rõ Agent/User nào đang chịu trách nhiệm bước tiếp theo.
   * Dashboard/My Tasks phải hiển thị dựa trên trường này để Sếp biết ngay việc nào đang chờ mình.

3. **Dấu vết Agent rõ ràng**

   * Mọi Agent đều để lại dấu vết trong Directus thông qua `directus_comments` và Revisions/History.
   * Log chi tiết (ai, lúc nào, sửa gì) tận dụng hoàn toàn tính năng có sẵn của Directus; không tạo thêm bảng log riêng.

(Các ý còn lại về UI hỗ trợ quyết định nhanh, chuẩn hóa vai trò từng Agent và khả năng mở rộng sang Phase F đã được gom vào phần 0 – Mục tiêu cốt lõi và các mục 3.4, 3.5, 3.6; tránh lặp lại ở đây.)

E1 phải tạo ra một hệ thống vận hành khép kín, với đầu ra chính:
 
 * **Nền tảng mở rộng F**: Kiến trúc modular (Directus Flows + Pub/Sub) cho Policy Engine/Multi-Agent, không thay đổi core.
 * **Role Agent rõ ràng & minh bạch**:
   * **Agent Langroid**: Reasoning nội bộ (search Qdrant V12 trước draft).
   * **Cursor/Codex/Claude**: Sinh/sửa nội dung theo trigger (webhook envelope từ Pub/Sub, MCP v5.0, với `correlation_id` cụ thể e.g., 'codex_draft' để passive route).
   * **Antigravity**: Phân tích/audit theo trigger (webhook envelope từ Pub/Sub, MCP v5.0, với `correlation_id` e.g., 'antigravity_audit' để passive route).
 * **Minh bạch**: Tất cả trace qua Directus Revisions/Comments (who/what/when, no-code).
 
 (Các yếu tố UI nhanh, kết nối chuẩn hóa gom vào phần 0 & 3.5; vòng đời/async đã chi tiết ở 2.1/Blog E1.C.)
 
 ---

## 6. Blogs hiệu chỉnh (E1.A → E1.F)

Các blog dưới đây implement trực tiếp các phần 3.5 (UI/UX vận hành) và 3.6 (Hạ tầng kết nối & bảo mật), với ưu tiên rõ ràng: tận dụng **Directus Flows/Dashboards/Comments** và kiến trúc serverless (Workflows + Pub/Sub) để tránh phải viết code mới cho những phần đã có công cụ hỗ trợ.

### Blog E1.A – Folder / Tree

* Folder = bản ghi trong `knowledge_documents`.
* Không tạo bảng mới.
* Dùng trường quan hệ tự tham chiếu (ví dụ: `parent_id`) trong `knowledge_documents` để thể hiện cấu trúc cây cha–con, tương tự Google Drive folder tree.
* Tạo/Đổi tên/Di chuyển dùng Directus API.
* **Bắt buộc**: Không tạo collection "folder" hoặc `tree_nodes` riêng; bắt buộc dùng `knowledge_documents` với `parent_id` self-ref (Growth Zone editable).
 * **Quản lý Folder/Tree**: Folder không bảng riêng; mỗi Folder là bản ghi `knowledge_documents` với `parent_id` self-ref. UI (Nuxt/Directus) chỉ gọi API Directus (POST/PATCH `/items/knowledge_documents`) để tạo/đổi tên/di chuyển; cấm collection `folders`/`tree_nodes` mới.
 * **Vue Flow map**: Fallback text tree hierarchy (từ Directus relational query `parent_id`, display Nuxt read-only); chỉ dùng Vue Flow nếu Agency OS repo có component built-in (kiểm tra GitHub/directus-labs/agency-os trước, tránh code third-party).
 * **Graph chỉ map từ field có sẵn** (`parent_id`, `references`, `related_links`), không thêm schema mới.

### Blog E1.B – Comments

* Dùng `directus_comments` (bảng hệ thống thuộc Core Zone, không thay đổi schema, chỉ cấu hình và sử dụng theo đúng chức năng có sẵn).
 * **Bắt buộc**: Mọi comment (Người & Agent) lưu duy nhất ở `directus_comments` (Core Zone immutable). Không tạo bảng `comment`/`agent_notes`/`notes` riêng (vi phạm Anti-Stupid & Luật Data §3). Agent gọi API bằng token hệ thống.
 * **Ưu tiên**: Dùng cơ chế comment/activity có sẵn của Directus (comments, revisions, activity log). Không tạo bảng comment/log mới nếu Directus đáp ứng (kiểm tra docs trước).
 * **SSOT**: Comment chính thức lưu `directus_comments`; lịch sử chỉnh sửa dùng Revisions/History – không tạo bảng log/comment mới. Agent ký tên trong comment (e.g., `[Claude]: ...` ) dùng system token API.
 * **Nguồn sự thật**: Tất cả comment (Người & Agent) lưu `directus_comments` (core Directus), không tạo `comments`/`notes`/`logs` riêng. Agent ghi qua API token hệ thống chung; nội dung ghi chữ ký `[Agent_Name]: ...` . Nuxt chỉ đọc/ghi qua API, không xây comment song song.
 * **IAM tối giản**: Agents (Cursor/Codex/Claude/Antigravity/Langroid) dùng chung tài khoản `system-bot` (role Draft-only, no Publish). Phân biệt bằng chữ ký `[Agent_Name]` trong comment/log/metadata, không tạo user riêng.
* Agent comment = Directus API.
* Nuxt đọc/ghi từ Directus.
* Kết hợp bật tính năng **Revisions/History** sẵn có của Directus để làm log chuẩn ngành: ghi lại ai (User hoặc Agent dùng Token hệ thống) đã sửa trường nào, vào thời điểm nào; không tạo thêm bảng log riêng.
 * **Integrate Revisions**: Dùng **Directus Flows** trigger on comment create → auto-log revision (who: Agent token/user_id; what: field changes; when: timestamp; no-code via system fields).

### Blog E1.C – Trigger & Async
 
 * **Luồng chuẩn E1**: 1-click Nuxt → Directus Flow/Webhook → Google Cloud Workflows → Pub/Sub envelope (MCP v5.0, `idempotency_key` & `causation_id`, DLQ <1%). Agent CLI chỉ fallback dev/test, không production. Cấm poll DB hoặc queue khác trừ khi chứng minh đơn giản hơn & khớp luật (Hiến pháp §4).
 * **1 pipeline chuẩn**: Directus → Webhook → Cloud Workflows → Pub/Sub → Agent (production). Trigger khác (CLI/manual) chỉ dev/test, không chen luồng chính.
 * **Production flow**: Directus (Flows/Webhook) → Google Cloud Workflows → Pub/Sub → Agent (Langroid/Codex...). CLI/polling chỉ dev/test, không thay luồng chính.
 * **Trigger chính**: Directus (content_requests + Flows/Webhook) → Workflows → Pub/Sub → Agent. Polling/CLI chỉ dev/test, không luồng chính.
 * **Content Request**: Lưu collection `content_requests` (Growth Zone Directus). `current_holder` (string/enum: `user_<id>`/`editor_<id>`/`agent_codex`/`agent_claude`/`agent_langroid`...) thể hiện "ai giữ bóng"; Dashboard/My Tasks filter dựa field này.
 * **SSOT**: Content Request lưu collection `content_requests` (Growth Zone Directus), không tạo queue/song song ở hệ thống khác.
 * **Trường current_holder**: Enum string (Growth Zone `content_requests`: values `user_{id}`, `agent_langroid`, `agent_codex`, etc.); update via Flow on status change.

### Blog E1.D – Dashboard Queues

* **Hàng đợi**: Dùng **Directus Dashboards** (built-in no-code) với panels filter on fields (trạng thái enum + `current_holder` string: e.g., panel filter `current_holder` contains 'user_' cho "User Tasks"; contains 'agent_' cho "Agent Queues" từ `content_requests`).
 * **Nguyên tắc triển khai**: Ưu tiên **Directus Dashboards** (panel/filter no-code) cho SLA/hàng đợi. Nuxt chỉ embed/link view read-only đơn giản; không xây engine dashboard mới cho số liệu Directus cung cấp.
 * **SLA badges**: Metrics panels on date fields (e.g., `created_at` >24h filter badge đỏ, no-code via dashboard insights); auto-export CSV weekly via Flows + Cloud Scheduler; reminder email nếu overdue (Flows trigger on metric threshold).
 * **Dashboard tổng quan**: Dữ liệu filter theo thời gian (ngày/tuần/tháng); xuất báo cáo CSV/Excel đơn giản (via Flows) cho thống kê/họp nội bộ. Không BI phức tạp.

## 7. Effort & Cost Estimate (nháp)

* **Triển khai:** 2–3 sprint nhỏ:

  * Sprint 1: Cấu hình Directus Collections (`content_requests`, quan hệ folder `parent_id`), Comments, Revisions, Flows cơ bản.
  * Sprint 2: UI Nuxt tối giản (Approval Desk, My Tasks) dạng read-only + action 1-chạm, embed/iframe từ Directus khi có thể.
  * Sprint 3: Kết nối Agent Data (Gateway FastAPI hiện có, Workflows + Pub/Sub), test async end-to-end.
   * **Bắt buộc**: Gateway E1 tái dùng FastAPI Langroid V12 (Cloud Run theo Plan V12); chỉ config endpoint (`/search`, `/ingest`), IAM, secrets (từ Secret Manager). Không dựng service backend mới (vi phạm Anti-Stupid & cost opt).
   * **Trước đề xuất mới**: Kiểm tra Directus Flows/Webhook/API có làm được không; Langroid V12 backend support không. Chỉ khi cả hai "không đáp ứng" mới đề xuất component mới (Anti-Stupid).
   * **Khẳng định**: Gateway E1 tái sử dụng FastAPI Langroid/Agent Data (Cloud Run); E1 chỉ cấu hình endpoint/IAM, không dựng gateway mới.
   * **Gateway chính thức**: Tái sử dụng FastAPI/Langroid (Agent Data Cloud Run); E1 không dựng service mới, chỉ cấu hình endpoint (`/search`, `/ingest`...), IAM/secret.
* **Vận hành**:
 
   * Sử dụng **Cloud Run/Workflows** chế độ **scale-to-zero**. Chi phí dự kiến cho reporting và trigger: **< $5 USD/tháng** (Nằm trong ngân sách MVP).
* **Nâng cấp:**

  * Ưu tiên thay đổi bằng cấu hình (schema, Flow, Dashboards) thay vì refactor code, tuân thủ HP-02 (IaC minimalism) và nguyên tắc Anti-Stupid (assemble > build).

---

## PHẦN 2: KẾ HOẠCH BỔ SUNG – TODO LIST CHO GIAI ĐOẠN E1

**Trục E1**: Directus Growth Zone ↔ Agent Data V12 ↔ Nuxt UI – Dùng Directus làm SSOT Workflow (Theo ID E1-01+, kế thừa Đề bài E1 Final, tuân 3 Zones & Luật Data v1.1, Hiến pháp v5.0 §2 Standardized Protocol & §7 Scalability reuse-first).

### I. Nguyên tắc chung

* **3 Zones Schema – BẮT BUỘC**: Core (immutable, e.g., `directus_comments`); Migration (từ Lark, read-only); Growth (`content_requests` mới, editable).
* **SSOT**: Directus Growth cho workflow/content (collection `content_requests`); Agent Data Qdrant cho vector/search (sync webhook idempotent envelope MCP v5.0); Nuxt read-only display/trigger (embed Directus iframe/API).
* **Anti-Stupid**: No-code-first (Directus Flows/Dashboards/Comments/Revisions config trước; Langroid V12 FastAPI reuse cho `/search`/`/ingest`); chỉ code nếu Directus/Langroid không đáp ứng (kiểm tra docs trước).
* **Effort**: 2-3 sprints, <5$/tháng scale-to-zero; test E2E async (SLO P95 <1s ACK per Hiến pháp §8); không tạo bảng/queue mới, ưu tiên lắp ráp.

### II. To-Do Tasks

| ID | Giai đoạn | Tên Task | Mục tiêu | Nội dung chính | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **E1-01-SCHEMA-GROWTH** | Sprint 1 | Config Collection `content_requests` (Growth Zone) | Tạo SSOT cho vòng đời yêu cầu, tuân 3 Zones | (1) Tạo collection `content_requests` (Growth): fields `title` (string), `requirements` (text), `status` (enum: new/drafting/review/approval/published/cancelled), `current_holder` (string enum: `user_<id>`/`editor_<id>`/`agent_codex`/`agent_claude`/`agent_langroid`...), `created_at` (date). (2) Add relational to `knowledge_documents` (`parent_id` self-ref cho folder tree). (3) Permissions: Users edit, Agents read/write via `system-bot` token. No schema Core/Migration chạm (Luật Data §3). | TODO |
| **E1-02-FLOWS-BASIC** | Sprint 1 | Setup Directus Flows cơ bản cho closed loop | Trigger async passive Agents, integrate Revisions/Comments | (1) Flow 1: On `status=new` → Webhook → Cloud Workflows → Pub/Sub envelope (MCP v5.0, `idempotency_key`/`causation_id`) đến Agent Data `/search` → draft. (2) Flow 2: On comment create → auto-log Revisions (who: `system-bot`/`user_id`; what: field changes; when: timestamp). (3) Flow 3: On approve → publish + update status. Test idempotent retry (DLQ <1%, Hiến pháp §5). Reuse Flows no-code. | TODO |
| **E1-03-DASHBOARD-QUEUES** | Sprint 1 | Config Dashboards cho nhắc việc & SLA | Hiển thị "ai giữ bóng", badges overdue | (1) Insights Dashboard: Panels filter `current_holder` (contains 'user_' cho User Tasks; 'agent_' cho Queues) & status enum từ `content_requests`. (2) Metrics panel on `created_at` (>24h conditional red badge via insights). (3) Weekly export CSV via Flow + Cloud Scheduler; reminder email on threshold (Flow trigger). Filter thời gian (ngày/tuần/tháng). No-code panels (Blog E1.D). | TODO |
| **E1-04-UI-NUXT-1TOUCH** | Sprint 2 | Build UI Nuxt Approval Desk (read-only + 1-chạm) | Đơn giản UX Human, trigger Flows | (1) Page `/approval-desk`: Embed Directus iframe cho Diff Revisions side-by-side (read-only). (2) Inline form Comments API (no sidebar). (3) Buttons: `[Approve]` (POST Flow publish/update status); `[Request Change]` (Pub/Sub envelope to Agent). (4) My Tasks view từ Dashboard filter. (5) Define & implement 4 view models (ContentRequestView, DocumentSummaryView, WorkflowItemView, AgentActivityView) dưới dạng TypeScript types + 1 file config map từ Directus/Agent Data → view model (đổi map bằng config, không sửa code). 1 màn hình chuyên dụng, no tabs/bước trung gian (Mục tiêu 4). | TODO |
| **E1-05-FOLDER-TREE** | Sprint 2 | Implement Folder/Tree display (reuse relational) | Cấu trúc `knowledge_documents` hierarchy | (1) Query Directus API cho `parent_id` tree. (2) Display text hierarchy Nuxt (fallback MVP, no Vue Flow unless Agency OS built-in – check GitHub/directus-labs/agency-os). (3) CRUD folder via API (create/rename/move `/items/knowledge_documents`). Không collection `folders`/`tree_nodes` mới (Blog E1.A). | TODO |
| **E1-06-AGENT-CONNECT-V12** | Sprint 3 | Kết nối Agent Data V12 & test E2E | Contextual search + sync draft | (1) Webhook Directus → FastAPI `/ingest` (sync draft to Growth, idempotent envelope v2.2). (2) Mandatory `/search` Qdrant trước draft (threshold conflict >0.8 → auto-comment reject via API). (3) Test: 1-click Nuxt → Flow → Pub/Sub → Langroid Agent → Revisions trace (SLO <1s, cấm zero-shot log context). Reuse V12, chỉ config endpoint/IAM/secrets (Phần 7). | TODO |
| **E1-07-ROLE-EXTERNAL** | Sprint 3 | Map trigger passive cho external Agents | Role rõ ràng Cursor/Claude/Antigravity | (1) Envelope `correlation_id`: 'codex_draft' (webhook to Cursor); 'claude_sinh' (to Claude); 'antigravity_audit' (to Antigravity). (2) IAM: Chung `system-bot` token (Draft-only, no Publish); phân biệt chữ ký `[Agent_Name]` in comment/metadata. (3) Test passive: No auto-run, chỉ trigger 1-click (Blog E1.C). | TODO |
| **E1-08-RBAC-UI** | Sprint 3 | Implement RBAC UI disable | Ẩn/disable hành động vượt quyền | (1) Nuxt guards: Ẩn nút Publish nếu Agent role; disable schema sửa nếu Editor. (2) Hành động nhạy cảm (Publish/Archive) qua Admin only, không đường tắt (Mục tiêu 4). (3) Test: Role-based view (`system-bot` for Agents). | TODO |
| **E1-09-PROTOCOL-DOC** | Sprint 3 | Protocol & Convention Docs | Đóng gói hợp đồng giao tiếp giữa Directus/Agents | (1) Định nghĩa JSON envelope chuẩn (fields: `request_id`, `content_request_id`, `correlation_id`, `idempotency_key`, `current_holder`...). (2) Chuẩn chữ ký `[Agent_Name]` cho comment/log (e.g., `[Codex]: ...`). (3) Checklist bắt buộc: "Trước draft → gọi `/search`, log context ở Revisions/Comments, comment tối thiểu gồm gì...". (4) Mẫu prompt khung cho Codex/Cursor/Claude/Anti/Langroid tuân luật. Lưu 1 file docs Markdown (reuse Blogs E1.C/B). | TODO |

### III. Ghi chú sử dụng

* Mỗi task tách sub-plan nếu cần (e.g., Cursor cho code Nuxt nhẹ, kiểm tra Directus docs trước). Tham chiếu ID E1 Đề bài Final & Luật Data/Hiến pháp (e.g., no new table/queue, search log bắt buộc).
* Khi adjust, tăng ID (E1-09+); ưu tiên no-code check (Directus/Langroid trước).
* **Deliverable**: E2E test closed loop (new request → published, no lost, SLA badges <24h).


## IV. PHỤ LỤC F: CHIẾN DỊCH "ANTI-STUPID" – CLEAN & BUILD WEB APP (THỰC HIỆN NGAY TRONG E1)

**Mã văn bản:** TECH-ADDENDUM-F1  
**Ngày lập:** 13/12/2025  
**Trạng thái:** APPROVED (Thống nhất Grok/Gemini/ChatGPT).  
**Phân loại:** Nợ kỹ thuật / Anti-Stupid Correction (Tuân thủ Hiến pháp v1.11e HP-02 IaC Minimalism; Luật Data & Connect v1.1 Điều 2 Assemble > Build; Kế hoạch (FINAL).docx Stack A+).  

**Bối cảnh:** Hiện tại E1-06 hoàn tất (Agent Data wired), nhưng UI lệch (Cloud Run/SSR/proxy) → Lỗi fetch localhost, cold start, chi phí thừa. Sửa để: Đơn giản (SPA Firebase), Hoàn chỉnh (Essentials + i18n), Ready-to-Use (Admin + Core). Thời gian: <3 ngày. Chi phí: $0.

> DEPRECATED (Web hosting only): Cloud Run approach for Nuxt web is replaced by SPA + Firebase Hosting (see Appendix F).

| Task ID | Tên Task | Mô Tả Chính (Reuse-First) | Definition of Done (DoD) | Thời Gian Ước Tính | Trạng Thái |
|---------|----------|---------------------------|--------------------------|---------------------|------------|
| **E1-F1: Infrastructure Reset** | Di dời hạ tầng + i18n Foundation | - Chuyển Nuxt sang SPA (ssr: false, nitro preset: 'static').<br>- Deploy Firebase Hosting (Blaze tier, CDN).<br>- Cài @nuxtjs/i18n (VN default, JA/EN ready; locales/*.json).<br>- Env: NUXT_PUBLIC_DIRECTUS_URL (bake-in build).<br>- Directus: CORS_ENABLED=true, CORS_ORIGIN=web.app; CSP_FRAME_ANCESTORS=web.app (cho iframe). | - Build: `npm run generate` → .output/public tĩnh.<br>- Deploy: `firebase deploy --only hosting` → URL web-test.web.app load <2s, no cold start.<br>- i18n: Text UI dùng $t('key') (e.g., $t('login.title')); switch lang /vi → VN text.<br>- No proxy: Grep code → 0 match '/api/proxy'.<br>- Cost Guard: CI script gcloud billing query (alert >$5/tháng). Artifact: GCS retention min 30 ngày (tag/release). | 1 ngày | **DONE (PR #132)** |
| **E1-F2: Web Essentials** | Lắp ráp trang cơ bản + Auth | - Pages (Nuxt UI components): /login (form + Google sign-in), /register (email verify Firebase native), /forgot-password (reset email), /profile (read-only info), /logout (clear session → /home).<br>- System: error.vue (404/403), NuxtLoadingIndicator.<br>- Guard: Nuxt middleware (if !auth → /login cho /portal/*). | - Luồng E2E: Khách → Register → Verify email (Firebase) → Login → /profile → Logout → Home.<br>- Responsive: Mobile OK (Nuxt UI auto).<br>- i18n: Tất cả text $t() (VN/JA).<br>- Auth: Firebase SDK + guards (no server-side check). | 1 ngày | TODO |
| **E1-F3: User Admin & Automation** | Quản trị user + Bulk import | - Page: /admin/users (list/invite/role assign, gọi Directus API RBAC).<br>- Automation: Directus Flow (CSV upload → Create users → Firebase email invite).<br>- Reuse: Nuxt UI Table/Card cho list; webhook → Agent Data log. | - Admin login → /admin/users: View/edit roles (editor/viewer).<br>- Bulk: Upload CSV → 5 users created + emails sent (test log).<br>- i18n: Labels $t('admin.users.title').<br>- Secure: RBAC hide /admin nếu non-admin. | 0.5 ngày | **DONE (PR #133)** |
| **E1-F4: Core Features** | Nghiệp vụ E1 gốc + Cleanup | - Approval Desk: 1-chạm (Diff iframe Revisions read-only + inline comment + nút Approve/Change via Directus Flow).<br>- Knowledge Tree: Folder view (fetch Directus, filter zone/user_visible).<br>- Cleanup: Xóa Cloud Run service web-test (sau Firebase stable). | - Desk: Load doc → Side-by-side Diff → Click Approve → Status published (Directus).<br>- Tree: Filter /zone → Display published only (Nuxt read-only).<br>- i18n/Responsive: Full.<br>- Cleanup: `gcloud run services delete web-test` → Confirm no cost. STD: Lighthouse ≥90%. | 0.5 ngày | TODO |

**Next Steps:** Sau E1-F4, UAT full luồng (VN lang). Commit all to GitHub. Nếu lỗi (e.g., CSP block iframe), trace log + fix (no guess – check Directus env).

**Trạng thái triển khai:** Production Firebase runtime: PASS (SPA baseline, PR #132/#133). Agent Data: disabled in production (`NUXT_PUBLIC_AGENT_DATA_ENABLED=false`) chờ phương án an toàn (auth/cors/proxy) trước khi bật.

## V. PHỤ LỤC MỞ RỘNG (TRIỂN KHAI SAU)

Các task dưới đây là tính năng nâng cao, giúp tăng tốc độ làm việc nhưng **không bắt buộc** phải hoàn thành để đóng gói Giai đoạn E1. Có thể thực hiện ở Sprint 4 hoặc sau khi hệ thống ổn định.

| ID | Giai đoạn | Tên Task | Mục tiêu | Nội dung chính | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **E1-10-DOCS-SYNC** | Post-E1 | Tích hợp Google Docs Sync | Đồng bộ bản thảo sang Google Docs để giảm thao tác copy-paste vật lý | (1) Khôi phục/Cập nhật `driveMiddleware` trên Cloud Function (tái sử dụng code cũ). (2) Tạo Directus Flow trigger on save → gọi Middleware sync content. (3) Thêm trường `google_doc_id` vào `knowledge_documents`. *Lưu ý: Triển khai sau khi E1-01 đến E1-09 đã hoàn tất.* | PENDING |
