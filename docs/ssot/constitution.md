> **[S115 AMENDMENT — 2026-03-13]** Phụ lục E "MySQL First" đã RETIRED. VPS Directus đã chuyển sang PostgreSQL 16. Mọi references đến MySQL trong tài liệu này là lịch sử. DB hiện tại: `DB_CLIENT=pg`, container `postgres`.

# 📜 Hiến Pháp Hạ Tầng Agent Data – Version 1.11e (Final Freeze)

Updated: August 04, 2025 Purpose: Supreme principles governing Agent Data Langroid. All Laws and plans MUST comply. Scope: agent-data-test / agent-data-production Changes from v1.11d:
- • v1.11e: Tinh chỉnh cuối cùng về mô hình secrets cho phù hợp với thực tế hạ tầng, ràng buộc định dạng của tiền tố bucket, và tự động hóa hoàn toàn quy trình dọn dẹp artifact sau khi được phê duyệt. Đây là bản đóng băng cuối cùng.

## Điều I – Phạm vi & Mục tiêu
| ID | Principle | Description | Source Documents / Notes |
| --- | --- | --- | --- |
| HP-01 | Single Owner Simplicity | Single owner manages infrastructure for minimal, observable configs. | HẠ TẦNG GOOGLE CLOUD.docx (reflects single project architecture) |
| HP-02 | Absolute IaC with Minimalism | All resources via Terraform; Terraform quản lý khai báo secret (metadata), giá trị cụ thể được inject thủ công / CI, không hard-code trong HCL. Tất cả các GCS Bucket được tạo mới BẮT BUỘC phải bật uniform_bucket_level_access. | HẠ TẦNG GOOGLE CLOUD.docx, QDRANT INFO & Requirement.docx |
| HP-03 | No False Reporting | No “PASS/Complete” unless conclusion == success verified by CI logs. | Plan checkpoint V7.docx, 0.6b1-fix9 |
| HP-04 | Automated Test Count Control | Hệ thống tự động kiểm soát sự thay đổi về số lượng bài kiểm tra. Mọi thay đổi (thêm/bớt test) phải được phản ánh một cách tường minh thông qua việc cập nhật file "manifest" (test_manifest_baseline.txt). CI sẽ tự động thất bại nếu phát hiện có sự thay đổi chưa được ghi nhận (Manifest Drift ≠ 0). | Plan checkpoint V7.docx (CP0.4), o3 gap, User chốt cuối |
| HP-05 | Central Secrets Inheritance | Mô hình quản lý secrets được chuẩn hóa là quản lý tập trung, sử dụng một repo trung tâm (ví dụ: chatgpt-githubnew) để điều phối việc đồng bộ secrets từ Google Secret Manager sang các repo con thông qua script. Khi hạ tầng được nâng cấp lên tài khoản GitHub Organization, mô hình sẽ chuyển sang sử dụng Organization-Level secrets. | HẠ TẦNG GOOGLE CLOUD.docx, o3 X-2, user decision, o3 edit<br>Trong trường hợp quy trình đồng bộ tự động gặp sự cố kéo dài (ví dụ: >24 giờ), Owner được phép cập nhật secret thủ công tại repo trung tâm, với điều kiện bắt buộc phải có bản ghi kiểm toán (audit log) chi tiết. |

## Điều II – Quy ước Định danh Chung
| Resource | Standard Naming | Example | Notes |
| --- | --- | --- | --- |
| GCP Project | github-chatgpt-ggcloud |  | Dùng chung cho cả test/prod theo quyết định cuối cùng. |
| Service Account | chatgpt-deployer@<project>.iam.gserviceaccount.com | chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com | Least privilege. Đây là Service Account duy nhất được sử dụng. Cấm tạo SA mới trừ khi có sự sửa đổi Hiến pháp. |
| WIF Pool | agent-data-pool |  | Single pool. |
| WIF Provider | github-provider |  | Attribute conditions per repo, có kế hoạch di dời provider cũ. |
| GCS Bucket | <standard-prefix>/agent-data-<purpose>-<env> | huyen1974-agent-data-artifacts-test | Tiền tố chuẩn hóa (<standard-prefix>) được định nghĩa và quản lý trong TF-LAW, với giá trị mặc định là huyen1974. Tiền tố này BẮT BUỘC phải tuân thủ định dạng tên miền DNS (RFC 1035). Ghi chú: <purpose> là mục đích sử dụng (ví dụ: artifacts, tfstate, backup); <env> là môi trường (test hoặc production). |
<br>
Nguyên tắc chung về định danh:
- • Tài nguyên công khai (Bucket, Repo, Project ID): Bắt buộc chỉ dùng dấu gạch ngang (-).
- • Tài nguyên nội bộ (Secret ID, Qdrant Collection): Được phép dùng cả gạch ngang (-) và gạch dưới (_).
<br>
Ngoại lệ: Các bucket do Google Cloud tự sinh (vd: gcf-v2-sources*, artifacts.*.appspot.com) không thuộc phạm vi của quy ước này.

| Qdrant Cluster | agent-data-vector-dev-useast4 |  | Shared cluster for development. |
| --- | --- | --- | --- |
| Qdrant Collection | <env>_documents | test_documents, production_documents | Phân tách trong cluster dùng chung. |
| GitHub Repos | agent-data-<env> | agent-data-test, agent-data-production |  |
| Secrets (GCP) | <purpose>_<env> | Qdrant_agent_data_N1D8R2vC0_5 | Nguồn gốc tại Secret Manager, tham chiếu từ nguồn tập trung. |

## Điều III – Chính sách Bảo mật & Quyền hạn
| ID | Principle | Description |
| --- | --- | --- |
| HP-SEC-01 | Least Privilege | Only necessary roles; prohibit admin roles. |
| HP-SEC-02 | Secret Rotation | Rotate keys every 90 days for production; 120 days for test. |
| HP-SEC-03 | Audit Logging | Enable Cloud Audit Logs for DATA_WRITE. |
| HP-SEC-04 | Secret Scanning | Zero findings via TruffleHog. |
Xuất sang Trang tính

