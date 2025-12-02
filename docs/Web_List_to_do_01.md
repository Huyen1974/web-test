# KẾ HOẠCH BỔ SUNG – TODO LIST

Trục Nuxt ↔ Directus ↔ Agent Data ↔ Lark – Dùng Directus hiện tại làm Sandbox V0 (Theo ID bắt đầu từ 0026, kế thừa đề xuất Gemini, đã hiệu chỉnh theo vai trò “Cổng Tri Thức” và góp ý của Giám sát)

I. Nguyên tắc chung

Chiến lược 3 Vùng Schema (Schema Zones) – NGUYÊN TẮC BẮT BUỘC

Để tránh xóa nhầm, ghi đè schema và bảo vệ tính toàn vẹn lâu dài của hệ thống, toàn bộ Directus/Agency OS và Agent Data được chia thành 3 VÙNG SCHEMA như sau:

Vùng 1 – Core Zone (BẤT KHẢ XÂM PHẠM)

Gồm các bảng hệ thống của Directus (directus_) và bảng chuẩn của Agency OS (agency_, projects, clients, ...).

Tuyệt đối CẤM: DROP, DELETE, rename bảng hoặc trường.

## Điều chỉnh sai sẽ gây lỗi UI ngay lập tức → mọi Agent phải coi vùng này là immutable.

Vùng 2 – Migration Zone (Từ LarkBase → Directus (+ Agent Data khi cần))

Gồm toàn bộ schema/metadata được nhập từ Larkbase (chiếm ~45–65% tổng schema liên quan).

Quy tắc: Một chiều → lấy từ Lark, chuẩn hoá và lưu **chính thức** ở các collection Migration Zone trong Directus; Agent Data chỉ nhận thêm bản sao/metadata nếu cần phân tích/blueprint.

Có thể tiếp tục dùng bảng/collection `id_mapping_registry` để quản lý ánh xạ, nhưng phải ghi rõ nó chỉ phục vụ migration & audit, không thay thế quan hệ native trong Directus.

Vùng 3 – Growth Zone (Sinh ra trong quá trình vận hành)

Các bảng, metadata, quy trình mới → phát triển dần dần theo kinh doanh.

Mọi bảng thuộc vùng này phải tuân cơ chế:

Agent chỉ tạo/sửa Draft

User duyệt Approve/Reject

Lưu lịch sử version đầy đủ

(Lưu ý: Toàn bộ Task 0028, 0029, 0053, 0054 sẽ được cập nhật bổ sung nội dung để tuân thủ 3 vùng này.)

Source of Truth (Não hệ thống):
- **Directus + MySQL** là **Single Source of Truth (SSOT)** cho **nội dung/tri thức hiển thị cho con người** (SOP, phụ lục, quy trình, tài liệu tri thức).
- **Agent Data + Qdrant** là **SSOT cho vector, metadata kỹ thuật dành cho Agents**, log tác vụ, blueprint kỹ thuật và các snapshot phục vụ tìm kiếm/suy luận; Agent Data **không phải** nơi quyết định “bản chính thức” để hiển thị.
- Luồng dữ liệu tổng thể: Lark / hệ thống nguồn → (nếu cần) Agent Data để phân tích/làm sạch → **Directus** để lưu bản chính thức → Nuxt chỉ đọc nội dung đã publish từ Directus.
- Mọi tri thức chính thức dùng cho Cổng tri thức sẽ được lưu và phê duyệt ở Directus; Agent Data chỉ hỗ trợ indexing (vector), log và context cho Agent.

UI hiển thị chính:
- Nuxt (Agency OS) **chỉ đóng vai trò UI hiển thị (read-only)** cho các tài liệu/Blueprint/tài liệu tri thức đã được **Publish** từ Directus.
- Mọi thao tác **phê duyệt chính thức** (approve/reject, versioning) đối với nội dung tri thức phải được thực hiện qua **Directus Admin UI / cơ chế Content Versioning của Directus**, không phê duyệt trực tiếp trên Nuxt.
- Nuxt vẫn có thể dùng các trường như `user_visible`, `zone`, `sub_zone`, `topic` nhưng các trường này **sống trong Directus** và được Nuxt đọc qua API (nuxt-directus).

Cờ User_Visible & Phân khu (Zone/Sub-zone):
- Các trường `user_visible`, `zone`, `sub_zone`, `topic` phải được **lưu trực tiếp trong các collection nội dung của Directus**.
- Đây là các trường filter chính mà **Nuxt sử dụng khi query từ Directus** để hiển thị cổng tri thức.
- Agent Data chỉ cần lưu **metadata bổ sung hoặc snapshot** nếu cần cho vector search; filter hiển thị chính thức là ở phía Directus, không phải ở Agent Data.

Chiến lược "Bộ lọc từ nguồn":
- **Directus** là nơi giữ **bản chính thức** (kể cả draft/published) của tài liệu tri thức, với các trạng thái (draft, published, archived…) do Directus quản lý.
- Chiến lược “Bộ lọc” được thực hiện **ngay trong Directus** bằng trạng thái (status), trường `user_visible`, và phân khu `zone`, `sub_zone`, `topic`.
- Agent Data chỉ index/ghi nhận **các bản đã publish** (hoặc các snapshot cần thiết) để phục vụ vector search và Agent workflow, không đóng vai trò Gatekeeper hiển thị.

