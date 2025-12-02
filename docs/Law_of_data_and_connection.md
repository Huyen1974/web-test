LUẬT LUỒNG DỮ LIỆU & KẾT NỐI

*(Data Flow & Connectivity Law cho Hệ sinh thái Agent)*

Phiên bản: 1.1 – Final Freeze (sau phê duyệt bởi Owner & Grok 4.1)

Ngày cập nhật: 24/11/2025

Phạm vi: toàn bộ hệ Web, Agent Data, CMS, Lark, các Agent và công cụ vệ tinh.

## Điều 0. Quan hệ với Hiến pháp chung

- Luật này là phụ lục chuyên đề về **Dữ liệu & Kết nối**, trực thuộc Hiến pháp hệ sinh thái Agent.
- Khi có mâu thuẫn, Hiến pháp chung và các HPLAW (HP02 IaC, HP05 Secrets, …) có hiệu lực cao hơn.
- Mọi Kế hoạch, PR, Terraform, thiết kế kiến trúc… phải chứng minh tuân thủ Luật này trước khi triển khai.  Cụ thể, Luật này viện dẫn trực tiếp các điều khoản trong Hiến pháp: HP06 (Kiến trúc hướng dịch vụ & tách dữ liệu gốc khỏi hiển thị), HP07 (Lộ trình tích hợp an toàn: Shadow Read → DualWrite → Cutover), HP05 (Quản lý Secrets & kết nối an toàn), HP08 (SLO bắt buộc cho vận hành) và các phụ lục liên quan (Phụ lục E – MySQL First, Phụ lục D – Quy hoạch hạ tầng WebTest). Khi có mâu thuẫn, các HPLAW tương ứng là căn cứ xử lý cuối cùng.

# Phần I. Mục tiêu & Nguyên tắc cơ bản

## Điều 1. Mục tiêu

- Định nghĩa rõ ràng **các luồng dữ liệu khép kín**, tránh rác, tránh vòng lặp khó kiểm soát.
- Liệt kê và phân loại **tất cả các thành tố** tham gia vào dòng chảy dữ liệu (Directus, Agent Data, Larkbase, Chatwoot, Qdrant, Nuxt Web, n8n, v.v.).
- Tạo “ngôn ngữ chung” cho con người và Agent (Cursor, Codex, Gemini, Grok…) khi thảo luận về kiến trúc dữ liệu.  Điều 2. Nguyên tắc chung

- **Closed Loop – Khép kín & tuần hoàn**
- Đầu ra của quy trình này là đầu vào của quy trình khác.
- Mọi tri thức hữu ích phải quay trở lại hệ thống để học lại.
- **No Garbage – Không rác trong kho chính**
- Phân biệt rõ:
- *Rác*: log thô, chat thô, trung gian, bản nháp chưa duyệt.
- *Vàng*: tri thức, bản ghi chính thức, kết quả đã duyệt.
- Rác chỉ được phép nằm ở vùng tạm (log, working memory), không được đẩy vào “kho chính”.
- **3 Lớp – Não, Kho, Cổng**
- Không trộn vai trò. Mỗi thành tố bắt buộc phải nằm rõ ở 1 lớp chính (có thể có vai phụ nhưng vẫn phải chỉ ra).
- Các luồng dữ liệu luôn đi theo trật tự: **Cổng → Não → Kho** (hoặc ngược lại khi hiển thị).
- **SSOT theo loại dữ liệu**
- Mỗi loại dữ liệu phải có **một nguồn chân lý (Single Source of Truth)** đã được chỉ định rõ. Không được có 2 SSOT cho cùng một loại.
- **Assemble > Build**
- Ưu tiên lắp ghép tính năng sẵn có (Directus, n8n, Lark flow…) trước khi tự code dịch vụ mới.
- **Hạ tầng tách biệt khỏi dữ liệu**
- Cloud Run, Cloud Functions, Antigravity… là lớp hạ tầng.
- Dữ liệu luôn thuộc về một trong 3 lớp **Não/Kho/Cổng**, không gắn trực tiếp với hạ tầng.

# Phần II. Các lớp & thành tố tham gia (3 Layers)

## Điều 3. Lớp NÃO (Brain)

- **Vai trò**
- Suy luận, quyết định, điều phối các Agent con.
- Thực hiện tìm kiếm vector, tổng hợp, trả lời.
- Nơi chứa “bộ não sống” của hệ thống (working memory, context, model execution).
- **Thành tố chính**
- **Agent Data Core**
- Dịch vụ FastAPI/Langroid triển khai trên GCP (Cloud Run / Functions).
- Các Agent: DocChatAgent, TaskAgent, IntegrationAgent, v.v.
- Gắn với:
- **Qdrant**: vector store (embedding tri thức).
- **Firestore (work)**: context, session, trạng thái Agent, log tóm tắt.
- **Các AI công cụ / IDE Agent** (ở góc nhìn Data, vẫn thuộc Não):
- Cursor, Codex, Gemini CLI, Claude Code, Google Antigravity (nếu dùng).
- Không lưu trữ lâu dài; chủ yếu:
- Đọc GitHub / hạ tầng.
- Gọi API Agent Data, Directus, Lark…
- Sinh mã, sửa mã, điều khiển CI/CD.
- **Luật phân vùng Schema (3 Zone)**
- Toàn bộ schema Directus/Agent Data phải được chia rõ thành ba vùng:
- **Core Zone**: gồm các bảng hệ thống của Directus (bắt đầu bằng directus_) và các bảng chuẩn của Agency/ứng dụng lõi. Tuyệt đối **không** cho phép Agent hoặc workflow tự động DROP/DELETE/ALTER bảng hoặc trường trong vùng này. Mọi thay đổi chỉ được làm thủ công bởi Admin theo quy trình đặc biệt.
- **Migration Zone**: gồm các bảng/bộ dữ liệu được nhập từ Lark Base hoặc hệ thống cũ. Dữ liệu đi **một chiều** từ nguồn cũ sang đây; không ghi đè dữ liệu gốc và luôn kèm thông tin nguồn (origin_system, origin_table, origin_id).
- **Growth Zone**: gồm các bảng mới sinh ra trong quá trình vận hành (bảng log nghiệp vụ, graph, blueprint, cấu hình bổ sung…). Đây là vùng duy nhất mà Agent được phép đề xuất tạo/sửa schema, nhưng vẫn phải qua cơ chế Draft → Review → Approved nêu tại các phụ lục khác.
- Mọi thiết kế schema, PR hoặc plan mới khi chạm tới Directus/Agent Data đều phải ghi rõ mỗi bảng/collection thuộc Zone nào; nếu không phân loại được thì **không được triển khai**.
- **Giới hạn**
- Não không phải nơi lưu trữ bản ghi chính thức dài hạn.
- Mọi dữ liệu lâu dài phải được “đẩy về Kho” theo các luồng quy định.