## Điều IV – Kiểm soát CI/CD
| ID | Principle | Description |
| --- | --- | --- |
| HP-CI-01 | Mandatory Checks | Include lint-only, agent-e2e, terraform-plan, secret-scan; all must succeed. |
| HP-CI-02 | Pass Gate | Verify combined status before merge. |
| HP-CI-03 | Artifact Retention | Các artifact cũ phải được quản lý vòng đời theo quy trình 2 giai đoạn: |
| 1. | Sau 14 ngày: Các artifact sẽ được tự động đánh dấu là "stale" (cũ) để cảnh báo sớm. |  |
| 2. | Sau 30 ngày: Một quy trình tự động sẽ tạo GitHub Issue [CLEANUP]... để yêu cầu phê duyệt. Việc xóa bỏ sẽ được thực hiện thủ công bởi người có thẩm quyền sau khi Issue được đóng lại. |  |

| HP-CI-04 | No Continue-on-Error | Prohibit in test/lint/validate jobs, except for auth fallback. |
| --- | --- | --- |
| HP-CI-05 | Rollback & Fallback | Roadmap ≥ 0.7 BẮT BUỘC phải cung cấp cơ chế rollback tự động; trước thời điểm đó, việc rollback được phép thực hiện thủ công. |

## Điều V – Quản lý Chi phí & Giám sát
| ID | Principle | Description |
| --- | --- | --- |
| HP-COST-01 | Budget Alerts | Budget alerts phải được cấu hình ở các ngưỡng 50%/80%/100%. |
| HP-OBS-01 | Observability | Hệ thống BẮT BUỘC phải có dashboard giám sát các chỉ số vận hành cốt lõi (VD: độ trễ truy vấn, chi phí CI/CD). Chi tiết về chỉ số sẽ được quy định trong Luật. |

## Điều VI – Quản lý Dữ liệu & Phục hồi Thảm họa (DR)
| ID | Principle | Description |
| --- | --- | --- |
| HP-DR-01 | Disaster Recovery | Hệ thống BẮT BUỘC phải có cơ chế sao lưu (backup/snapshot) tự động và định kỳ cho các dữ liệu quan trọng (VD: Qdrant cluster, Terraform state). Việc triển khai nguyên tắc này phụ thuộc vào khả năng kỹ thuật của hạ tầng; nếu tier dịch vụ không hỗ trợ, một giải pháp thay thế phải được định nghĩa trong Luật (QD-LAW), hoặc ghi nhận là nợ kỹ thuật. |
| HP-DR-02 | Data Sync | Dữ liệu vector và metadata (ví dụ trên Firestore) phải luôn được đồng bộ. Mọi thao tác ghi phải đảm bảo tính nhất quán giữa các hệ thống. |

## Điều VII – Quản lý Cursor
| ID | Principle | Description |
| --- | --- | --- |
| HP-CS-01 | Autonomous Execution | Execute to completion; stop only on blocking errors. |
| HP-CS-02 | Mandatory Verification & Fixes | Khi CI thất bại, Cursor được phép tự động sửa lỗi và thử lại tối đa 2 lần. Sau lần thứ 2 nếu vẫn thất bại, quy trình sẽ dừng lại và thông báo cho Owner. |
| HP-CS-03 | Rule Preservation | No delete/modify rules unless explicit prompt. |
| HP-CS-04 | PR Description Autogeneration | Cursor prepend summary table to PR description. |
| HP-CS-05 | Phân tách Quyền Ghi Secrets | • Các runner CI/CD thông thường (chạy test, build tại các repo con như agent-data-test) bị cấm tuyệt đối quyền secrets:write.<br><br> • Chỉ duy nhất quy trình đồng bộ secrets tự động (nếu có) mới được cấp quyền secrets:write để cập nhật secrets. |

## Điều VIII – Phụ lục: Bảng Điều Kiện WIF Chuẩn Hóa
Mục này quy định các điều kiện bắt buộc phải được cấu hình trong Terraform (Policy as Code) để kiểm soát truy cập từ GitHub Actions, nhằm ngăn chặn triệt để lỗi unauthorized_client.
| Kịch bản | Repository | Điều kiện attributeCondition |
| --- | --- | --- |
| Pull Request (Môi trường Test) | agent-data-test | assertion.repository == 'Huyen1974/agent-data-test' && assertion.ref.startsWith('refs/heads/') |
| Release theo Tag (Test) | agent-data-test | assertion.repository == 'Huyen1974/agent-data-test' && assertion.ref.startsWith('refs/tags/') |
| Deploy (Môi trường Production) | agent-data-production | assertion.repository == 'Huyen1974/agent-data-production' && assertion.ref == 'refs/heads/main' |
| Release Production theo Tag | agent-data-production | assertion.repository == 'Huyen1974/agent-data-production' && assertion.ref.startsWith('refs/tags/') |
Ghi chú: Provider cũ github-provider (với alias cursor-ci-provider) sẽ được giữ lại trong 30 ngày kể từ ngày cập nhật để đảm bảo các quy trình cũ không bị gián đoạn trong quá trình chuyển đổi. Sau thời gian này, alias phải được xóa bỏ.

Phụ lục – Khung 5 Luật Chuyên đề
| 1. | TF-LAW (Terraform) |
| --- | --- |
| 2. | GC-LAW (Google Cloud) |
| 3. | GH-LAW (GitHub) |
| 4. | QD-LAW (Qdrant) |

# PHỤ LỤC D: QUY HOẠCH HẠ TẦNG WEB-TEST (CHIẾN LƯỢC 2-SQL)
**(Phụ lục này là một phần không thể tách rời của Hiến pháp và có hiệu lực kể từ Ngày 4 tháng 11 năm 2025)**

---
### ĐIỀU 1: MỤC ĐÍCH VÀ PHẠM VI

1.1. **Mục đích:** Phụ lục này được ban hành nhằm luật hóa và tiêu chuẩn hóa việc quy hoạch, sử dụng tài nguyên SQL và các tài nguyên liên quan trong môi trường `web-test`, tuân thủ chiến lược "Đại phẫu" (Clean Install) do Admin khởi xướng.

1.2. **Hiệu lực Bổ sung:** Phụ lục này bổ sung và làm rõ **PHỤ LỤC C (Kiến trúc Dữ liệu Hỗn hợp)**. Nó chính thức công nhận **MySQL** là hạ tầng SQL chính cho các ứng dụng (Application SQL) và **PostgreSQL** là hạ tầng SQL chuyên biệt (Specialized SQL).

### ĐIỀU 2: QUY HOẠCH TÀI NGUYÊN SQL

2.1. **Repository Chủ quản (Luật hóa):** Repo `Huyen1974/web-test` được luật hóa là repo chính thức (cho cả test và production). Cả hai (2) instance SQL vĩnh viễn của hệ thống đều được quản lý và triển khai từ repo này.