Directus + MySQL hiện tại: tạm thời coi là SANDBOX V0 cho Agent thực hành schema và (sau này) một phần nội dung, thông qua API. Không chứa dữ liệu thật quan trọng.

Versioning & Diff: Agent không được ghi đè thẳng lên nội dung đã duyệt. Mọi chỉnh sửa phải đi qua cơ chế Draft → Review → Approved, giữ lại lịch sử và cho phép xem Diff (cũ/mới) trước khi duyệt.

Snapshot & Git: mọi trạng thái schema đã được nghiệm thu trên Sandbox phải được snapshot (snapshot.yaml) và lưu vào Git.

Nguyên tắc Data Entered Once: Mỗi mẩu nội dung (text/label) chỉ được nhập ở một nơi (collection nguồn trong Agent Data/Directus). Mọi nơi khác (graph Vue Flow, UI hiển thị) chỉ lưu ID tham chiếu tới nội dung gốc, không copy lại text.

Vue Flow companion: Mọi quy trình quan trọng được hiển thị bằng Vue Flow ở chế độ read-only (zoom/pan, chọn bước), nhúng trong giao diện Agency OS. Việc chỉnh sửa diễn ra ở tầng backend/Agent thông qua việc cập nhật JSON graph trong Agent Data/Directus (theo pipeline riêng), không code chat widget mới trên Nuxt.

Ghi chú: Toàn bộ kế hoạch này phải được hiểu và triển khai trong khuôn khổ Luật Data & Connection v1.1, bao gồm nhưng không giới hạn: Điều 2 (Assemble > Build, No Garbage), Điều 3–5 (3 Lớp/SSOT), Điều 11 (Lark one-way), Điều 18 (Filter Directus), Điều 20 (Versioning & Purge). Mọi task chi tiết ở các giai đoạn sau đều phải tuân thủ các nguyên tắc này.

Bảng dưới đây là To-Do List cấp hệ thống dùng để điều hành; chi tiết kỹ thuật (prompt cho Cursor/Gemini/Claude…) sẽ tách thành kế hoạch con khi cần.

II. To-Do List (Mức hệ thống)

Giai đoạn A – Chốt Sandbox & Source of Truth

****       ****       ****       ****       ****       ****

| ID | Giai đoạn | Tên Task | Mục tiêu | Nội dung chính | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 0026-RESET-SANDBOX | A | Khai báo Directus-test là SANDBOX V0 | Xác định rõ vai trò Directus + MySQL hiện tại chỉ là môi trường thử nghiệm, không chứa dữ liệu thật | (1) Ghi rõ trong Kế hoạch FINAL/Phụ lục rằng directus-test + MySQL hiện tại là Sandbox V0; (2) Không nhập dữ liệu thật; (3) Cho phép Agent thao tác schema tự do nhưng mọi thay đổi quan trọng phải đi kèm snapshot về sau | TODO |
| 0027-SOURCE-OF-TRUTH | A | Chốt “Source of Truth” hệ thống | Tránh lẫn lộn vai trò giữa Agent Data, Directus và Git | (1) Ghi rõ: Directus + MySQL Prod là Single Source of Truth cho nội dung/tri thức hiển thị cho con người (SOP, quy trình, phụ lục…); (2) Ghi rõ: Agent Data + Qdrant là Single Source of Truth cho vector, metadata kỹ thuật dành cho Agent, blueprint kỹ thuật và log/snapshot phục vụ tìm kiếm & suy luận – không phải kho lưu bản chính thức để hiển thị; (3) Ghi rõ: Git + snapshot.yaml là nơi lưu trạng thái schema kỹ thuật (Directus schema, cấu hình) đã được nghiệm thu – dùng làm chuẩn khi dựng lại môi trường (nhất là Prod); (4) Cập nhật lại các định nghĩa này vào Hiến pháp/Kế hoạch FINAL/Phụ lục liên quan để toàn bộ Agent sử dụng chung. | TODO |

Giai đoạn B – Nuxt ↔ Directus (nội dung) + Agent Data (search/log)

****       ****       ****       ****       ****       ****