## Điều 4. Lớp KHO (Warehouse)

- Vai trò
- Lưu trữ bản ghi chính thức (official records) và tri thức đã ban hành.
- Quản lý schema, version, phân quyền và lịch sử chỉnh sửa.
- Là nơi thực thi các quy định phân vùng schema (Core / Migration / Growth) đã nêu tại Điều 3 đối với Directus, MySQL và các kho “official” khác.
- Thành tố chính
- Cloud SQL MySQL
- Database chính cho Directus và một số service MySQL-first.
- Là SSOT cho phần lớn bảng nghiệp vụ (students, jobs, tasks, projects, tickets, v.v.) được quản lý qua Directus.
- Mọi bảng/collection tương ứng trong Directus/MySQL phải được gán rõ Zone (Core/Migration/Growth) theo Điều 3; kho MySQL chỉ là “lớp vật lý” thực thi các phân vùng đó.
- Cloud SQL Postgres (hoãn theo Phụ lục E – “MySQL First”)
- Dự kiến dùng cho các dịch vụ bắt buộc Postgres (ví dụ: Kestra hoặc một số dịch vụ chuyên biệt) trong các giai đoạn sau (ví dụ: Giai đoạn D theo Plan V12), chỉ sau khi MySQL + Directus đã ổn định.
- Giai đoạn 1 (MVP Web + Agent Data): chưa triển khai Postgres; Chatwoot (nếu sử dụng) tạm thời dùng MySQL chung với Directus hoặc một cấu hình tối giản khác theo thiết kế riêng để giảm độ phức tạp hạ tầng.
- Khi được bật, mọi schema trong Postgres cũng phải tuân thủ:
- Quy định SSOT theo loại dữ liệu (Điều 7),
- Quy định phân vùng schema (áp dụng tương tự Core/Migration/Growth nếu có),
- Và HP-02 (IaC tối thiểu, mọi thay đổi qua Terraform/GitOps, không tạo tay ngoài kế hoạch).
- Directus (ứng dụng CMS)
- CMS chính cho toàn hệ.
- Là bề mặt quản lý và áp dụng 3 Vùng Schema trong thực tế:
- Core Zone: Bảng hệ thống (directus_*, agency_*) và bảng lõi do con người thiết kế, bất khả xâm phạm đối với Agent và workflow tự động.
- Migration Zone: Bảng dữ liệu nhập từ Lark Base/hệ thống cũ (một chiều, có origin_system, origin_table, origin_id).
- Growth Zone: Bảng mới do Agent đề xuất / hệ thống mở rộng, phải tuân quy trình duyệt (Draft → Review → Published).
- Directus là SSOT cho:
- Bảng nghiệp vụ: students, jobs, tasks, projects, tickets, v.v.
- Bảng cấu hình, danh mục (lookup tables).
- Bảng metadata mô tả tài liệu tri thức (kế hoạch, phụ lục, văn bản pháp lý…).
- Google Cloud Storage (GCS)
- Lưu file gốc: PDF, DOCX, hình ảnh, video, bản vẽ, tài liệu scan.
- Là SSOT cho “file vật lý” của tri thức (document gốc).
- Tổ chức theo bucket/thư mục tách bạch: documents/, media/, logs/, backups/… để tránh lẫn giữa nội dung chính thức và log/snaphot.
- Firestore (official)
- Các collection được chỉ định là nguồn chính thức (ví dụ: cây Project, MPC manifest, cấu trúc hệ thống…) – phân biệt rõ với Firestore “work” của Não.
- Mỗi collection official phải được liệt kê và mô tả trong thiết kế (kế hoạch / phụ lục) tương ứng, ghi rõ: loại dữ liệu, SSOT, thời gian giữ.
- GitHub
- SSOT cho mã nguồn ứng dụng, module Agent, Terraform, pipeline CI/CD.
- Toàn bộ hạ tầng và logic workflow (Kestra/Workflows/n8n…) phải được quản lý qua GitOps; mọi thay đổi hạ tầng đi qua PR/Review, không chỉnh tay trực tiếp trên console.
- Secret Manager
- Kho lưu trữ secrets (API key, token, mật khẩu DB, cấu hình nhạy cảm).
- Không phải dữ liệu nghiệp vụ, nhưng là SSOT cho cấu hình bảo mật, được tham chiếu bởi tất cả kết nối (Điều 16, Điều 17).
- Tuyệt đối không commit secrets lên GitHub hoặc lưu trong bảng nghiệp vụ của Directus.
- Giới hạn & ràng buộc kỹ thuật
- Kho phải “sạch”:
- Không chứa log thô, không chứa chat thô, không chứa toàn bộ request/response của model.
- Log, chat, trace chi tiết phải nằm ở Cloud Logging, Chatwoot, Firestore work hoặc các kho log chuyên dụng.
- Mọi thao tác ghi vào Kho (MySQL, Directus, Firestore official, GCS, v.v.) phải:
- Đi thông qua API/flow chuẩn đã được quy định (Directus API, Agent Data API, Directus Flows, n8n/Workflows, v.v.),
- Tuân thủ phân vùng schema (Core/Migration/Growth) – cấm Agent/flow tự động ghi vào Core Zone,
- Có cơ chế kiểm duyệt rõ ràng (Agent đề xuất → người duyệt → publish) đối với các thay đổi quan trọng.
- Cấm kết nối trực tiếp từ Cổng (Nuxt, Chatwoot, Lark, BI tools, v.v.) xuống database (MySQL/Postgres/Firestore official) mà bỏ qua API/flow đã quy định – mọi kết nối loại này được coi là vi phạm Luật và phải bị gỡ bỏ trong review kiến trúc/PR tiếp theo.

## Điều 5. Lớp CỔNG (Gate)