2.2. **Quy tắc 2-SQL (Luật hóa):**
    a. **Instance Postgres (Chuyên biệt):** Chỉ duy nhất một (1) instance Postgres được duy trì. Instance này được **cô lập (isolated)** và chỉ dùng riêng cho Workflow (Kestra).
    b. **Instance MySQL (Chính):** Một (1) instance MySQL được duy trì để phục vụ **TẤT CẢ CÁC NHU CẦU SQL KHÁC**, bao gồm nhưng không giới hạn: CMS (Directus), Chat (Chatwoot), và đồng bộ dữ liệu (Lark Base).

### ĐIỀU 3: BẢNG TÊN CHÍNH THỨC (LUẬT HÓA)

3.1. Để đảm bảo tính ổn định và tránh nhầm lẫn, các tên định danh (IDs) dưới đây được luật hóa cho repo `web-test`. Mọi tài nguyên (hiện tại hoặc tương lai) phải tuân thủ nghiêm ngặt bảng tên này.

| Loại Tài nguyên | Tên Chính thức (Luật hóa) | Ghi chú |
| :--- | :--- | :--- |
| **SQL Instance (Postgres)** | `postgres-kestra-web-test` | (Hiện tại) Chỉ dành cho Kestra. |
| **SQL Instance (MySQL)** | `mysql-directus-web-test` | (Hiện tại) Dành cho MỌI THỨ KHÁC. |
| **GCS Bucket (TF State)** | `huyen1974-web-test-tfstate` | (Tên mới) Dùng cho `terraform/backend.tf`. |
| **GCS Bucket (Backup)** | `huyen1974-web-test-backup` | (Tên mới) Dùng cho backup SQL/Qdrant. |
| **Artifact Registry** | `web-test` | (Hiện tại) DOCKER, `asia-southeast1`. |
| **Cloud Run Service** | `directus-test` | (Hiện tại) Dịch vụ CMS (trên MySQL). |
| **Cloud Run Service** | `kestra-test` | (Hiện tại) Dịch vụ Workflow (trên Postgres). |
| **Cloud Run Service** | `chatwoot-test` | (Hiện tại) Dịch vụ Chat (sẽ trỏ về MySQL). |

### ĐIỀU 4: HIỆU LỰC GHI ĐÈ (SUPERCEDENCE)

4.1. Các quy tắc đặt tên trong **Điều 3** của Phụ lục này (ví dụ: `...-web-test-tfstate`) được ưu tiên áp dụng cho hạ tầng `web-test` và sẽ **ghi đè (supersede)** mọi quy ước đặt tên chung chung (ví dụ: `...-agent-data-tfstate`) đã được định nghĩa trong Hiến pháp chính (Điều II) hoặc TF-LAW (§3.2, §10.2).

============================ I. TF LAW ===============================
🛠️ TF-LAW (Luật về Terraform) – Version 1.5 (Final Freeze)
Dưới đây là phiên bản cuối cùng đã được cập nhật theo các quyết định trên.
Updated: August 05, 2025 Purpose: Quy định các quy tắc cụ thể cho việc vận hành Terraform trong dự án Agent Data Langroid, tuân thủ Hiến pháp v1.11e. Luật này đảm bảo việc quản lý hạ tầng bằng code (IaC) được thực hiện một cách tối giản, nhất quán và an toàn. Scope: Toàn bộ mã nguồn Terraform trong các repository agent-data-test và agent-data-production.
Changes from v1.4: Bổ sung các ghi chú làm rõ về biến môi trường và vai trò của Phụ lục B để tăng tính tường minh. Đây là bản đóng băng cuối cùng.

Bảng Ánh xạ tới Hiến pháp
| Mục của TF-LAW | Ánh xạ tới Nguyên tắc Hiến pháp |
| --- | --- |
| §1: Phạm vi Quản lý | HP-02 (IaC Tối thiểu) |
| §2: Cấu trúc Thư mục & Tiền tố | HP-II (Quy ước Định danh) |
| §3: Quản lý State từ xa | HP-II (Quy ước Định danh) |
| §4: Quy tắc Module & Vòng đời | HP-02 (IaC Tối thiểu) |
| §5: Quy trình CI/CD | HP-CI-01, HP-CI-04 (Kiểm soát CI/CD) |
| §6: Chất lượng Code | HP-02 (IaC Tối thiểu) |
| §7: Quản lý Secrets | HP-05 (Kế thừa Secrets Tập trung) |
| §8: Quản lý Phiên bản | HP-02 (IaC Tối thiểu) |
| §9: Di dời Hạ tầng cũ | HP-II (Quy ước Định danh) |
| §10: Phục hồi Thảm họa (DR) | HP-DR-01 (Disaster Recovery) |
| Phụ lục A: Nợ Kỹ thuật | HP-02 (IaC Tối thiểu) |
| Phụ lục B: Tài nguyên Quan trọng | HP-02 (IaC Tối thiểu) |
Xuất sang Trang tính

§1: Phạm vi Quản lý – IaC Tối thiểu 1.1. Terraform
CHỈ ĐƯỢC PHÉP quản lý các tài nguyên có vòng đời tĩnh .
1.2. Terraform
KHÔNG ĐƯỢC PHÉP quản lý các tài nguyên có tính chất động hoặc được điều khiển bởi ứng dụng .
§2: Cấu trúc Thư mục & Tiền tố Chuẩn hóa 2.1. Toàn bộ mã nguồn Terraform BẮT BUỘC phải được đặt trong thư mục
terraform/ ở gốc của mỗi repository .
2.2. Cấu trúc thư mục chuẩn được áp dụng như sau :
terraform/ ├── modules/ │ └── gcs_buckets.tf ├── main.tf ├── variables.tf ├── outputs.tf └── backend.tf Ghi chú: Cấu trúc trên là một khuyến nghị để đảm bảo tính nhất quán. Các dự án có quy mô nhỏ hơn có thể điều chỉnh cho phù hợp, ví dụ như đặt các file .tf ở thư mục gốc
terraform/ .
2.3. Tiền tố chuẩn hóa (standard-prefix): * Biến
standard_prefix BẮT BUỘC phải được khai báo trong variables.tf .
* Giá trị mặc định của biến này được thiết lập là
huyen1974 .
* Mọi giá trị của tiền tố BẮT BUỘC phải tuân thủ định dạng tên miền DNS (RFC 1035) như quy định tại Điều II của Hiến pháp.
§3: Quản lý State từ xa (Remote State) 3.1. Trạng thái của Terraform BẮT BUỘC phải được lưu trữ trên GCS Bucket .
3.2. Tên bucket chứa state phải tuân thủ định dạng:
<standard-prefix>-agent-data-tfstate-<env> .