| ID | Giai đoạn | Tên Task | Mục tiêu | Nội dung chính | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 0028-NUXT-AGENCY-OS-FOUNDATION | B | Cài Nuxt “Agency OS” làm nền tảng | Có khung UI chuẩn, không tự dựng layout mới | (1) Clone/tích hợp repo directus-labs/agency-os làm shell Nuxt duy nhất; (2) Dùng module nuxt-directus sẵn có (auth, layout, dashboard), không tạo app Nuxt thứ hai; (3) Nhúng toàn bộ tính năng mới (Blueprint, Vue Flow, Knowledge pages) vào bên trong layout này; (4) Áp dụng chiến lược “song hành schema”: chỉ tạo thêm collection Vùng 3, không sửa/xóa collection Vùng 1; (5) Khi sync schema từ Lark (Vùng 2) sang Directus, toàn bộ được gắn tag schema_zone = migration để tránh nhầm với Core Zone; (6) Bắt buộc cấu hình cơ chế cache SSR/ISR (hoặc tương đương, ví dụ Nitro) cho các trang chính để tối ưu hiệu năng. (7) Tuân thủ Điều 17 Luật Data: Bắt buộc sử dụng module nuxt-directus (Composables). CẤM cài SDK rời. (8) Schema sync từ Lark phải đưa vào Migration Zone, tuyệt đối không ghi đè Core Zone của Agency OS. (9) Khẳng định rõ: các Knowledge pages / trang tri thức trên Nuxt **đọc nội dung chính thức từ Directus** (thông qua module `nuxt-directus`), chỉ hiển thị những bản ghi đã Publish (`status` phù hợp, `user_visible = true`). Nuxt không đọc nội dung tri thức chính thức trực tiếp từ Agent Data. | TODO |
| 0029-AGENTDATA-USER-FLAG-MODEL | B | Chuẩn hóa mô hình cờ User & phân khu trong Agent Data | Đảm bảo Agent Data có đủ thông tin (cờ, phân khu, metadata) để hỗ trợ search/RAG và phân tích, trong khi việc filter hiển thị ra web do Directus đảm nhiệm. | (1) Rà soát các collection chính trong Agent Data liên quan đến tri thức để bảo đảm có metadata cần thiết (zone, sub_zone, topic, trạng thái…) phục vụ search/RAG, không phải để quyết định hiển thị trực tiếp; (2) Nếu cần lưu `user_visible` trong Agent Data, hãy ghi rõ đây chỉ là metadata tham khảo; filter hiển thị chính thức phải dựa trên `user_visible`/status trong Directus; (3) Luật dữ liệu trong Agent Data phải tham chiếu lại Source of Truth mới: Agent Data không phải nơi duy nhất quyết định cái gì được đưa ra web; (4) Ghi luật này lại trong Agent Data để mọi Agent hiểu rõ vai trò “hỗ trợ” (supporting role) của Agent Data. | TODO |
| 0030-BLUEPRINT-TEMPLATE-V1 | B | Định nghĩa mẫu Blueprint V1 trên Agent Data | Có khuôn chuẩn để AI và con người cùng sử dụng khi thiết kế schema/quy trình | (1) Thiết kế cấu trúc 1 Blueprint: thông tin chung, danh sách bảng, danh sách trường chuẩn (meta_fields), mapping field↔bảng, quan hệ, ràng buộc, ghi chú & diff; (2) Lưu mẫu này dưới dạng tài liệu chuẩn trong Agent Data (Markdown/JSON); (3) Ghi chú: mọi Blueprint mới phải tuân theo mẫu này | TODO |
| 0031-BLUEPRINT-WORKFLOW | B | Thiết kế quy trình trạng thái & phê duyệt Blueprint | Đảm bảo chỉ nội dung đã được con người duyệt mới trở thành chuẩn | (1) Định nghĩa các trạng thái: draft → under_review → approved / rejected; (2) Quy định AI chỉ được tạo/sửa trong draft; (3) Chỉ User được bấm Approve; (4) Khi Request changes, Blueprint quay lại draft kèm comment; (5) Lưu quy trình này vào Agent Data như 1 “luật hệ thống” | TODO |
| 0032-NUXT-DATA-MODEL-MAPPING | B | Thiết kế cấu trúc dữ liệu hiển thị trên Nuxt | Đảm bảo dữ liệu từ Directus (nội dung đã publish) được tổ chức khoa học, dễ đọc & dễ duyệt trên Nuxt, đồng thời giữ mapping rõ ràng giữa Directus và Agent Data khi cần. | (1) Định nghĩa “View Model” cho Nuxt: cách nhóm theo Zone/Sub-zone/Topic, cấu trúc card/list, breadcrumb; (2) Xác lập mapping từ trường trong Directus (zone, sub_zone, topic, user_visible, trạng thái phê duyệt…) sang cấu trúc View Model của Nuxt; nếu Agent Data có metadata tương ứng thì chỉ dùng để đối chiếu/search, không làm nguồn hiển thị chính; (3) Ghi lại View Model & mapping này trong một tài liệu (có thể lưu ở Agent Data hoặc Directus) để AI/Agent dùng chung; (4) View Model trên Nuxt phải được hiện thực hóa chủ yếu dưới dạng cấu hình + truy vấn sử dụng các composable sẵn có của nuxt-directus (ví dụ: useDirectusItems, useDirectusSingleton,…); KHÔNG được viết thêm các lớp Model/Repository JavaScript riêng cho tầng hiển thị trừ khi có lý do đặc biệt, được ghi rõ và phê duyệt trong kế hoạch; (5) Ràng buộc assemble: View Model trên Nuxt phải được hiện thực hoá thông qua các composable sẵn có của `nuxt-directus` (đặc biệt `useDirectusItems` với filter `zone`, `sub_zone`, `user_visible`, `status`), chỉ bằng cấu hình query/filter. CẤM viết thêm lớp Model/Repository JavaScript riêng cho tầng hiển thị trừ khi có quyết định ngoại lệ được ghi rõ và phê duyệt trong kế hoạch. (Cross-ref Luật Data & Connection v1.1 – Điều 2 Assemble > Build, Điều 5 Cổng read-only.) | TODO |
| 0033-NUXT-BLUEPRINT-UI-SHELL | B | Dựng khung UI Nuxt cho Blueprint & Tài liệu | Có màn hình cơ bản để xem danh sách & chi tiết Blueprint/tài liệu tri thức | (1) Tạo page Nuxt /blueprints và các trang danh sách tri thức theo Zone/Sub-zone; (2) Component hiển thị danh sách (tên, trạng thái, ngày cập nhật, zone); (3) Route chi tiết /blueprints/:id và /knowledge/:id với khung tab (Tóm tắt, Nội dung, Quan hệ, Diff – placeholder); (4) Chưa cần kết nối API phức tạp, có thể dùng mock data bám đúng View Model 0032 | TODO |
| 0034-NUXT-AGENTDATA-API | B | Kết nối Nuxt với Directus (nội dung) và Agent Data (search/log) (API cơ bản) | Đảm bảo Nuxt đọc nội dung tri thức chính thức từ Directus; Agent Data chỉ được dùng cho search nâng cao, blueprint/log nội bộ khi cần. | DONE – Nuxt ↔ Agent Data + Directus search/log với 3-case graceful degradation (Agent Data off → Directus list; on + empty q → Directus list; on + q → Agent Data IDs → Directus fetch published/public). Directus = SSOT; Nuxt read-only. Evidence: PR #89; reports/0034_nuxt_agentdata_api_integration.md, 0034c_fix_blocker.md, 0034d_final_merge.md, 0034f_merge_template_refine.md, 0034e_doc_update_web_list_to_do.md. |
| 0035-NUXT-APPROVAL-UI | B | Thêm UI xem chi tiết Blueprint & tài liệu tri thức trên Nuxt (Read-only) | Cung cấp màn hình xem chi tiết (read-only) cho Blueprint/tài liệu tri thức đã được publish từ Directus, không thực hiện approve/reject trực tiếp trên Nuxt. | DONE – Read-only approval/status badges on Knowledge & Blueprints từ metadata Directus (draft/published/archived), không có approve/reject, Directus = SSOT, Nuxt hiển thị-only. Evidence: PR #90; reports/0035a_approval_ui_implementation.md, 0035c_scope_fix.md, 0035d_final_merge.md. |
| 0036-KNOWLEDGE-CASE-ORGANIZATION | B | Thiết kế cách tổ chức Cases/tri thức theo Zone/Sub-zone | Giúp cổng tri thức dễ tìm, dễ thay đổi & quản lý khối lượng tri thức lớn | (1) Xác định taxonomy: Category (Lĩnh vực) → Zone (Khu vực) → Topic (Chủ đề) → Case/Document; (2) Map taxonomy này vào schema Agent Data; (3) Xác định quy tắc gán Zone/Sub-zone cho tài liệu mới; (4) Nuxt dùng taxonomy này để sinh menu tự động | TODO |
| 0037-BLUEPRINT-PILOT-1 | B | Tạo & duyệt 1–2 Blueprint/tài liệu thí điểm | Kiểm chứng trục Directus (phê duyệt) ↔ Nuxt (hiển thị) & Agent Data (search/log) hoạt động ổn. | (1) Chọn 1–2 nhóm tri thức hẹp (vd: 1 quy trình nội bộ + 1 bộ biểu mẫu); (2) AI soạn Blueprint/tài liệu theo Template V1 và taxonomy Zone/Sub-zone; (3) User đọc/xem thử trên Nuxt; phê duyệt chính thức được thực hiện trên Directus (Content Versioning/Directus Admin UI); (4) Ghi lại vấn đề/góp ý để tinh chỉnh Template, UI & quy trình | TODO |