- Vai trò
- Là nơi con người và các hệ thống bên ngoài “chạm” vào hệ sinh thái Agent (gửi yêu cầu, xem kết quả, kích hoạt quy trình).
- Thu nhận dữ liệu đầu vào (form, chat, file, event), hiển thị kết quả đầu ra (UI, dashboard, báo cáo).
- Chỉ giữ trạng thái tạm thời (session, view, log hội thoại); không phải SSOT cho bất kỳ loại dữ liệu nào – mọi dữ liệu chính thức phải quay về Lớp Kho theo các luồng ở Phần IV.
- Thành tố chính
- Nuxt Web (Agency OS)
- Cổng hiển thị chính thức, xây dựng trên nền tảng Agency OS / Nuxt.
- Sử dụng module **nuxt-directus** và các composable chuẩn (useDirectusItems, useDirectusSingleton, …) để đọc dữ liệu đã Published từ Directus; có thể gọi API Agent Data để dùng chức năng AI, tra cứu nâng cao.
- Tích hợp Vue Flow ở chế độ Read-only để hiển thị quy trình, graph, luồng tác vụ;
- CẤM code tính năng chỉnh sửa (Edit/Drag-drop, tạo node mới…) trực tiếp trên Web cho đến khi có luật riêng cho việc này.
- Không được truy cập trực tiếp MySQL/Postgres/Firestore official; mọi dữ liệu phải đi qua API chính thức (Directus/Agent Data) như quy định tại Điều 16–17.
- Chatwoot
- Cổng giao tiếp đa kênh (Web chat, Zalo, Messenger, v.v.) cho khách hàng và học viên.
- Lưu log hội thoại thô tại chính Chatwoot (hoặc kho log), không đẩy toàn bộ thô sang Directus/MySQL.
- Nhiệm vụ:
- Hứng chat và chuyển tiếp sự kiện (webhook có ký số – verify HMAC) về Agent Data xử lý (new_message, conversation_updated…),
- Cho phép Human Override: nhân viên trả lời thủ công, nhưng vẫn gửi sự kiện về Agent Data để phục vụ học lại (Điều 9).
- Lark Suite (Messenger / Base / Docs / Sheets)
- Lark Messenger: Cổng chat nội bộ / với học viên; có thể kích hoạt Agent qua command, menu, bot.
- Lark Base: Nguồn dữ liệu legacy & bảng nghiệp vụ hiện có – được coi là Cổng nhập liệu thô trước khi dữ liệu được làm sạch và đưa vào Kho (Migration Zone).
- Lark Docs / Sheets: Tài liệu và bảng ad-hoc – nguồn tri thức và dữ liệu tạm thời.
- Dữ liệu từ Lark luôn được xem là nguồn vào (source), không là SSOT; muốn đưa vào hệ thống phải đi qua luồng ingest (Directus Flows / job ingest) và phân vùng lại ở Lớp Kho (Điều 11).
- Google Sheets / Excel
- Nguồn dữ liệu nhập tay, tạm thời, dùng cho các đợt khảo sát, import, thống kê ad-hoc.
- Không được coi là SSOT; trước khi ghi vào Kho, dữ liệu phải được:
- làm sạch (cleanse),
- map schema,
- gắn thông tin nguồn (origin_system, origin_table, origin_id) theo Điều 11.
- Directus Flows
- Công cụ tích hợp & tự động hóa chính thức trong Giai đoạn 1 (Anti-Stupid – ưu tiên lắp ghép hơn viết script).
- Dùng để:
- Đồng bộ dữ liệu từ Lark Base / Docs / Sheets → Directus/MySQL (đặc biệt vào Migration Zone),
- Xử lý webhook (từ Lark, từ hệ thống khác) và đẩy dữ liệu vào Kho,
- Gọi Agent Data/AI qua HTTP để thực hiện các tác vụ tự động đơn giản.
- Thay thế cho việc viết các script Python thủ công không được quản lý (giảm rác code, dễ audit).
- n8n / Zapier / Google Cloud Workflows
- Công cụ dự phòng cho các luồng phức tạp hơn hoặc tích hợp với dịch vụ bên ngoài (email, CRM, SMS, v.v.) mà Directus Flows không xử lý tốt.
- Nguyên tắc:
- Giai đoạn 1: chỉ dùng khi Directus Flows không đáp ứng được, và vẫn phải gọi API chính thức (Directus, Agent Data…), không được truy cập DB trực tiếp.
- Google Cloud Workflows ưu tiên cho các job hạ tầng trong GCP (cleanup Qdrant, dọn rác, batch nội bộ).
- Kestra (HOÃN theo Phụ lục E – MySQL First)
- Orchestrator mạnh cho quy trình batch/pipeline phức tạp, nhiều bước, nhiều hệ.
- Tuy nhiên, tạm hoãn triển khai cho đến khi:
- Hạ tầng Postgres sẵn sàng theo chiến lược 2-SQL,
- Các luồng nền tảng đã ổn định (MySQL + Directus Flows + ingest Lark).
- Mọi đề xuất dùng Kestra ở Giai đoạn 1 được xem là ngoại lệ, phải lập Phiếu đăng ký theo Điều 22.
- BI tools (Looker Studio, Data Studio, …)
- Cổng hiển thị dashboard, báo cáo phân tích.
- Chỉ đọc dữ liệu từ Directus/API hoặc các bảng tổng hợp/read-only; không ghi ngược về DB vận hành.
- Canvas ChatGPT / NotebookLM (và các công cụ soạn thảo AI khác)
- Cổng soạn thảo ban đầu cho Hiến pháp, Phụ lục, kế hoạch, tài liệu học.
- Sau khi văn bản ổn định:
- Bản chính thức phải được lưu file ở GCS (governance/…, laws/…, plans/…) và
- Lưu metadata (phiên bản, hiệu lực, loại văn bản…) ở Directus,
- Rồi mới được ingest vào Agent Data theo Luồng hoạch định & pháp lý (Điều 14).
- Bản trên Canvas/NotebookLM chỉ là vùng nháp, không là SSOT.
- Giới hạn & ràng buộc
- Lớp Cổng KHÔNG ĐƯỢC:
- Truy cập trực tiếp vào database (MySQL/Postgres/Firestore official) của Lớp Kho,
- Tự ý lưu bản ghi nghiệp vụ “chính thức” mà bỏ qua các luồng quy định ở Phần IV (tri thức, ingest, quy trình, governance).
- Lớp Cổng CHỈ ĐƯỢC PHÉP:
- Gọi API chính thức (Directus REST/GraphQL, Agent Data, Lark API, v.v.) theo nguyên tắc kết nối tại Điều 16,
- Gửi/nhận webhook đã đăng ký (Chatwoot, Lark, Directus Flows, n8n/Workflows, v.v.) và phải tuân thủ yêu cầu bảo mật (verify HMAC, dùng secret từ Secret Manager),
- Lưu log/chat tạm thời tại chính hệ thống cổng (Chatwoot, Lark, …) hoặc kho log chuyên dụng, nhưng không đẩy thô vào Kho.
- Mọi cổng mới (ứng dụng web/mobile, chatbot mới, CRM mới…) đều phải:
- Được phân loại rõ thuộc Lớp Cổng,
- Đăng ký luồng dữ liệu và kết nối theo Điều 21–22 trước khi triển khai.

# Phần III. $1