Ghi chú: Giá trị tfstate trong tên bucket tương ứng với giá trị <purpose> trong quy ước đặt tên của Hiến pháp.
3.2.1. Ghi chú: Biến <env> dự kiến nhận các giá trị là test hoặc production để tách biệt state giữa các môi trường. 3.3. Bucket chứa state BẮT BUỘC phải được bật tính năng khóa đối tượng (Object Versioning) và được cấu hình
lifecycle { prevent_destroy = true } .
§4: Quy tắc Module & Vòng đời Tài nguyên 4.1. Các tài nguyên cùng loại nên được gom vào các file logic để dễ quản lý (ví dụ: tất cả
google_storage_bucket trong file gcs_buckets.tf) .
4.2. Các tài nguyên quan trọng (xem danh sách tại Phụ lục B) BẮT BUỘC phải có khối lệnh
lifecycle { prevent_destroy = true } .
4.3. Mọi tài nguyên
google_storage_bucket được tạo mới BẮT BUỘC phải bao gồm thuộc tính uniform_bucket_level_access = true trong mã nguồn .
§5: Quy trình CI/CD
5.1. Pull Request: Mọi Pull Request BẮT BUỘC phải chạy thành công job
terraform-plan .
* Job này chỉ thực hiện
plan, không apply .
* Job được phép trả về mã thoát
2 (phát hiện có thay đổi) mà không bị coi là thất bại .
* continue-on-error: true chỉ được phép sử dụng cho bước dự phòng xác thực (auth fallback) như quy định tại HP-CI-04 .
5.2. Nhánh
main: Việc apply các thay đổi chỉ được thực hiện trên nhánh main và BẮT BUỘC phải được kích hoạt thủ công hoặc thông qua một nhãn (label) đặc biệt, yêu cầu sự phê duyệt .
§6: Chất lượng Code (Lint & Format)
6.1. Mọi mã nguồn Terraform trước khi merge BẮT BUỘC phải được định dạng bằng
terraform fmt .
6.2. Một job
terraform-lint sử dụng tflint BẮT BUỘC phải được chạy và thành công trong quy trình CI .
§7: Quản lý Secrets
7.1. Terraform BẮT BUỘC phải sử dụng tài nguyên
google_secret_manager_secret để khai báo sự tồn tại của một secret (metadata) .
7.2. Terraform
BỊ CẤM TUYỆT ĐỐI quản lý phiên bản hay giá trị của secret (google_secret_manager_secret_version) .
7.3. Giá trị của secret sẽ được quản lý và đồng bộ bởi quy trình tập trung như đã quy định tại HP-05 của Hiến pháp.
§8: Quản lý Phiên bản
8.1. Phiên bản Terraform BẮT BUỘC phải được khóa ở required_version ~> 1.8 .
8.2. Phiên bản của Google Provider BẮT BUỘC phải được khóa ở phiên bản
~> 4.57.0 để đảm bảo sự ổn định và tương thích với các kế hoạch đã được phê duyệt . Mọi nâng cấp phiên bản lớn (major version) phải được thực hiện trong một Pull Request riêng và được kiểm thử cẩn thận.
§9: Di dời Hạ tầng cũ (Legacy Migration) 9.1. Các GCS Bucket cũ có chứa dấu gạch dưới (
_) phải được lên kế hoạch di dời sang tên mới tuân thủ Hiến pháp .
9.2. WIF Provider cũ (
cursor-ci-provider) sẽ được giữ lại dưới dạng alias trong 30 ngày kể từ ngày Hiến pháp có hiệu lực, sau đó phải được xóa bỏ .
§10: Phục hồi Thảm họa (Disaster Recovery) 10.1. Trạng thái của Terraform (
tfstate) BẮT BUỘC phải được sao lưu định kỳ .
10.2. Một GCS Bucket riêng cho việc sao lưu BẮT BUỘC phải được tạo với tên tuân thủ định dạng:
<standard-prefix>-agent-data-backup-<env> .

Ghi chú: Giá trị backup trong tên bucket tương ứng với giá trị <purpose> trong quy ước đặt tên của Hiến pháp.

Phụ lục A – Nợ Kỹ thuật (Technical Debt)
Danh sách các hạng mục chưa tuân thủ Hiến pháp và cần có lộ trình khắc phục.
| ID Nợ | Hạng mục | Mô tả | Deadline |
| --- | --- | --- | --- |
| TD-TF-01 | Uniform Bucket-Level Access (UBLA) | Các GCS Bucket cũ được tạo trước ngày Hiến pháp có hiệu lực và chưa bật UBLA phải được lên kế hoạch di dời hoặc cập nhật. | 31-12-2025 |
| TD-TF-02 | Workflow Sao lưu tfstate | Xây dựng một workflow tự động (cron job) để sao lưu định kỳ tệp tfstate từ bucket "tfstate" sang bucket "backup" theo đúng yêu cầu của GC-LAW. | 30-09-2025 |


Phụ lục B – Danh sách Tài nguyên Quan trọng
Ghi chú: Danh sách này là nguồn tham chiếu chính cho các tài nguyên quan trọng. Các bộ Luật khác (ví dụ: GC-LAW) nên đồng bộ hoặc tham chiếu đến danh sách này để đảm bảo tính nhất quán. <br>
Theo quy định tại §4.2, các tài nguyên được liệt kê dưới đây BẮT BUỘC phải có khối lệnh lifecycle { prevent_destroy = true } trong mã nguồn Terraform.
- • google_storage_bucket
- • google_secret_manager_secret
- • google_project_iam_member
- • google_artifact_registry_repository
- • google_service_account
============================ II. GC LAW ===============================
⛅ GC-LAW (Luật về Google Cloud) – Version 1.4 (Phiên bản Hoàn chỉnh Cuối cùng)
Updated: August 05, 2025 Purpose: Quy định các quy tắc cụ thể cho việc vận hành trên Google Cloud, tuân thủ Hiến pháp v1.11e. Scope: Toàn bộ tài nguyên trên Google Cloud Platform được quản lý bởi dự án Agent Data Langroid.
Changes from v1.3:
- • Cập nhật toàn bộ Luật để phản ánh mô hình 1 Project duy nhất và các quy tắc mới nhất từ Hiến pháp v1.11e.
- • Bổ sung lại các ví dụ, ghi chú chi tiết, và phần giải thích bối cảnh từ các phiên bản trước để tăng tính rõ ràng và đầy đủ.