Giai đoạn C – Lark ↔ Directus (+ Agent Data) (Metadata & Blueprint từ Lark)

****       ****       ****       ****       ****       ****

| ID | Giai đoạn | Tên Task | Mục tiêu | Nội dung chính | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 0038-LARK-API-INVENTORY | C | Rà soát API & cấu trúc Larkbase | Hiểu rõ cách lấy metadata (bảng, trường) từ Lark | (1) Liệt kê các API Larkbase liên quan đến schema (bảng, field); (2) Xác định phương thức auth (App ID, App Secret, Token…); (3) Ghi lại vào Agent Data như 1 tài liệu kỹ thuật dùng chung cho mọi Agent | TODO |
| 0039-DIRECTUS-FLOW-LARK-SYNC | C | Thiết kế & dựng workflow no-code (Directus Flows) để đồng bộ schema/metadata Lark | Tự động hoá việc đồng bộ metadata Lark vào Agent Data, tuân thủ Điều 11 Luật Data | (1) Ưu tiên **Directus Flows** làm công cụ chính để đồng bộ metadata/schema từ Lark; chỉ sử dụng n8n nếu Directus Flows không đủ khả năng; (2) Tuân thủ Luật Dữ liệu v1.1 – Điều 11 (Lark Sync): dùng công cụ no-code, không viết script Python; (3) Lark schema được chuẩn hóa và lưu ở collection phù hợp trong Directus; Agent Data chỉ dùng để phân tích/blueprint nếu cần; (4) Tuyệt đối không viết script Python riêng cho sync – mọi logic xử lý phải nằm trong bước no-code. | TODO |
| 0040-LARK-RAWMETA-NORMALIZE | C | Chuẩn hóa metadata Lark trong Agent Data | Biến metadata thô thành dạng dễ dùng cho AI & Blueprint | (1) Xác định cấu trúc lưu trữ: base, bảng, field (code, label, type, mô tả…); (2) Tạo view/collection trung gian nếu cần; (3) Ghi rõ quy ước tên và domain để tránh trùng/lẫn | TODO |
| 0041-BLUEPRINT-FROM-LARK | C | Sinh Blueprint sơ bộ từ metadata Lark | Giảm tối đa việc nhập tay 65% schema | (1) Giao nhiệm vụ cho AI/Agent: đọc lark_raw_schema → nhóm field trùng, map thành meta_fields chuẩn; (2) Sinh ra 1 Blueprint theo Template V1 cho một nhóm bảng; (3) Đưa Blueprint này vào Nuxt để User xem thử (preview, read-only) và cung cấp link/móc nối để User phê duyệt/chỉnh sửa chính thức trên Directus (theo pipeline Giai đoạn B đã chuẩn hoá). | TODO |
| 0042-BLUEPRINT-LARK-REVIEW-ROUND1 | C | Vòng duyệt đầu tiên cho Blueprint từ Lark | Kiểm chứng khả năng tận dụng Lark như nguồn schema mạnh | (1) User xem và thảo luận 1–2 Blueprint sinh từ Lark trên Nuxt (preview); phê duyệt/chỉnh sửa chính thức được thực hiện trong Directus (Content Versioning/Directus Admin UI); (2) Ghi nhận các kiểu sai lệch thường gặp (tên, kiểu dữ liệu, quan hệ…); (3) Cập nhật lại luật & Template để vòng sau AI sinh ra đúng hơn | TODO |