- **Dữ liệu tri thức (Knowledge)**
- Ví dụ: tài liệu hướng dẫn, kịch bản CSKH, FAQ, thông tin pháp lý tĩnh, tài liệu đào tạo.
- **SSOT:** Agent Data (Qdrant) giữ embedding & bản tóm tắt; Directus giữ metadata (tiêu đề, loại tài liệu, trạng thái publish, liên kết file gốc).
- Nguyên tắc: text gốc nằm ở kho bền vững (GCS/Directus), Qdrant chỉ lưu embedding + ID tham chiếu.
- **Dữ liệu nghiệp vụ (Business Data)**
- Ví dụ: hồ sơ học viên (students), tin tuyển dụng (jobs), ticket, đơn đăng ký, trạng thái xử lý yêu cầu.
- **SSOT:** MySQL/Directus – là nguồn sự thật duy nhất cho bản ghi nghiệp vụ.
- Agent Data chỉ được phép giữ cache / snapshot / embedding và phải quay lại Directus khi cần số liệu chính xác mới nhất.
- **Log & sự kiện (Events & Logs)**
- Ví dụ: log request/response, chat thô, event từ webhook, trạng thái queue, trace kỹ thuật.
- **SSOT:** Cloud Logging & kho log chuyên dụng của từng dịch vụ (Chatwoot, Lark, Agent Data…), Firestore “work” hoặc storage log cho một số trạng thái tạm.
- Directus chỉ nhận bản tóm tắt đã chọn lọc (insight, cảnh báo, ticket), không sao chép toàn bộ log thô.
- **Config & Hạ tầng (Config / Infra)**
- Ví dụ: file cấu hình workflow, blueprint, Terraform, secrets, thông số CI/CD.
- **SSOT:** GitHub (repo hạ tầng & ứng dụng), Secret Manager (đối với secrets), Terraform state (đối với tài nguyên cloud).
- Directus chỉ được dùng để lưu metadata mô tả (ví dụ: tên workflow, trạng thái “đã duyệt”), không lưu file YAML/JSON dài hạn của quy trình.

## Điều 6. Phân loại dữ liệu

- **Dữ liệu tri thức (Knowledge Docs)**
- Ví dụ: Kế hoạch, Hiến pháp, Phụ lục, bài học, hướng dẫn, policy.
- **Dữ liệu nghiệp vụ (Business Records)**
- Ví dụ: hồ sơ học viên, khóa học, lớp, đơn hàng, ticket, nhiệm vụ, KPI.
- **Log & sự kiện (Events & Logs)**
- Ví dụ: chat thô, request/response, error logs, event từ webhook.
- **Cấu hình & metahạ tầng (Config & Infra Metadata)**
- Ví dụ: Terraform state, CI/CD pipeline, mapping ID, secrets, role mapping.

## Điều 7. Chỉ định SSOT theo loại dữ liệu

- **Tri thức (Knowledge Docs)**
- **File gốc**: SSOT tại GCS.
- **Metadata** (tiêu đề, slug, trạng thái, ngôn ngữ, tag…): SSOT tại Directus.
- **Embedding/Vector**: chỉ là bản chiếu tại Qdrant, không là SSOT; luôn tham chiếu lại ID của Directus/GCS.
- **Dữ liệu nghiệp vụ**
- **Bảng nghiệp vụ chuẩn** (students, jobs, tasks…): SSOT tại MySQL/Directus.
- Agent Data chỉ giữ:
- cache / snapshot cần thiết.
- embedding từ một số trường quan trọng.
- Khi trả lời, nếu cần dữ liệu chính xác (số tiền, trạng thái mới nhất…), Agent phải tra lại Directus.
- **Log & sự kiện**
- SSOT tại:
- Cloud Logging (hệ thống)
- Kho log riêng của Chatwoot, Lark, Agent Data (nếu có).
- Directus chỉ nhận:
- Bản tóm tắt (summary) đã qua chọn lọc: Insight, ticket, cảnh báo chính thức.
- **Cấu hình & metahạ tầng**
- Terraform, CI/CD: SSOT tại GitHub repo.
- Secrets: SSOT tại Secret Manager.
- Mapping ID, routing rules: SSOT tại các bảng cấu hình trong Directus hoặc Firestore (được chỉ định rõ).

# Phần IV. Các luồng dữ liệu khép kín (Data Flows)

## Điều 8. Luồng tri thức (Knowledge Flow)

**Mục tiêu:** Biến tri thức thô → tài liệu chính thức → tri thức được Agent “học”.

- **Cổng (Gate)**
- Tài liệu mới được soạn trên Canvas, Lark Docs, Google Docs, hoặc tải file lên GCS qua giao diện.
- **Não (Brain)**
- Agent Data nhận yêu cầu ingest:
- tải file từ GCS,
- tách nội dung,
- tạo embedding và tóm tắt (summary).
- **Kho (Warehouse)**
- Agent gọi API Directus:
- tạo bản ghi document (metadata).
- Người dùng vào Directus, chỉnh sửa, duyệt và chuyển **Draft → Published**.
- **Feedback Loop**
- Directus phát webhook “document_published”.
- Agent Data lắng nghe, vector hóa lại bản mới nhất, cập nhật Qdrant.
- Từ đó, các Agent khác truy vấn sẽ thấy tri thức mới.

## Điều 9. Luồng giao tiếp (Communication / CSKH Flow)

**Mục tiêu:** Xử lý khối lượng lớn chat mà không biến toàn bộ thành rác trong Kho.

- **Cổng**
- Khách gửi tin nhắn qua Web chat / Zalo / Messenger → Chatwoot ghi log hội thoại.
- **Não**
- Chatwoot gửi webhook “new_message” → Agent Data.
- Agent Data:
- tra cứu tri thức trong Qdrant,
- gọi Directus nếu cần thông tin nghiệp vụ (trạng thái đơn hàng, lịch học…),
- soạn câu trả lời.
- **Cổng**
- Agent Data trả lại Chatwoot → gửi phản hồi cho khách.
- **Human Override (Nhân viên trả lời thủ công)**
- Khi nhân viên CSKH trả lời trực tiếp trong Chatwoot (không dùng gợi ý của Agent), Chatwoot vẫn phải gửi event/webhook tương ứng sang Agent Data (kèm thông tin ai đã trả lời, thời điểm, nội dung).
- Agent Data lưu cặp {ngữ cảnh hội thoại, câu trả lời của con người} vào vùng học với cờ đánh dấu (ví dụ: gold_sample_candidate = true) **và đồng thời kích hoạt quy trình vector hóa lại đoạn hội thoại này**, tạo embedding gắn nhãn gold_sample_candidate.
- Các pipeline huấn luyện lại (finetune, cập nhật vector, xây guideline trả lời) chỉ được sử dụng những mẫu đã qua bước lọc/duyệt; sau khi được xác nhận là “Gold Sample” chính thức, các vector tương ứng mới được đưa vào vùng tìm kiếm ưu tiên trong lần truy vấn sau. **Không** tự động học từ mọi câu trả lời của con người để tránh lan truyền sai sót tạm thời.

## Điều 10. Luồng quy trình (Workflow Execution Flow)

**Mục tiêu:** Tự động hóa công việc lặp lại với log rõ ràng.