Bảng Ánh xạ tới Hiến pháp
| Mục của GC-LAW | Ánh xạ tới Nguyên tắc Hiến pháp | Rationale (Lý do) |
| --- | --- | --- |
| §1: Cấu trúc Project | HP-01, HP-II | Chi tiết hóa mô hình 1 Project duy nhất đã được Hiến pháp phê duyệt. |
| §2: Quản lý Truy cập (IAM & WIF) | HP-III, Điều VIII | Chuẩn hóa các điều kiện WIF để ngăn lỗi xác thực, tuân thủ bảng điều kiện trong Hiến pháp. |
| §3: Quản lý Secrets | HP-05, HP-SEC-02 | Cụ thể hóa mô hình đồng bộ secrets từ Google Secret Manager theo đúng nguyên tắc của Hiến pháp. |
| §4: Quản lý Lưu trữ | HP-II, HP-CI-03, HP-DR-01 | Áp dụng quy ước đặt tên và vòng đời tài nguyên đã được chốt trong Hiến pháp. |
| §5: Chính sách Vùng | HP-II (Qdrant Cluster) | Quy định vùng hoạt động mặc định và các ngoại lệ đã được phê duyệt. |
| §6: Quản lý Chi phí & Giám sát | HP-OBS-01, HP-COST-01 | Cụ thể hóa các yêu cầu về giám sát và kiểm soát chi phí. |
| §7: Phục hồi Thảm họa (DR) | HP-DR-01 | Chi tiết hóa các yêu cầu tối thiểu về tần suất và đích đến của bản sao lưu. |
| §8: Bài học Kinh nghiệm | HP-III, HP-IV | Ghi lại bối cảnh và lý do ra đời của các quy tắc WIF để tránh lặp lại lỗi trong quá khứ. |
| Phụ lục A: Ranh giới Logic | HP-01, HP-II | Làm rõ cách phân tách môi trường Test/Prod trong cùng một Project. |
Xuất sang Trang tính

§1: Cấu trúc Project 1.1. Toàn bộ hạ tầng của dự án (bao gồm cả môi trường Test và Production) BẮT BUỘC phải được triển khai trên
một Project Google Cloud duy nhất.
1.2. Project ID được phê duyệt là:
github-chatgpt-ggcloud.
1.3. Service Account duy nhất được phê duyệt là:
chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com.
§2: Quản lý Truy cập (IAM & WIF)
2.1. Workload Identity Federation (WIF) là phương thức xác thực chính cho các quy trình CI/CD.
2.2. Bảng Điều kiện WIF Chuẩn hóa BẮT BUỘC phải được cấu hình trong Terraform và tuân thủ tuyệt đối bảng đã được phê duyệt trong Điều VIII của Hiến pháp v1.11e.
2.3. Hướng dẫn Triển khai và Di dời: * Terraform: Cấu hình BẮT BUỘC phải được quản lý bằng code. Ví dụ:
resource "google_iam_workload_identity_pool_provider" "github" { ... attribute_condition = "..." } .
* Di dời Provider cũ: Lệnh gcloud iam workload-identity-pools providers update-oidc... sẽ được sử dụng để di dời các provider cũ sang cấu hình chuẩn.
* Kiểm tra cục bộ:
- Trước khi đẩy lên CI, lập trình viên nên kiểm tra điều kiện WIF bằng lệnh gcloud auth application-default login --impersonate-service-account=[SA] để xác thực quyền.
- Xác thực Token: Để kiểm tra sâu hơn, có thể lấy và xác thực token bằng các lệnh tương tự như sau: gcloud sts get-token --audience="[AUDIENCE]"
§3: Quản lý Secrets
3.1. Nguồn Chân lý (Source of Truth): Google Secret Manager là nơi lưu trữ giá trị gốc và duy nhất của tất cả các secret.
3.2. Mô hình Đồng bộ: Việc đồng bộ secrets từ Google Secret Manager lên GitHub BẮT BUỘC phải tuân thủ mô hình đã quy định tại HP-05 của Hiến pháp v1.11e (sử dụng repo trung tâm và script đồng bộ cho tài khoản cá nhân).
3.3. Ví dụ Di dời Secret: gh secret set <SECRET_NAME> -b "<value>" --repo Huyen1974/chatgpt-githubnew.
§4: Quản lý Lưu trữ (GCS & Artifact Registry)

4.1. Quy ước Đặt tên Bucket: Mọi GCS Bucket BẮT BUỘC phải tuân thủ quy ước đặt tên <standard-prefix>-agent-data-<purpose>-<env> như đã quy định tại Điều II của Hiến pháp và được chi tiết hóa trong TF-LAW.
4.2. Vòng đời Artifact: Việc quản lý các artifact cũ (> 30 ngày) BẮT BUỘC phải tuân thủ quy trình đã quy định tại HP-CI-03 của Hiến pháp v1.11e (tạo GitHub Issue để phê duyệt và xóa thủ công).