Giai đoạn D – Directus + MySQL = Sandbox V0 (Thi công schema tự động)

****       ****       ****       ****       ****       ****

| ID | Giai đoạn | Tên Task | Mục tiêu | Nội dung chính | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 0043-RESET-ADMIN-TOKEN | D | Tạo & quản lý Admin Token cho Directus Sandbox V0 | Cho phép Agent thao tác Directus-test qua API một cách có kiểm soát | (1) Vào Directus UI tạo Static Token cho user admin; (2) Lưu token vào Secret Manager (ví dụ: DIRECTUS_ADMIN_TOKEN_SANDBOX_V0); (3) Ghi rõ: token này chỉ dùng cho Sandbox V0, không dùng cho Prod; (4) Cập nhật vào tài liệu pháp lý/hạ tầng (Hiến pháp/Phụ lục) | TODO |
| 0044-AUTO-SCHEMA-SANDBOX | D | Agent thi công schema trên Directus-test từ Blueprint đã duyệt | Tự động hoá quá trình tạo bảng/trường/quan hệ trên Directus Sandbox | (1) Khi có 1 Blueprint trạng thái approved, giao cho Agent đọc Blueprint và gọi API Directus để tạo Collections, Fields, Relations tương ứng; (2) Hạn chế thao tác tay trên Directus UI; (3) Ghi log lại toàn bộ API call quan trọng | TODO |
| 0045-VERIFY-SANDBOX-UI | D | User nghiệm thu schema trên Directus UI | Đảm bảo những gì Agent tạo trên Directus khớp với Blueprint đã phê duyệt | (1) User kiểm tra form, bảng, quan hệ trên Directus UI cho 1–2 Blueprint đầu tiên; (2) Ghi lại chênh lệch, nếu có → quay về chỉnh Blueprint hoặc logic Agent; (3) Khi ổn định, đánh dấu “mẫu đạt chuẩn” cho pipeline này | TODO |
| 0046-SNAPSHOT-SCHEMA→GIT | D | Snapshot schema Sandbox V0 thành code và lưu Git | Sử dụng công cụ chuẩn Directus CLI, tránh viết script thủ công | (1) Bắt buộc dùng npx directus schema snapshot; (2) Lưu snapshot.yaml vào Git; (3) Tạo script restore chuẩn hoá (schema_restore.sh) nhưng không được tự viết exporter; (4) Snapshot là chuẩn duy nhất để dựng lại Prod; (5) Ghi rõ version, ngày, Blueprint liên quan | TODO |

Giai đoạn E – Duyệt phiên bản & Diff cho tài liệu tri thức (Định hướng, dùng Directus/Agent Data)

****       ****       ****       ****       ****       ****