- **Cổng / Não**
- Trigger từ Web, Chatwoot hoặc một Agent nội bộ (ví dụ: “tạo lịch học”, “nhắc deadline”).
- **Não**
- Agent Data phân tích yêu cầu, quyết định gọi quy trình nào (Kestra / Workflows / n8n).
- **Cổng – Orchestrator**
- Kestra / Workflows / n8n thực thi:
- gửi email,
- cập nhật hệ thống khác,
- chấm điểm, v.v.
- **Kho**
- Sau khi xong, orchestrator gọi Directus cập nhật trạng thái (status, completed_at, error_message nếu có).
- Agent Data có thể ghi tóm tắt vào Firestore / Qdrant nếu cần cho học lại.     o Phân tách rõ trách nhiệm dữ liệu:

- **Logic quy trình & Cấu trúc Graph** (YAML/JSON/Blueprint): SSOT tại GitHub (mã nguồn) và Directus (để phục vụ hiển thị Vue Flow).
- **Quy tắc Read-only:** Nuxt chỉ đọc JSON từ Directus để hiển thị (Read-only). Tuyệt đối không lưu trạng thái kéo thả (Drag-drop) từ Nuxt ngược về Database.
- **Trạng thái chạy** (chạy lần thứ mấy, log chi tiết, retry, schedule…) có SSOT tại database nội bộ của công cụ orchestrator (Kestra, Workflows, n8n…). Không sync toàn bộ log/trạng thái này sang Directus/MySQL.
- **Kết quả nghiệp vụ** (ví dụ: đơn đã được tạo, yêu cầu đã được duyệt, báo cáo đã gửi xong) mới được ghi vào Directus/MySQL dưới dạng vài trường kết quả rõ ràng. Directus không trở thành kho lưu log workflow hoặc mã config quy trình.  Điều 11. Luồng nhập dữ liệu nguồn (Legacy Ingestion Flow)

Mục tiêu: Di chuyển dữ liệu từ Lark Base / Sheets / hệ cũ sang hệ mới mà không làm vỡ cấu trúc và không mất dấu nguồn gốc; mọi bước phải tuân chiến lược MySQL First và các quy định 3 Vùng Schema (Core / Migration / Growth).

- Cổng (Gate)
- Dữ liệu gốc (legacy) nằm ở:
- Lark Base (bảng nghiệp vụ hiện có),
- Lark Sheets / Google Sheets,
- các file Excel/CSV hoặc hệ quản lý cũ khác.
- Tất cả các nguồn này được xem là Nguồn dữ liệu thô (raw source), không là SSOT.
- Não & công cụ xử lý (Brain + Tools)
- Directus Flows là công cụ ingest & chuẩn hoá chính thức trong Giai đoạn 1 cho các luồng nhập liệu từ Lark / Sheets / CSV vào hệ thống.
- Agent Data hoặc job ingest riêng chỉ được dùng trong các trường hợp đặc biệt (đã được nêu rõ trong kế hoạch), nhưng vẫn phải ghi dữ liệu cuối cùng qua Kho theo đúng luật.
- Quy trình xử lý chuẩn gồm các bước:
- Đọc dữ liệu từ nguồn (Lark Base API, file CSV/Excel, Google Sheets…).
- Cleanse & chuẩn hoá:
- Chuẩn hoá định dạng (ngày tháng, số, mã trạng thái…),
- Chuẩn hoá giá trị (ví dụ “Nam/Nữ” → enum chuẩn),
- Map các ID cũ sang schema mới.
- Gắn thông tin nguồn cho từng bản ghi:
- origin_system (ví dụ: lark_base, legacy_excel),
- origin_table hoặc tên sheet,
- origin_id (ID/bộ khoá gốc).
- Ghi (hoặc cập nhật) bảng mapping ID (dạng id_mapping_registry hoặc bảng cấu hình tương đương) trong Kho để lưu quan hệ ID cũ ↔ ID mới, giúp các luồng khác tra cứu lại; không để mapping “chết” trong code của job.
- Nguyên tắc Anti-Script: hạn chế tối đa việc viết các script Python/Node.js ingest rời rạc bên ngoài Directus; nếu bắt buộc phải dùng, phải:
- gọi API/Flows chính thức,
- được mô tả rõ trong kế hoạch,
- và không bypass luật 3 Vùng Schema.
- Kho (Warehouse)
- Dữ liệu sau khi cleanse & gắn nguồn phải được ghi vào Migration Zone trong Directus (các bảng hoặc schema được đánh dấu thuộc Migration theo Điều 3 & Điều 4).
- Tuyệt đối KHÔNG:
- ghi đè, xoá, hoặc chỉnh sửa trực tiếp bảng/field thuộc Core Zone,
- tạo bảng mới trong Core Zone để chứa dữ liệu nhập từ legacy.
- Việc chuyển dữ liệu từ Migration Zone → bảng nghiệp vụ chính (Growth/Core) phải đi qua quy trình riêng có người duyệt (có thể là flow khác, thủ tục kiểm tra đối soát, hoặc UI migrate trong Directus) – không “đổ thẳng” từ legacy vào bảng nghiệp vụ đang dùng.
- Lộ trình tích hợp (Tuân thủ HP-07) Đối với các luồng ingest lớn / dịch chuyển hệ thống, bắt buộc tuân thủ lộ trình 3 bước của HP-07:
- Shadow Read
- Chỉ đọc dữ liệu từ nguồn cũ,
- Chạy pipeline cleanse + mapping nhưng chưa ghi vào bảng nghiệp vụ chính; có thể ghi tạm vào Migration Zone hoặc bảng tạm để kiểm tra,
- Ghi log/đối soát để kiểm tra xem số lượng, phân bố, mapping có hợp lý không.
- Dual-Write
- Chạy song song hai hệ thống (cũ và mới) trong một khoảng thời gian,
- Ghi dữ liệu mới đồng thời vào cả legacy và hệ mới (hoặc ghi vào hệ mới, nhưng vẫn giữ legacy để so sánh),
- So sánh dữ liệu (số dòng, tổng số, thống kê) để đảm bảo kết quả khớp 100% hoặc nằm trong ngưỡng chấp nhận được (SLO).
- Cutover
- Sau khi đối soát đạt yêu cầu, chuyển hẳn sang hệ mới (Directus/MySQL, dùng bảng nghiệp vụ chính),
- Khoá đường ghi mới vào hệ cũ (chỉ giữ để tra cứu lịch sử nếu cần),
- Cập nhật Hiến pháp / Kế hoạch / metadata trong Directus để đánh dấu hệ mới là SSOT chính thức cho loại dữ liệu đó.

## Điều 12. (Tuỳ chọn) Luồng quản trị & IaC

Tóm tắt để không bỏ quên thiết kế hạ tầng:

- **Cổng**: Cursor, Gemini CLI, Codex, Claude Code.
- **Não**: các Agent DevOps (sau này có thể được formal hoá).
- **Kho**: GitHub (mã nguồn, Terraform, pipeline).