4.3. Chính sách Truy cập Bucket: Mọi GCS Bucket được tạo mới BẮT BUỘC phải bật uniform_bucket_level_access = true, tuân thủ nguyên tắc HP-02 của Hiến pháp và được thực thi tại TF-LAW §4.3.
§5: Chính sách Vùng (Region Policy)
5.1. Vùng mặc định: asia-southeast1 (Singapore) được chỉ định là vùng mặc định cho tất cả các tài nguyên, trừ khi có ngoại lệ được ghi rõ. Cấu hình Terraform NÊN mã hóa cứng giá trị này trong file
tfvars cho các tài nguyên không phải Qdrant.
5.2. Ngoại lệ Qdrant: Cluster Qdrant được phép triển khai tại us-east4 cho đến khi có thông báo chính thức về việc hỗ trợ tại Singapore.
§6: Quản lý Chi phí & Giám sát
6.1. Cảnh báo Ngân sách: BẮT BUỘC phải được cấu hình theo nguyên tắc HP-COST-01.
6.2. Gán nhãn (Labeling): Mọi tài nguyên được tạo ra BẮT BUỘC phải được gán nhãn đầy đủ (project, environment, service) để phục vụ việc giám sát và kiểm soát chi phí.
6.3. Giám sát (Observability): Việc triển khai dashboard giám sát BẮT BUỘC phải tuân thủ nguyên tắc HP-OBS-01.
§7: Phục hồi Thảm họa (Disaster Recovery)
7.1. Nguyên tắc chung: Cơ chế sao lưu (backup/snapshot) tự động cho các dữ liệu quan trọng BẮT BUỘC phải được thiết lập theo nguyên tắc HP-DR-01 của Hiến pháp.
7.2. Tần suất Sao lưu Tối thiểu:
* Môi trường Production: Dữ liệu BẮT BUỘC phải được sao lưu tối thiểu 1 lần/ngày.
* Môi trường Test: Dữ liệu BẮT BUỘC phải được sao lưu tối thiểu 1 lần/tuần.
7.3. Đích đến của Bản sao lưu: * Tất cả các bản sao lưu BẮT BUỘC phải được lưu trữ trong GCS Bucket dành riêng cho việc sao lưu.
* Bucket này phải tuân thủ quy ước đặt tên đã được định nghĩa trong TF-LAW:
<standard-prefix>-agent-data-backup-<env>.
§8: Bài học Kinh nghiệm 8.1. Các quy tắc WIF trong §2 được tạo ra để khắc phục triệt để lỗi unauthorized_client đã gây ra sự chậm trễ đáng kể trong quá khứ. Nguyên nhân gốc rễ là do điều kiện WIF cũ chỉ cho phép CI chạy trên nhánh main, làm thất bại tất cả các quy trình chạy trên các nhánh feature hoặc Pull Request. Việc chuẩn hóa điều kiện cho phép refs/heads/ là bắt buộc để đảm bảo CI hoạt động thông suốt.

Phụ lục A – Ranh giới Logic giữa Test và Production
Bảng này làm rõ cách các tài nguyên được phân tách một cách logic trong cùng một Project Google Cloud.
| Tài nguyên | Cách phân tách | Ví dụ |
| --- | --- | --- |
| GCS Bucket | Hậu tố -<env> | ...-artifacts-test vs. ...-artifacts-production |
| Artifact Registry | Tên repo riêng | .../agent-data-test vs. .../agent-data-production |
| Qdrant Collection | Tên collection riêng | test_documents vs. production_documents |
| Cloud Run Service | Tên service riêng | agent-data-test-service vs. agent-data-prod-service |

============================ III. GH LAW ============================
🐙 GH-LAW (Luật về GitHub) – Version 1.3
Updated: August 05, 2025 Purpose: Quy định các quy tắc cụ thể cho việc vận hành trên GitHub trong dự án Agent Data Langroid, tuân thủ Hiến pháp v1.11e. Scope: Áp dụng cho các repository agent-data-test, agent-data-production, và repo trung tâm chatgpt-githubnew.
Changes from v1.2:
- • Bổ sung: Thêm quy trình báo cáo hàng tuần qua Slack cho các artifact cũ, nhằm tăng cường khả năng giám sát và tuân thủ Kế hoạch.

Bảng Ánh xạ tới Hiến pháp
| Mục của GH-LAW | Ánh xạ tới Nguyên tắc Hiến pháp | Rationale (Lý do) |
| --- | --- | --- |
| §1: Cấu trúc Repository | HP-01, HP-II | Chuẩn hóa cấu trúc các repository theo mô hình đã được phê duyệt. |
| §2: Quy tắc về Nhánh & Release | HP-IV, Điều VIII | Bảo vệ nhánh main và chuẩn hóa quy trình release để đảm bảo tính ổn định và tuân thủ WIF. |
| §3: Quy trình CI/CD | HP-CI-01, HP-CI-02 | Chi tiết hóa các workflow và các bước kiểm tra bắt buộc trong CI. |
| §4: Yêu cầu đối với Pull Request | HP-CS-04 | Chuẩn hóa quy trình review code và các quy ước để tăng chất lượng và tính rõ ràng. |
| §5: Quản lý Secrets | HP-05, HP-CS-05 | Cụ thể hóa mô hình kỹ thuật cho việc đồng bộ secrets, đảm bảo an toàn và tuân thủ Hiến pháp. |
| §6: Quy tắc Retry của Cursor | HP-CS-02 | Chi tiết hóa cơ chế tự sửa lỗi của Cursor. |
| §7: Quy trình Dọn dẹp Artifact | HP-CI-03 | Mô tả chi tiết workflow tạo và xử lý Issue dọn dẹp artifact. |
| §8: Bảo mật | HP-SEC-04 | Quy định các bước quét bảo mật và cơ chế bảo vệ mã nguồn. |

§1: Cấu trúc Repository 1.1. Các repository chính bao gồm
agent-data-test, agent-data-production, và repo trung tâm chatgpt-githubnew.
1.2. Cấu trúc thư mục trong mỗi repo BẮT BUỘC phải tuân thủ các quy ước đã định (ví dụ:
.github/workflows/, terraform/, .cursor/).
§2: Quy tắc về Nhánh & Release
2.1. Bảo vệ Nhánh main: Nhánh main BẮT BUỘC phải được bảo vệ với các quy tắc sau:
* Yêu cầu Pull Request (PR) để cập nhật.
* Yêu cầu tối thiểu 1 phê duyệt (approval).
* Bắt buộc tất cả các status check (context) được định nghĩa tại §3.2 phải thành công.
* Cấm force push.
2.2. Quy ước Định dạng Tag: Các tag được sử dụng cho việc "Release Production" BẮT BUỘC phải tuân thủ định dạng Semantic Versioning và có tiền tố v (ví dụ: v1.0.0, v1.2.3).
2.3. Quyền tạo Release Tag: Chỉ những người có quyền "Maintainer" hoặc cao hơn mới được phép tạo các tag release trên nhánh main.
§3: Quy trình CI/CD (Workflows)
3.1 GitHub CLI Auth Bootstrap (Cursor & Operators)
- •  Mục tiêu: chuẩn hoá xác thực gh cho Cursor/Operator trước khi chạy lệnh CI/CD thủ công (gh run, gh pr…).
- •  Nguồn token: Google Secret Manager secret: gh_pat_sync_secrets (Project: github-chatgpt-ggcloud). Token bắt buộc có scopes: repo, workflow.
- •  Công cụ: scripts/bootstrap_gh.sh (chế độ verify/apply).
- •  Quy tắc an toàn:
- • Không cấp secrets:write cho runner CI thường kỳ; chỉ quy trình đồng bộ secrets mới có thể có quyền này theo "Phân tách Quyền Ghi Secrets" (kế thừa luật hiện hành).
- • Script chỉ đọc PAT từ GSM và đăng nhập gh cục bộ, không ghi secrets lên GitHub.
- •  Cách dùng nhanh:
# Kiểm chứng token (không thay đổi cấu hình gh)
PROJECT="github-chatgpt-ggcloud" SECRET_NAME="gh_pat_sync_secrets" scripts/bootstrap_gh.sh verify

