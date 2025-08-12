# 🛠️ TF-LAW (Luật về Terraform) – Version 1.5 (Final Freeze)

Dưới đây là phiên bản cuối cùng đã được cập nhật theo các quyết định trên.

- **Updated:** August 05, 2025
- **Purpose:** Quy định các quy tắc cụ thể cho việc vận hành Terraform trong dự án Agent Data Langroid, tuân thủ Hiến pháp v1.11e. Luật này đảm bảo việc quản lý hạ tầng bằng code (IaC) được thực hiện một cách tối giản, nhất quán và an toàn.
- **Scope:** Toàn bộ mã nguồn Terraform trong các repository agent-data-test và agent-data-production.

Changes from v1.4: Bổ sung các ghi chú làm rõ về biến môi trường và vai trò của Phụ lục B để tăng tính tường minh. Đây là bản đóng băng cuối cùng.

## Bảng Ánh xạ tới Hiến pháp

| Mục của TF-LAW | Ánh xạ tới Nguyên tắc Hiến pháp |
|---|---|
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

> Xuất sang Trang tính

### §1: Phạm vi Quản lý – IaC Tối thiểu

#### 1.1.
Terraform CHỈ ĐƯỢC PHÉP quản lý các tài nguyên có vòng đời tĩnh.

#### 1.2.
Terraform KHÔNG ĐƯỢC PHÉP quản lý các tài nguyên có tính chất động hoặc được điều khiển bởi ứng dụng.

### §2: Cấu trúc Thư mục & Tiền tố Chuẩn hóa

#### 2.1.
Toàn bộ mã nguồn Terraform BẮT BUỘC phải được đặt trong thư mục `terraform/` ở gốc của mỗi repository.

#### 2.2.
Cấu trúc thư mục chuẩn được áp dụng như sau:

```bash
terraform/
├── modules/
│   └── gcs_buckets.tf
├── main.tf
├── variables.tf
├── outputs.tf
└── backend.tf
```

Ghi chú: Cấu trúc trên là một khuyến nghị để đảm bảo tính nhất quán. Các dự án có quy mô nhỏ hơn có thể điều chỉnh cho phù hợp, ví dụ như đặt các file .tf ở thư mục gốc `terraform/`.

#### 2.3.
Tiền tố chuẩn hóa (standard-prefix):
- Biến `standard_prefix` BẮT BUỘC phải được khai báo trong `variables.tf`.
- Giá trị mặc định của biến này được thiết lập là `huyen1974`.
- Mọi giá trị của tiền tố BẮT BUỘC phải tuân thủ định dạng tên miền DNS (RFC 1035) như quy định tại Điều II của Hiến pháp.

### §3: Quản lý State từ xa (Remote State)

#### 3.1.
Trạng thái của Terraform BẮT BUỘC phải được lưu trữ trên GCS Bucket.

#### 3.2.
Tên bucket chứa state phải tuân thủ định dạng: ``<standard-prefix>``-agent-data-tfstate-``<env>``.

Ghi chú: Giá trị tfstate trong tên bucket tương ứng với giá trị ``<purpose>`` trong quy ước đặt tên của Hiến pháp.
  - Ghi chú: Biến ``<env>`` dự kiến nhận các giá trị là test hoặc production để tách biệt state giữa các môi trường.

#### 3.3.
Bucket chứa state BẮT BUỘC phải được bật tính năng khóa đối tượng (Object Versioning) và được cấu hình `lifecycle { prevent_destroy = true }`.

### §4: Quy tắc Module & Vòng đời Tài nguyên

#### 4.1.
Các tài nguyên cùng loại nên được gom vào các file logic để dễ quản lý (ví dụ: tất cả `google_storage_bucket` trong file `gcs_buckets.tf`).

#### 4.2.
Các tài nguyên quan trọng (xem danh sách tại Phụ lục B) BẮT BUỘC phải có khối lệnh `lifecycle { prevent_destroy = true }`.

#### 4.3.
Mọi tài nguyên `google_storage_bucket` được tạo mới BẮT BUỘC phải bao gồm thuộc tính `uniform_bucket_level_access = true` trong mã nguồn.

### §5: Quy trình CI/CD

#### 5.1.
Pull Request: Mọi Pull Request BẮT BUỘC phải chạy thành công job `terraform-plan`.
- Job này chỉ thực hiện `plan`, không `apply`.
- Job được phép trả về mã thoát `2` (phát hiện có thay đổi) mà không bị coi là thất bại.
- `continue-on-error: true` chỉ được phép sử dụng cho bước dự phòng xác thực (auth fallback) như quy định tại HP-CI-04.