Dữ liệu đi theo:

- Issues / kế hoạch → PR / commit → apply Terraform → trạng thái hạ tầng.  Quy trình chi tiết được định nghĩa trong các phụ lục IaC (HP02, GHLAW…).

## Điều 13. Luồng phân tích & báo cáo (Analytics / BI Flow)

**Mục tiêu:** sử dụng lại dữ liệu đã có trong Kho để tạo báo cáo, dashboard, mà không phá vỡ SSOT.

- **Kho**
- Dữ liệu nghiệp vụ nằm tại Directus/MySQL, một phần official tại Firestore.
- **Não**
- Job ETL (có thể chạy qua Agent Data, n8n hoặc Workflows) đọc dữ liệu từ API Directus / Firestore.
- Chuẩn hoá, gom nhóm, tính toán các chỉ số KPI, nhưng không chỉnh sửa bản ghi gốc.
- **Cổng**
- Công cụ BI (Looker Studio, Data Studio, BigQuery BI Engine, v.v.) đọc bảng tổng hợp (hoặc trực tiếp từ API).
- Dashboard chỉ đọc (readonly), không ghi ngược về DB.
- **Kho (tuỳ chọn)**
- Kết quả phân tích dài hạn (ví dụ snapshot KPI tháng) có thể được ghi ngược vào các bảng analytics_* trong Directus để các Agent và Web có thể đọc lại.

## Điều 14. Luồng hoạch định & pháp lý (Planning / Governance Flow)

**Mục tiêu:** đảm bảo các tài liệu Hiến pháp, Phụ lục, kế hoạch… được lưu trữ đúng chỗ và trở thành tri thức cho Agent.

- **Cổng**
- Tài liệu được soạn trên Canvas, Lark Docs, Google Docs hoặc tải lên từ máy cá nhân.
- **Kho**
- Bản PDF/DOCX chính thức được đẩy vào GCS (thư mục governance/, laws/, plans/…).
- Metadata (phiên bản, ngày hiệu lực, trạng thái: draft/valid/obsolete, phạm vi áp dụng) lưu tại Directus.
- **Não**
- Agent Data ingest các tài liệu đã status = valid từ Directus:
- tóm tắt,
- vector hoá vào Qdrant,
- gắn tag loại văn bản (Hiến pháp, Phụ lục D, Phụ lục F, v.v.).
- **Feedback**
- Khi có bản thay thế (supersede), Directus phát event để Agent Data:
- cập nhật embedding,
- đánh dấu version cũ là obsolete trong working memory, tránh trả lời dựa trên luật hết hiệu lực.

## Điều 15. Luồng giám sát & cảnh báo (Monitoring / Alert Flow)

**Mục tiêu:** phát hiện sớm lỗi / sự cố trong các luồng dữ liệu ở trên.

- **Não & Kho**
- Tất cả dịch vụ (Web, Agent Data, Directus, n8n, Kestra…) ghi log có cấu trúc vào Cloud Logging.
- Các chỉ số (error rate, latency, tần suất event, số lượng message queue) được xuất sang Cloud Monitoring.
- **Cổng**
- Cảnh báo được đẩy tới: email, Lark, Chatwoot, hoặc dashboard giám sát.
- **Kho (tuỳ chọn)**
- Các “sự cố đã xác nhận” có thể được lưu thành ticket trong Directus (bảng incidents) để phục vụ phân tích retrospective và huấn luyện Agent vận hành.

# Phần V. Quy định về kết nối (Connectivity Protocols)

## Điều 16. Nguyên tắc kết nối

- Ưu tiên **HTTP API / Webhook / Pub/Sub**; tránh kết nối trực tiếp DB.
- Mỗi cặp Source–Destination phải có:
- giao thức (REST, GraphQL, webhook, Pub/Sub),
- phương thức bảo mật (WIF, OAuth, key từ Secret Manager),
- giới hạn (readonly hay readwrite).
- Các quy định kỹ thuật bắt buộc hiện tại:
- **Nuxt → Directus**: khi dùng Nuxt với Directus, bắt buộc ưu tiên module/SDK chính thức và các composable chuẩn (ví dụ: useDirectusItems, useDirectusSingleton hoặc tương đương) để đọc/ghi dữ liệu; không được tự viết lớp truy cập MySQL trực tiếp từ Nuxt.
- **Agent / Orchestrator → Directus**: Agent (Agent Data) và các công cụ như n8n, Kestra, Workflows… khi cần thao tác với dữ liệu/kho Directus phải gọi REST API/GraphQL chính thức của Directus (hoặc SDK serverside chuẩn); cấm kết nối thẳng tới Cloud SQL MySQL ở tầng ứng dụng.
- **Chatwoot → Agent Data**: mọi webhook từ Chatwoot vào Agent Data bắt buộc phải bật và kiểm tra chữ ký (signature/secret) trước khi chấp nhận payload, để tránh request giả mạo hoặc spam lợi dụng webhook.     Điều 17. Bảng quy định kết nối chi tiết

Bảng này liệt kê các kết nối “chuẩn” được phép giữa các thành tố trong 3 lớp Não – Kho – Cổng. Mọi kết nối ngoài bảng phải đăng ký bổ sung theo quy trình tại Phần VII trước khi triển khai.

****       ****       ****       ****       ****                                      ****