# Đăng nhập gh (keyring) để chạy gh run/gh pr…
PROJECT="github-chatgpt-ggcloud" SECRET_NAME="gh_pat_sync_secrets" scripts/bootstrap_gh.sh apply

# Kiểm tra:
gh auth status -h github.com
- •  Khi nào phải chạy:
- • Mỗi phiên thao tác mới, hoặc khi gặp lỗi gh "not authenticated".
- • Trước khi dùng các lệnh gh nằm trong quy trình GH-LAW §3 (CI/CD).

3.2. Quy định về Toolchain: Các workflow có sử dụng Terraform BẮT BUỘC phải có bước setup-terraform để cài đặt đúng phiên bản ~> 1.8 như đã quy định trong TF-LAW §8.
3.3. Các Status Check Bắt buộc (Pass-gate): Để một PR được phép merge vào nhánh main, các status check (context) sau BẮT BUỘC phải thành công (trạng thái xanh ✅):
* lint-only * terraform-plan * secret-scan * agent-e2e (hoặc các job test tương đương) * manifest-drift-check

§4: Yêu cầu đối với Pull Request (PR) 4.1.
Quy ước Tên nhánh: Tên nhánh BẮT BUỘC phải tuân thủ quy ước prefix/description (ví dụ: feat/add-new-tool, fix/bug-123).
4.2.
Mô tả PR: Mô tả của PR BẮT BUỘC phải chứa bảng tóm tắt tự động do Cursor tạo ra theo nguyên tắc HP-CS-04.
§5: Quản lý Secrets 5.1.
Mô hình Kỹ thuật: Việc đồng bộ secrets từ Google Secret Manager lên GitHub BẮT BUỘC phải được thực hiện thông qua một workflow sync-secrets.yml chạy tại repo trung tâm chatgpt-githubnew.
5.2.
Cơ chế Kích hoạt: Workflow sync-secrets.yml phải có 2 cơ chế kích hoạt:
* Chạy tự động theo lịch (cron) tối thiểu 1 lần/ngày.
* Chạy thủ công (
workflow_dispatch) khi cần đồng bộ ngay lập tức.
5.3.
Cơ chế Xác thực: Workflow này BẮT BUỘC phải sử dụng một PAT (Personal Access Token) có đủ quyền hạn để ghi secrets (secrets:write) lên các repo con.
5.4.
Quyền hạn của Runner: Runner ở các repo con (agent-data-test, agent-data-production) BỊ CẤM TUYỆT ĐỐI quyền secrets:write, tuân thủ HP-CS-05.
5.5.
Quy trình Xử lý Sự cố (Fallback): Trong trường hợp quy trình đồng bộ tự động gặp sự cố kéo dài, việc cập nhật secret thủ công lên repo con được cho phép, nhưng BẮT BUỘC phải kèm theo một bản ghi kiểm toán (audit log) ghi rõ lý do, người thực hiện và thời gian.
§6: Quy tắc Retry và Tự sửa lỗi của Cursor 6.1. Khi CI thất bại, Cursor được phép tự động sửa lỗi và push lại cùng nhánh
tối đa 2 lần.
6.2. Sau lần retry thứ 2 nếu vẫn thất bại, quy trình BẮT BUỘC phải dừng lại và thông báo cho Owner.
6.3. Thời gian chờ (cool-down) giữa các lần retry sẽ được quy định chi tiết trong
CS-LAW.
§7: Quy trình Dọn dẹp và Giám sát Artifact 7.1. Giai đoạn 1 (Cảnh báo sớm): Một workflow tự động BẮT BUỘC phải chạy để đánh dấu các artifact cũ hơn 14 ngày là "stale". 7.2. Giai đoạn 2 (Yêu cầu Dọn dẹp): Một workflow tự động khác BẮT BUỘC phải được thiết lập để quét và tạo GitHub Issue [CLEANUP]... cho các artifact cũ hơn 30 ngày. 7.3. Cơ chế Xác thực: Các workflow này BẮT BUỘC phải sử dụng một PAT hoặc GitHub App có đủ quyền hạn cần thiết (ví dụ: issues:write). 7.4. Giám sát và Báo cáo: Một quy trình tự động BẮT BUỘC phải chạy hàng tuần để tổng hợp số lượng artifact đã được đánh dấu "stale" và gửi báo cáo qua Slack. Báo cáo này BẮT BUỘC phải có ngưỡng cảnh báo (ví dụ: stale_count < 5) và sẽ gửi cảnh báo nếu vượt ngưỡng, tuân thủ yêu cầu trong Plan V12. 7.5. Việc xóa artifact chỉ được thực hiện thủ công sau khi Issue tương ứng đã được phê duyệt và đóng lại.
§8: Bảo mật 8.1.
Quét Secret: Mọi Pull Request BẮT BUỘC phải chạy thành công job quét secret (ví dụ: TruffleHog).
8.2.
Bảo vệ Workflow: Thư mục .github/workflows/ BẮT BUỘC phải được bảo vệ bằng file CODEOWNERS để yêu cầu sự phê duyệt từ người có thẩm quyền trước khi thay đổi các quy trình CI/CD.

Phụ lục A – Nợ Kỹ thuật
| ID Nợ | Hạng mục | Mô tả | Deadline |
| --- | --- | --- | --- |
| TD-GH-01 | Chuyển sang Organization-Level Secrets | Khi hạ tầng được nâng cấp lên tài khoản GitHub Organization, mô hình đồng bộ secrets bằng script sẽ được thay thế bằng cơ chế secrets: inherit của GitHub. | 31-12-2025 |

============================ IV. QD LAW ============================

📦 QDRANT LAW (Luật về Qdrant) – Version 1.2
Updated: August 05, 2025 Purpose: Quy định các quy tắc cụ thể cho việc vận hành Qdrant trong dự án Agent Data Langroid, tuân thủ Hiến pháp v1.11e. Scope: Áp dụng cho Qdrant Cloud cluster, các collection, và các tài nguyên phụ trợ (ví dụ: Cloud Function manage_qdrant).
Changes from v1.1:
- • Làm rõ và bổ sung các yêu cầu kỹ thuật bắt buộc cho Cloud Function manage_qdrant, bao gồm biến môi trường, logging, và quy trình snapshot.
- • Cập nhật Phụ lục Nợ Kỹ thuật cho rõ ràng hơn.