| ID | Giai đoạn | Tên Task | Mục tiêu | Nội dung chính | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 0047-VERSIONING-STRATEGY | E | Thiết kế chiến lược Versioning & Diff cho tài liệu tri thức & schema | Chốt cứng hai kênh versioning & duyệt: (1) Tài liệu tri thức dùng Content Versioning của Directus, (2) Schema kỹ thuật dùng Directus/Git. | (1) Quy định: Tài liệu tri thức sử dụng Content Versioning của Directus làm kênh versioning & phê duyệt chính; Nuxt chỉ hiển thị các phiên bản đã publish (read-only) và nếu cần Diff thì chỉ là UI xem, không là nơi quyết định duyệt; (2) Schema kỹ thuật dùng Content Versioning của Directus hoặc Git PR + snapshot.yaml; (3) Không tự code hệ thống versioning mới; (4) Lưu chiến lược thành luật hệ thống cho mọi Agent; (5) Cấu hình giới hạn lưu trữ: Tối đa 10 Revisions hoặc 7 ngày. Bật Auto-purge để tránh phình Database (Tuân thủ Điều 20). | TODO |
| 0048-WORKFLOW-ROLES-AGENT-USER | E | Định nghĩa quyền & workflow chỉnh sửa tài liệu | Phân biệt rõ Agent soạn nháp và User phê duyệt cuối + thêm RBAC cứng trong Directus | (1) Thiết kế Role: Agent chỉ được tạo/sửa Draft; User (Editor/Approver) mới được Publish; (2) Với Directus: cấu hình RBAC cứng theo nguyên tắc DENY cho Agent trên mọi bảng thuộc Core Zone – không Insert/Update/Delete, không ALTER, không DELETE/DROP; Agent chỉ được READ và thao tác trên Growth Zone/bảng log/graph; (3) Với Schema: chỉ Admin duyệt qua Directus Versioning; (4) Với Agent Data: chỉ các bản ghi đã ở trạng thái approved (theo workflow nội bộ) mới được phép index vào Qdrant/engine search và được dùng làm context cho Agent; việc hiển thị ra Nuxt vẫn phải dựa trên trạng thái & cờ user_visible trong Directus (Published + user_visible = true). Agent Data KHÔNG thêm một tầng duyệt riêng cho hiển thị; (5) Lưu workflow & RBAC này thành phụ lục bắt buộc | TODO |
| 0049-DIFF-UI-STRATEGY | E | Chiến lược hiển thị Diff cho User | Giúp User thấy rõ khác biệt giữa bản cũ/mới trước khi duyệt, tách bạch tri thức vs schema | (1) Với schema & cấu hình kỹ thuật: tận dụng chức năng Compare Version của Directus (cho collection bật Versioning) và/hoặc Git Diff cho snapshot.yaml/JSON cấu hình; User/Admin kỹ thuật duyệt trực tiếp trên Directus UI hoặc giao diện Diff Git; (2) Với tài liệu tri thức lưu trong Directus: tận dụng Content Versioning của Directus làm nguồn so sánh; Diff có thể hiển thị trực tiếp trên Directus hoặc render lại trên Nuxt ở chế độ read-only (lấy hai phiên bản từ Directus). Agent Data chỉ lưu snapshot/log nếu cần, không là nơi versioning chính cho nội dung tri thức; (3) Ghi rõ: User phổ thông duyệt tài liệu tri thức trên Directus (Content Versioning), có thể được điều hướng từ Nuxt bằng link “Mở trong Directus”; Admin/kỹ thuật duyệt schema trên Directus UI/Git – tránh trộn lẫn. Nuxt không phải nơi thực hiện hành động phê duyệt chính thức; (4) Ghi rõ kịch bản sử dụng cho từng loại tài liệu để Agent không được “chọn tùy ý” | TODO |

Giai đoạn F – Hạ tầng dài hạn (Định hướng, chưa làm ngay)

****       ****       ****       ****       ****       ****

| ID | Giai đoạn | Tên Task | Mục tiêu | Nội dung chính | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 0050-PROD-ENV-DESIGN | F | Thiết kế môi trường Prod tách khỏi Sandbox | Tránh lẫn lộn giữa môi trường thử nghiệm và môi trường chạy thật | (1) Xác định kiến trúc Prod: Directus Prod + MySQL Prod + Nuxt + Agent Data; (2) Định nghĩa nguyên tắc: Prod chỉ nhận schema từ snapshot/migration, không cho Agent chỉnh trực tiếp; (3) Ghi rõ vào Kế hoạch FINAL/Phụ lục | TODO |
| 0051-DOCKER-SANDBOX-PLAN | F | Lập kế hoạch chuyển Sandbox sang Docker (nếu cần) | Chuẩn bị phương án Sandbox lâu dài, rẻ, dễ reset | (1) Xem xét nhu cầu dài hạn: có cần Docker cho Directus + MySQL Sandbox riêng không; (2) Nếu có, thiết kế docker-compose (Directus + MySQL + volumes); (3) Định nghĩa cách sync snapshot.yaml giữa Git ↔ Docker Sandbox; (4) Ghi thành kế hoạch con, chưa cần triển khai ngay | TODO |

Giai đoạn G – Vue Flow & Logic Core (Sơ đồ tri thức & xử lý bước 8.5)

****       ****       ****       ****       ****       ****