| STT | Nguồn (Source) | Đích (Destination) | Giao thức (Protocol) | Yêu cầu kỹ thuật & Ghi chú (bắt buộc) |
| --- | --- | --- | --- | --- |
| 1 | Nuxt Web | Directus | Module nuxt-directus / REST / GraphQL | Bắt buộc dùng composables (useDirectusItems, …); chỉ đọc nội dung đã Published; cấm truy vấn MySQL trực tiếp từ Nuxt. |
| 2 | Nuxt Web | Agent Data | REST / gRPC | Gọi chức năng AI, tra cứu nâng cao; không dùng để thao tác trực tiếp với Kho (Directus/MySQL). |
| 3 | Chatwoot | Agent Data | Webhook | Sự kiện new_message, conversation_updated; bắt buộc verify signature (HMAC) trước khi chấp nhận payload (Anti-fake webhook). |
| 4 | Directus | Agent Data | Webhook | Sự kiện content_published, record_updated dùng cho feedback loop: cập nhật embedding/vector, cache tại Não để tránh “nhớ sai”. |
| 5 | Lark Base | Agent Data / Directus (Migration Zone) | Directus Flows / REST API | Ưu tiên dùng Directus Flows; chỉ ghi vào Migration Zone, không chạm Core Zone; tuân HP-07: Shadow Read → Dual-Write → Cutover và luôn kèm trường origin_system, origin_table, origin_id. |
| 6 | Lark Docs / Lark Sheets | Agent Data | REST / Upload | Ingest tài liệu tri thức: upload file, trích xuất nội dung, tạo embedding; mỗi tài liệu phải map về một bản ghi metadata trong Directus. |
| 7 | Directus Flows / n8n (và sau này: Workflows, Kestra) | Agent Data | REST / Webhook | Trigger / callback cho workflow; chỉ gọi API chính thức của Agent Data, không truy cập DB trực tiếp; Kestra/Workflows chỉ được thêm sau khi mở Postgres theo Phụ lục E. |
| 8 | Directus Flows / n8n (và sau này: Workflows, Kestra) | Directus | REST | Cập nhật trạng thái nghiệp vụ (ví dụ: status, completed_at); bắt buộc đi qua REST/GraphQL API của Directus, cấm ghi vào MySQL trực tiếp. |
| 9 | Agent Data (ETL / Jobs ingest) | Qdrant Vector DB | REST / gRPC | Ghi/đọc embedding; Qdrant không là SSOT; mọi vector phải gắn source_id (map ngược về Directus/GCS) và tuân quy trình dọn rác Qdrant ở Điều 20. |
| 10 | BI tools (Looker Studio, Data Studio, …) | Directus / API đọc được phép | REST / Connector chính thức | Chỉ đọc số liệu để vẽ dashboard; quyền read-only; tuyệt đối không ghi ngược vào DB vận hành. |
| 11 | Agents (IDE: Cursor, Codex, Gemini CLI, Claude Code, Antigravity, …) | Agent Data | REST | Chạy test, query thông tin phục vụ Dev/CI; mọi ghi dữ liệu nghiệp vụ phải đi qua endpoint/pipeline đã được định nghĩa & duyệt, không bắn SQL hay ghi thẳng vào Kho. |
| 12 | Agents (IDE: Cursor, Codex, Gemini CLI, Claude Code, Antigravity, …) | Directus | REST / GraphQL | Đọc schema, metadata và một phần dữ liệu cần thiết; phải tuân RBAC của Directus; không ghi trực tiếp bản ghi nghiệp vụ từ IDE, mọi thay đổi phải thông qua PR/migration/API đã phê duyệt trong kế hoạch. |

Các kết nối không nằm trong bảng trên được xem là chưa được phép và chỉ được triển khai sau khi:

- điền “Phiếu đăng ký luồng dữ liệu” (Điều 22),
- được Owner / đúng vai phê duyệt,
- Luật (hoặc Phụ lục) được cập nhật và nâng phiên bản tương ứng.

# Phần VI. Quy định về “rác”, vòng đời & khép kín

## Điều 18. Gatekeeper – Người gác cổng dữ liệu

- **Directus là vùng sạch:**
- Chỉ chứa: bản ghi nghiệp vụ, metadata tri thức, cấu hình đã được suy nghĩ kỹ.
- Chat thô, log API, trung gian model: Lưu ở Chatwoot, Cloud Logging, Firestore (vùng work) hoặc storage log riêng. Không đẩy nguyên xi vào MySQL.
- Bất kỳ kế hoạch nào muốn ghi dữ liệu mới vào Directus phải trả lời được: Loại dữ liệu là gì? SSOT là ở đâu? Sử dụng về sau thế nào? Nếu không rõ → không được ghi.
- **Nguyên tắc Bộ lọc Nguồn (Source Filter):**
- Chỉ những bản ghi tại Agent Data đã gắn cờ user_visible = true mới được phép đồng bộ / ghi tiếp sang Directus hoặc các kho SSOT khác.
- Các dữ liệu khác (nháp, thử nghiệm, nội bộ, log thô) phải nằm lại trong Agent Data, Firestore work hoặc kho log chuyên dụng; không được đẩy sang Directus nếu chưa qua bước lọc/duyệt rõ ràng.
- **Quy định Phê duyệt (Approval):** Mọi thay đổi về Schema (Vùng Growth) và Cấu trúc Quy trình (Graph) bắt buộc phải được thực hiện hoặc phê duyệt trên **Directus Admin UI** (sử dụng Content Versioning). Nuxt không có chức năng phê duyệt kỹ thuật.  Điều 19. Feedback – Hồi tố để não không “nhớ sai”

- Mọi thay đổi quan trọng ở Kho (Directus, Firestore official) phải có:
- Webhook / event gửi về Agent Data.
- Job update embedding / cache.
- Agent không được dùng dữ liệu “cache cũ” quá ngưỡng quy định (tuỳ loại dữ liệu, ví dụ 5–15 phút đối với dữ liệu động).

## Điều 20. Vòng đời & dọn rác

- Directus (Kiểm soát chi phí)
- Giới hạn Revision:
- Bắt buộc cấu hình chỉ lưu tối đa 10 phiên bản (revision) gần nhất hoặc các revision trong vòng 7 ngày trở lại đây (tuỳ điều kiện nào tới trước).
- Các bản draft/revision quá ngưỡng trên phải được xem là dữ liệu tạm để dọn.
- Auto-purge:
- Bật (hoặc thiết lập job định kỳ) để tự động xóa các bản nháp/revision cũ quá hạn, tránh làm phình Database (Cloud SQL MySQL/Postgres).
- Dữ liệu tạm / bảng log trong Directus:
- Mọi bảng mang tính tạm thời (log nội bộ, staging, bảng trung gian…) bắt buộc phải có trường expires_at hoặc trường TTL tương đương.
- Phải có job dọn dẹp định kỳ (qua Directus Flows, Workflows hoặc Function) xoá bản ghi đã hết hạn, không để “kẹt” dữ liệu tạm vô thời hạn trong Kho.
- Log hệ thống (Application / Infra Logs)
- Log chi tiết (request/response, trace, stacktrace, metrics chi tiết…) phải được đưa về Cloud Logging làm nơi tập trung chính.
- Nếu cần lưu trữ dài hạn (phục vụ audit, pháp lý, phân tích lâu dài), log có thể được:
- export sang GCS (Cold Storage) với policy lifecycle riêng (ví dụ: lưu 6–12 tháng rồi auto-delete),
- hoặc sang kho log chuyên dụng khác (nếu có), nhưng vẫn không được quay ngược về DB nghiệp vụ.
- Tuyệt đối KHÔNG:
- lưu log vận hành chi tiết trong MySQL/Directus hay Postgres dùng cho nghiệp vụ,
- dùng bảng nghiệp vụ làm nơi chứa log (dẫn đến bùng nổ dung lượng và giảm hiệu năng).
- Qdrant (Vector Store)
- Định kỳ (tối thiểu hàng tuần) phải có job quét:
- phát hiện và xóa các embedding “mồ côi” – tức là những vector không còn source_id/document_id tương ứng trong Directus hoặc GCS,
- ghi lại thống kê số bản ghi đã xoá để theo dõi xu hướng rác.
- Job dọn rác có thể chạy bằng Cloud Workflows / Cloud Functions / n8n, nhưng phải:
- tuân thủ chuẩn API chính thức của Qdrant,
- không xoá dữ liệu chưa có đối soát (ví dụ: chỉ xoá khi đã kiểm tra source_id không tồn tại).
- SLO vận hành:
- Tỷ lệ embedding “mồ côi” hoặc lỗi ghi (DLQ, write-failed) phải < 0,1%/ngày.
- Nếu vượt ngưỡng:
- bắt buộc tạo incident trong Directus (bảng incidents hoặc tương đương),
- mở retrospective để rà soát lại luồng ingest và cập nhật luật/flow nếu cần (ví dụ: sửa Điều 8, 11 hoặc pipeline ingest tương ứng).