Bảng Ánh xạ tới Hiến pháp
| Mục của QD-LAW | Ánh xạ tới Nguyên tắc Hiến pháp | Rationale (Lý do) |
| --- | --- | --- |
| §1: Cấu trúc Cluster | HP-II (Naming), HP-QD-03 (Shared Cluster) | Chuẩn hóa quy ước đặt tên và mô hình sử dụng cluster dùng chung. |
| §2: Quản lý Collection | HP-II (Collection Naming) | Quy định cách đặt tên để phân tách dữ liệu các môi trường. |
| §3: Đồng bộ Metadata | HP-DR-02 (Data Sync) | Bắt buộc phải có sự nhất quán giữa vector và metadata. |
| §4: Quản lý Vận hành | HP-02 (IaC Tối thiểu) | Định nghĩa các công cụ tự động hóa để quản lý trạng thái và chi phí của cluster. |
| §5: Quản lý Secrets | HP-05, HP-SEC-02 | Tuân thủ mô hình quản lý secrets tập trung và chính sách luân chuyển. |
| §6: Chính sách Vùng | HP-II (Qdrant Cluster) | Tuân thủ chính sách vùng và kế hoạch di dời đã được Hiến pháp phê duyệt. |
| §7: Phục hồi Thảm họa (DR) | HP-DR-01 | Chi tiết hóa các yêu cầu về sao lưu cho Qdrant, tuân thủ các Luật khác. |
Xuất sang Trang tính

§1: Cấu trúc Cluster 1.1.
Mô hình: Hệ thống BẮT BUỘC sử dụng mô hình cluster dùng chung (shared cluster) cho cả môi trường Test và Production.
1.2.
Quy ước Đặt tên: Tên của cluster BẮT BUỘC phải tuân thủ quy ước đã được phê duyệt trong Điều II của Hiến pháp (agent-data-vector-dev-useast4).
§2: Quản lý Collection 2.1.
Quy ước Đặt tên: Việc phân tách dữ liệu giữa các môi trường BẮT BUỘC phải được thực hiện bằng cách sử dụng các collection riêng biệt, với tên tuân thủ định dạng <env>_documents.
2.2.
Ví dụ: test_documents cho môi trường Test, production_documents cho môi trường Production.
§3: Đồng bộ Metadata 3.1. Mọi thao tác ghi hoặc cập nhật vector vào Qdrant BẮT BUỘC phải được thực hiện song song với việc ghi hoặc cập nhật metadata tương ứng vào Firestore, tuân thủ nguyên tắc HP-DR-02.
3.2. Trong trường hợp quy trình đồng bộ gặp lỗi, hệ thống phải gửi cảnh báo và cho phép thực hiện fallback thủ công kèm theo bản ghi kiểm toán.
§4: Quản lý Vận hành (Cloud Function) 4.1. Một Cloud Function tên là
manage_qdrant BẮT BUỘC phải được triển khai để quản lý trạng thái vận hành của Qdrant cluster.
4.2. Function này BẮT BUỘC phải cung cấp các giao diện (action) tối thiểu sau: * start (để kích hoạt lại cluster) * stop (BẮT BUỘC phải tạo snapshot trước khi tạm dừng cluster) * status (để kiểm tra trạng thái) * touch (để làm mới bộ đếm thời gian không hoạt động) 4.3.
Cấu hình Scheduler: Một Cloud Scheduler BẮT BUỘC phải được cấu hình để gọi đến action touch của function này một cách định kỳ (khuyến nghị: mỗi 10 phút) nhằm ngăn chặn việc cluster tự động tạm dừng.
4.4. Quyền Thực thi: Service Account được sử dụng bởi Cloud Scheduler BẮT BUỘC phải được cấp quyền roles/cloudfunctions.invoker để có thể kích hoạt Cloud Function. 4.5. Biến môi trường: Function BẮT BUỘC phải được cấu hình với các biến môi trường cần thiết, tối thiểu bao gồm: PROJECT_ID, QDRANT_CLUSTER_ID, QDRANT_API_KEY. 4.6. Logging: Function BẮT BUỘC phải sử dụng cơ chế ghi log có cấu trúc (Structured Logging) để phục vụ việc giám sát và gỡ lỗi.
§5: Quản lý Secrets 5.1. Các secret của Qdrant (API key, management key) BẮT BUỘC phải được quản lý theo mô hình tập trung đã được định nghĩa tại HP-05 của Hiến pháp và chi tiết hóa trong GH-LAW §5.
5.2. Việc luân chuyển (rotation) các secret này BẮT BUỘC phải tuân thủ chính sách đã định tại HP-SEC-02 (90 ngày cho production, 120 ngày cho test).
§6: Chính sách Vùng 6.1. Qdrant cluster BẮT BUỘC phải được triển khai tại vùng
us-east4 theo đúng ngoại lệ đã được phê duyệt trong Hiến pháp và GC-LAW §5 .
6.2. Một kế hoạch di dời (migration) sang vùng
asia-southeast1 phải được chuẩn bị và sẵn sàng thực thi khi Qdrant Cloud chính thức hỗ trợ .
§7: Phục hồi Thảm họa (DR) & Sao lưu 7.1. Cơ chế sao lưu tự động (snapshot) BẮT BUỘC phải được thiết lập theo nguyên tắc HP-DR-01 và các ghi chú về sự phụ thuộc vào bậc dịch vụ (tier).
7.2.
Tần suất sao lưu BẮT BUỘC phải tuân thủ quy định tối thiểu trong GC-LAW §7.2: hàng ngày cho production, hàng tuần cho test.
7.3.
Đích đến của bản sao lưu BẮT BUỘC phải là GCS Bucket chuyên dụng, tuân thủ quy ước đặt tên đã định trong TF-LAW §10.2 (...-backup-<env>).

Phụ lục A – Nợ Kỹ thuật
| ID Nợ | Hạng mục | Mô tả | Deadline |
| --- | --- | --- | --- |
| TD-QD-01 | Sao lưu Tự động | Di dời lên bậc trả phí (Paid Tier) để có tính năng sao lưu tự động qua API, tuân thủ nguyên tắc DR. | 31-12-2025 |

# ALL_LAWs (Consolidated)

<!-- Placeholder created for Cursor. The owner will edit this file manually. -->