| ID | Giai đoạn | Tên Task | Mục tiêu | Nội dung chính | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 0052-VUE-FLOW-INTEGRATION | G | Tích hợp Vue Flow vào Nuxt (Read-only) | Có lớp hiển thị sơ đồ tri thức trực quan, nhúng trong layout Agency OS | (1) Cài thư viện Vue Flow trong dự án Nuxt/Agency OS; (2) Nhúng Vue Flow như một component trong layout/dashboard sẵn có, tái sử dụng Sidebar/Header/Button/Modal của Agency OS; (3) Chỉ triển khai chế độ Viewer thuần Read-only: hỗ trợ zoom/pan, chọn node, chuyển giữa các phiên bản graph; tuyệt đối không cung cấp bất kỳ tính năng Edit/Drag-drop nào trên Nuxt; (4) Vue Flow đọc JSON graph từ Directus/Agent Data và dùng thư viện Auto-Layout (Dagre/Elk…) để bố trí node; (5) Khi Agent/Backend cập nhật JSON graph, Nuxt chỉ refetch dữ liệu và render lại – không có state edit tạm (Pinia) trên client; (6) Hỗ trợ mô hình hybrid: Vue Flow là viewer mặc định, Mermaid.js là viewer dự phòng; cả hai chỉ đóng vai trò hiển thị read-only, không thao tác chỉnh sửa. | TODO |
| 0053-AGENTDATA-GRAPH-SCHEMA-EXTENSION | G | Mở rộng schema Agent Data/Directus cho graph Vue Flow | Có nơi lưu cấu trúc graph tách biệt, sạch & tuân thủ 3 vùng schema | (1) Thêm các field/collection cần thiết để lưu JSON graph (nodes, edges, metadata) cho mỗi Blueprint/quy trình; (2) Đảm bảo JSON chỉ chứa ID tham chiếu tới nội dung gốc (không copy text dài); (3) Gắn rõ schema_zone = growth cho toàn bộ schema graph; (4) Áp dụng naming convention: Vùng 2 (Lark) giữ nguyên tên gốc; Vùng 3 (graph/flow) dùng prefix rõ ràng (vd: flow_, ad_) để tránh nhầm với bảng hệ thống. | TODO |
| 0054-GRAPH-DATA-ACCESS | G | Chuẩn hoá cách đọc/ghi dữ liệu graph | Lắp ráp Directus SDK/nuxt-directus, không viết API backend mới | (1) Coi JSON graph là một field/collection trong Directus; (2) Trong Nuxt/Agency OS, bắt buộc dùng module nuxt-directus và các composable (useDirectusItems, useDirectusSingleton, …) để đọc/ghi JSON graph; (3) Không cài thêm @directus/sdk rời hay viết wrapper API mới; (4) Khi ghi graph, luôn kiểm tra schema_zone để không ghi nhầm sang Vùng 1 hoặc Vùng 2; (5) Ghi quy ước này vào kế hoạch để mọi Agent tuân thủ. | TODO |
| 0055-FLOW-TRANSLATOR-AGENT | G | Huấn luyện Agent “dịch” từ ngôn ngữ tự nhiên ↔ JSON Vue Flow (logic-only) | Biến lệnh kiểu “thêm bước 8.5 giữa 8 và 9” thành cập nhật logic nodes/edges, không động tới toạ độ x/y | (1) Thiết kế System Prompt & ví dụ cho Agent chuyên trách Flow Translator; (2) Định nghĩa input: mô tả quy trình hiện tại + yêu cầu thay đổi (ngôn ngữ tự nhiên hoặc mô tả thao tác mong muốn), KHÔNG dựa vào UI drag-drop trên Nuxt; (3) Định nghĩa output: JSON graph mới chỉ gồm danh sách nodes (id, type, metadata) và edges (from/to), không chứa toạ độ; (4) Quy định rõ: toàn bộ thao tác chỉnh sửa graph diễn ra ở tầng backend/Agent (cập nhật JSON lưu trong Agent Data/Directus); các viewer (Vue Flow, Mermaid.js) trên Nuxt chỉ refetch và hiển thị lại, luôn ở chế độ read-only; (5) Lưu prompt & ví dụ vào Agent Data để tái sử dụng. | TODO |
| 0056-VISUAL-DIFF-LOGIC | G | Chiến lược Diff đơn giản cho graph (tận dụng công cụ sẵn có) | Giúp User thấy khác biệt giữa phiên bản cũ/mới mà không phải tự code thuật toán so sánh đồ thị phức tạp | (1) Định nghĩa cách lưu hai phiên bản graph (cũ/mới) dưới dạng JSON trong Agent Data/Git để tận dụng sẵn Git Diff hoặc các thư viện Diff JSON có sẵn; (2) Trên Nuxt, ưu tiên hiển thị Side-by-side: bên trái là graph cũ, bên phải là graph mới (Vue Flow tự layout), User nhìn và so sánh bằng mắt; (3) Ràng buộc assemble: Ưu tiên tận dụng các công cụ có sẵn để so sánh hai phiên bản graph, ví dụ: Directus Versioning Compare UI (đối với collection bật Content Versioning) hoặc Git Diff cho file JSON graph. Trên Nuxt, chỉ render side-by-side (cũ/mới) hoặc nhúng view/iframe từ các công cụ này. CẤM viết mới thuật toán diff đồ thị hoặc diff JSON phức tạp trong code Nuxt/backend; chỉ được phép dùng các thư viện diff sẵn có ở mức tối thiểu nếu thật sự không thể dùng Directus/Git, và phải được ghi rõ trong kế hoạch; (4) Mọi mô tả về Diff cho graph trong kế hoạch này phải được hiểu là lớp UI lắp ráp lại (assemble) từ Directus/Git/engine sẵn có, không phải một engine versioning mới. Cross-ref Luật Data & Connection v1.1 – Điều 2 (Assemble > Build), Điều 20 (Versioning & Purge). | TODO |
| 0057-VUE-FLOW-APPROVAL-PIPELINE | G | Thiết kế pipeline phê duyệt riêng cho thay đổi trên Vue Flow (tận dụng Versioning sẵn có) | Đảm bảo “Draft graph” chỉ trở thành Official khi User đã duyệt trên hình, không tự code lại cơ chế versioning | (1) Với graph lưu trong Directus: bật Content Versioning cho collection tương ứng và dùng luôn cơ chế Draft/Version/Publish sẵn có; (2) Nuxt chỉ cần phân biệt bản hiển thị (Main/Approved) và bản đang xem thử (Version mới) thông qua Directus API, không tự xây engine trạng thái; (3) Nếu graph lưu trong Agent Data thuần, chỉ dùng một số field trạng thái tối thiểu (graph_draft, graph_approved) và dựa vào lịch sử version ở tầng dữ liệu (Git/Versioning đã có), tránh viết logic lịch sử riêng; (4) Luồng chuẩn: Agent/Editor tạo bản nháp → User xem Diff (side-by-side) trong Vue Flow trên Nuxt (preview, read-only) → Nếu OK, User mở link tương ứng trong Directus và phê duyệt phiên bản đó bằng Content Versioning; hệ thống chọn phiên bản được phê duyệt trong Directus làm bản chính (Main/Approved) và Nuxt chỉ hiển thị bản chính này; (5) Ghi lại tối thiểu thông tin phê duyệt (ai, khi nào, version nào được chọn) bằng cơ chế log/version có sẵn | TODO |