#### 5.2.
Nhánh `main`: Việc apply các thay đổi chỉ được thực hiện trên nhánh main và BẮT BUỘC phải được kích hoạt thủ công hoặc thông qua một nhãn (label) đặc biệt, yêu cầu sự phê duyệt.

### §6: Chất lượng Code (Lint & Format)

#### 6.1.
Mọi mã nguồn Terraform trước khi merge BẮT BUỘC phải được định dạng bằng `terraform fmt`.

#### 6.2.
Một job `terraform-lint` sử dụng tflint BẮT BUỘC phải được chạy và thành công trong quy trình CI.

### §7: Quản lý Secrets

#### 7.1.
Terraform BẮT BUỘC phải sử dụng tài nguyên `google_secret_manager_secret` để khai báo sự tồn tại của một secret (metadata).

#### 7.2.
Terraform BỊ CẤM TUYỆT ĐỐI quản lý phiên bản hay giá trị của secret (`google_secret_manager_secret_version`).

#### 7.3.
Giá trị của secret sẽ được quản lý và đồng bộ bởi quy trình tập trung như đã quy định tại HP-05 của Hiến pháp.

### §8: Quản lý Phiên bản

#### 8.1.
Phiên bản Terraform BẮT BUỘC phải được khóa ở `required_version ~> 1.8`.

#### 8.2.
Phiên bản của Google Provider BẮT BUỘC phải được khóa ở phiên bản `~> 4.57.0` để đảm bảo sự ổn định và tương thích với các kế hoạch đã được phê duyệt. Mọi nâng cấp phiên bản lớn (major version) phải được thực hiện trong một Pull Request riêng và được kiểm thử cẩn thận.

### §9: Di dời Hạ tầng cũ (Legacy Migration)

#### 9.1.
Các GCS Bucket cũ có chứa dấu gạch dưới (`_`) phải được lên kế hoạch di dời sang tên mới tuân thủ Hiến pháp.

#### 9.2.
WIF Provider cũ (`cursor-ci-provider`) sẽ được giữ lại dưới dạng alias trong 30 ngày kể từ ngày Hiến pháp có hiệu lực, sau đó phải được xóa bỏ.

### §10: Phục hồi Thảm họa (Disaster Recovery)

#### 10.1.
Trạng thái của Terraform (`tfstate`) BẮT BUỘC phải được sao lưu định kỳ.

#### 10.2.
Một GCS Bucket riêng cho việc sao lưu BẮT BUỘC phải được tạo với tên tuân thủ định dạng: ``<standard-prefix>``-agent-data-backup-``<env>``.

Ghi chú: Giá trị backup trong tên bucket tương ứng với giá trị ``<purpose>`` trong quy ước đặt tên của Hiến pháp.

### Phụ lục A – Nợ Kỹ thuật (Technical Debt)

Danh sách các hạng mục chưa tuân thủ Hiến pháp và cần có lộ trình khắc phục.

| ID Nợ | Hạng mục | Mô tả | Deadline |
|---|---|---|---|
| TD-TF-01 | Uniform Bucket-Level Access (UBLA) | Các GCS Bucket cũ được tạo trước ngày Hiến pháp có hiệu lực và chưa bật UBLA phải được lên kế hoạch di dời hoặc cập nhật. | 31-12-2025 |
| TD-TF-02 | Workflow Sao lưu tfstate | Xây dựng một workflow tự động (cron job) để sao lưu định kỳ tệp tfstate từ bucket "tfstate" sang bucket "backup" theo đúng yêu cầu của GC-LAW. | 30-09-2025 |

### Phụ lục B – Danh sách Tài nguyên Quan trọng

Ghi chú: Danh sách này là nguồn tham chiếu chính cho các tài nguyên quan trọng. Các bộ Luật khác (ví dụ: GC-LAW) nên đồng bộ hoặc tham chiếu đến danh sách này để đảm bảo tính nhất quán.<br>
Theo quy định tại §4.2, các tài nguyên được liệt kê dưới đây BẮT BUỘC phải có khối lệnh `lifecycle { prevent_destroy = true }` trong mã nguồn Terraform.

- `google_storage_bucket`
- `google_secret_manager_secret`
- `google_project_iam_member`
- `google_artifact_registry_repository`
- `google_service_account`