# Phần VII. Mở rộng – Quy định khi thêm luồng & thành tố mới

## Điều 21. Thêm thành tố mới

Trước khi thêm một hệ thống mới (CRM, LMS, BI mới…), cần:

- Xếp nó vào lớp nào (Não / Kho / Cổng).
- Xác định loại dữ liệu nó mang theo.
- Chỉ định SSOT cho mỗi loại dữ liệu đó.
- Xác định kết nối duy nhất/chuẩn (API nào, webhook nào).

Nếu không làm được 4 bước trên → không được triển khai.

## Điều 22. Mẫu “Phiếu đăng ký luồng dữ liệu”

Khi tạo luồng mới, phải điền phiếu (có thể lưu trong Directus):

- Tên luồng:
- Mã luồng (DFxxx):
- Source (hệ thống, lớp):
- Destination (hệ thống, lớp):
- Loại dữ liệu: (tri thức / nghiệp vụ / log / config)
- SSOT của loại dữ liệu này:
- Giao thức kết nối:
- Bảo mật: (WIF, OAuth, API key…)
- Chu kỳ & hướng: (oneway, twoway, realtime, batch)
- Quy tắc dọn rác / vòng đời:
- Người chịu trách nhiệm:  Phụ lục A. Bảng liệt kê thành tố (phiên bản tóm tắt)

****       ****       ****       ****

| Nhóm | Tên thành tố | Lớp chính | Vai trò ngắn gọn |
| --- | --- | --- | --- |
| Core | Agent Data Core (FastAPI/Langroid) | Não | Điều phối Agent, truy vấn vector, cổng vào Qdrant/Kho |
| Core | Qdrant (cluster cloud) | Não | Vector store cho tri thức, phục vụ RAG |
| Core | Firestore (work) | Não | Context, session, working memory cho Agent |
| Core | Firestore (official – project tree, manifest…) | Kho | Một số collection chính thức về cấu trúc dự án |
| Kho | Cloud SQL MySQL | Kho | Database chính cho Directus và một số service MySQL-first |
| Kho | Cloud SQL Postgres (tương lai: Kestra – HOÃN) | Kho | Database cho Kestra (HOÃN TRIỂN KHAI – Giai đoạn sau, theo chiến lược MySQL First/Phụ lục E) |
| Kho | Directus (ứng dụng CMS) | Kho / Cổng | CMS nhập liệu, quản lý bảng nghiệp vụ & metadata tri thức |
| Kho | GCS – Buckets tài liệu (documents/, media/, …) | Kho | Lưu file gốc: PDF, DOCX, hình ảnh, video, bản vẽ |
| Kho | GCS – Buckets log/backup (logs/, backups/) | Kho | Lưu log, snapshot, backup dài hạn |
| Kho | Secret Manager | Kho | Lưu secrets, token, cấu hình nhạy cảm |
| Kho | GitHub (repos hạ tầng & ứng dụng) | Kho (dev) | SSOT cho mã nguồn, Terraform, pipeline CI/CD |
| Cổng | Nuxt Web / Frontend chính | Cổng | Portal web cho người dùng (students, staff, admin) |
| Cổng | Chatwoot | Cổng | CSKH đa kênh, log hội thoại khách hàng |
| Cổng | Lark Messenger | Cổng | Chat nội bộ / với học viên, trigger cho Agent |
| Cổng | Lark Base | Cổng | Bảng dữ liệu legacy, nguồn migration |
| Cổng | Lark Docs / Sheets | Cổng | Tài liệu/bảng ad-hoc, nguồn tri thức & dữ liệu |
| Cổng | n8n / Zapier | Cổng / Não nhẹ | Dự phòng cho Directus Flows. Chỉ dùng khi cần thiết (khi Flows không đáp ứng được trong Giai đoạn 1) |
| Cổng | Kestra / Google Cloud Workflows | Cổng / Não nhẹ | Orchestrator quy trình phức tạp (Kestra HOÃN theo Phụ lục E; Google Workflows dùng cho job hạ tầng) |
| Cổng | BI tools (Looker Studio, Data Studio, …) | Cổng | Hiển thị dashboard, báo cáo phân tích, chỉ đọc |
| Cổng | Canvas ChatGPT / NotebookLM (tài liệu MPC, luật…) | Cổng | Nơi soạn thảo ban đầu các văn bản hiến pháp, kế hoạch |
| Dev | Cursor, Codex, Gemini CLI, Claude Code | Não (dev) | Agents cho code & DevOps, điều khiển CI/CD & IaC |
| Dev | Google Antigravity / IDE cloud khác (nếu dùng) | Não (dev) | Môi trường dev từ xa, chạy tác vụ build/test |
| Infra | Cloud Run | Hạ tầng | Nền tảng chạy Agent Data, dịch vụ web không trạng thái |
| Infra | Cloud Functions | Hạ tầng | Chạy các handler nhỏ: webhook, trigger, job định kỳ |
| Infra | Cloud Logging / Monitoring | Hạ tầng | Thu thập log, metrics, tạo cảnh báo; SSOT cho log vận hành chi tiết |

## Phụ lục B. Gợi ý cách dùng văn bản này

- Khi viết Kế hoạch mới, luôn có mục:
- “Phạm vi áp dụng Luật luồng dữ liệu & kết nối: DFxxx, DFyyy…”.
- Khi giao việc cho Cursor / Codex / Gemini / Grok:
- Đính kèm DFID, chỉ rõ luồng nào được phép chạm tới.
- Yêu cầu Agent báo cáo các điểm liên quan đến Luật này (vi phạm, rủi ro).
- Khi review PR / thiết kế kiến trúc:
- Check list:
- Luồng dữ liệu đã được khai báo?
- SSOT đã rõ?
- Có rác len vào Kho không?
- Có bypass từ Cổng vào DB trực tiếp không?

*Kết thúc bản 1.1 – Draft.*

*Bản này sẽ được chỉnh sửa lặp dần dựa trên phản biện của User, Gemini 3, Grok 4.1 và các phiên làm việc tiếp theo.*

**