Giai đoạn H – Meta-field Registry & Search

****       ****       ****       ****       ****       ****

| ID | Giai đoạn | Tên Task | Mục tiêu | Nội dung chính | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 0060-META-FIELD-REGISTRY | H | Xây dựng & áp dụng Meta-field Registry (từ điển trường chuẩn) | Tránh trùng lặp/loạn tên 1500 trường–500 bảng, đảm bảo “Data Entered Once” ở tầng field | (1) Ưu tiên tận dụng metadata sẵn có của Directus (các bảng/field hệ thống, collection cấu hình…) như một “Meta-field Registry” mặc định; chỉ khi metadata của Directus không đáp ứng được yêu cầu thực tế thì mới xem xét tạo collection/bảng Registry riêng trong Agent Data, và việc tạo mới phải có quyết định/approval rõ ràng. Cấm tạo thêm bảng/collection Registry trùng chức năng một cách tùy tiện; (2) Quy định: mọi field mới trong Directus/Agent Data/Lark-migration đều phải tham chiếu tới một meta-field chuẩn – Agent bắt buộc phải tra Registry trước khi tạo field; (3) Thiết kế cơ chế phát hiện/hợp nhất các meta-field trùng/na ná (dùng view/list + review thủ công, không tự code thuật toán ML phức tạp); (4) Ghi luật này vào Agent Data để tất cả Agent tuân thủ khi sinh Blueprint/schema | TODO |
| 0061-KNOWLEDGE-SEARCH-STRATEGY | H | Thiết kế chiến lược Search cho Cổng tri thức (lắp ráp engine có sẵn) | Giúp tìm kiếm tri thức dễ dàng mà không tự xây “search engine” mới | (1) Quyết định sử dụng engine có sẵn: ưu tiên Vector Search (Qdrant) mà Agent Data đang dùng, kết hợp với khả năng filter của Agent Data/Directus (zone, sub_zone, topic, trạng thái…); filter ở Agent Data chỉ dùng để thu hẹp tập kết quả tìm kiếm nội bộ, còn việc một tài liệu có được hiển thị trên Nuxt hay không vẫn phải dựa trên trạng thái Published + user_visible trong Directus; (2) Nuxt chỉ đóng vai trò UI gọi các API search này (không tự code full-text search bằng SQL/JS thuần); (3) Thiết kế các chế độ search cơ bản: theo từ khóa, theo Zone/Sub-zone/Topic, theo loại tài liệu; (4) Ghi rõ cấm tự phát minh search engine (index thủ công, LIKE %, v.v.) khi đã có hạ tầng Qdrant/Directus; (5) Ghi strategy này vào Agent Data làm chuẩn cho mọi Agent khi đề xuất feature tìm kiếm | TODO |

III. Ghi chú sử dụng

Đây là file To-Do cấp hệ thống, dùng để điều hành & theo dõi tiến độ, không đi vào chi tiết CLI/prompt.

Mỗi task khi bắt đầu triển khai sẽ có thể tách thành kế hoạch con (ví dụ: plan cho Cursor, Gemini, Claude Code…) nhưng vẫn phải tham chiếu lại đúng ID (0028, 0035, 0044, 0047…).

Khi có điều chỉnh chiến lược, bổ sung task mới thì tiếp tục tăng ID (0052, 0053, …) để giữ lịch sử mạch lạc, tránh lẫn lộn giữa các giai đoạn.
