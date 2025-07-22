# QUY ĐỊNH VẬN HÀNH & QUẢN LÝ QDRANT (Qdrant Standard Operating Procedure)

**Dự án:** Agent Data Langroid
**Version:** 4.0 (Tích hợp đề xuất "o3")
**Ngày cập nhật:** 22/07/2025

## Lịch sử Thay đổi

- **v4.0:** Tích hợp các đề xuất kỹ thuật từ "o3", bao gồm: làm rõ các biến môi trường và yêu cầu kỹ thuật cho Cloud Function `manage_qdrant`, bổ sung cấu hình Cloud Scheduler, và chi tiết hóa hướng dẫn vận hành Terraform.
- **v3.1:** Sửa lỗi thiếu nhất quán trong quy ước đặt tên (prod_documents → production_documents).
- **v3.0:** Bổ sung quy định đồng bộ hóa metadata giữa Qdrant và Firestore.
- **v2.0:** Bổ sung chiến lược "Scale Up/Down" vào kế hoạch tối ưu chi phí.

## 1. Tổng Quan & Mục Tiêu

Tài liệu này là nguồn thông tin đáng tin cậy duy nhất, quy định các tiêu chuẩn và quy trình làm việc cho vector store Qdrant trong hệ thống Agent Data.

## 2. Thông Tin Hạ Tầng Cluster

Hệ thống sử dụng một cluster Qdrant Cloud duy nhất.

| Thuộc tính | Giá trị cụ thể | Ghi chú |
|------------|----------------|---------|
| Tên cluster | `agent_data_vector_paid_sg` | |
| Cluster ID | `529a17a6-01b8-4304-bc5c-b936aec8fca9` | Quản lý bởi Terraform |
| Endpoint | `https://529a17a6-01b8-4304-bc5c-b936aec8fca9.us-east4-0.gcp.cloud.qdrant.io` | |
| Vùng (Region) | `us-east4` | Tạm thời do UI Qdrant chưa hỗ trợ Singapore |
| API Key Secret | `Qdrant_agent_data_N1D8R2vC0_5` | Quản lý trong Google Secret Manager |

## 3. Quy Định Quản Lý Dữ Liệu Đa Môi Trường

### 3.1. Quy tắc Đặt tên Collection

- **Production Collection:** `production_documents`
- **Test Collection:** `test_documents`

### 3.2. Sơ đồ Luồng Dữ liệu (Data Flow)

- **Luồng TEST:** Repo agent-data-test → Bucket GCS *-source-test → Collection test_documents
- **Luồng PRODUCTION:** Repo agent-data-production → Bucket GCS *-source-production → Collection production_documents

## 4. Quy Định Đồng Bộ Hóa Metadata (Qdrant ↔ Firestore)

Mỗi vector trong Qdrant phải có một bản ghi metadata tương ứng trong Firestore để đảm bảo tính toàn vẹn. Quy trình ingest phải đảm bảo tạo và cập nhật metadata song song với việc upsert vector.

## 5. Quản Lý bằng IaC (Terraform)

Qdrant được quản lý theo triết lý "quản lý tối thiểu".

| Hạng mục | Trạng thái quản lý | Ghi chú |
|----------|-------------------|---------|
| Cluster ID / Tên / Vùng | ✅ Quản lý bởi `.tf` | Đảm bảo hạ tầng tĩnh được đồng bộ |
| API Key (Secret Manager) | ✅ Quản lý bởi `.tf` | Lưu trữ và quản lý key một cách an toàn |
| Số node / RAM / CPU | ❌ Không quản lý bởi `.tf` | Các thuộc tính runtime này được điều khiển linh hoạt bằng API/Function |

### 5.1. Hướng dẫn Vận hành Terraform

- **Import Secret đã có:** Nếu secret đã tồn tại trong GCP, chạy lệnh sau trước khi apply:

```bash
terraform import google_secret_manager_secret.qdrant_api projects/$PROJECT_ID/secrets/Qdrant_agent_data_N1D8R2vC0_5
```

- **Xem trước thay đổi (Plan):** Để đảm bảo an toàn, luôn dùng plan với file biến cụ thể:

```bash
terraform plan -var-file="terraform.tfvars"
```

## 6. Chiến Lược Vận Hành & Tối Ưu Hóa Chi Phí

### 6.1. Chiến lược "On/Off" (Tạm dừng khi không sử dụng)

- **Cơ chế:** Sử dụng một Cloud Function `manage_qdrant` để thực hiện các hành động start (khôi phục) và stop (tạo snapshot rồi tạm dừng).

- **Yêu cầu Kỹ thuật cho Cloud Function manage_qdrant:**

  - **Biến môi trường chuẩn:**

    | Biến | Mục đích |
    |------|----------|
    | PROJECT_ID | ID của dự án GCP |
    | QDRANT_ACCOUNT_ID | ID tài khoản Qdrant Cloud |
    | QDRANT_CLUSTER_ID | ID của cluster cần quản lý |
    | QDRANT_API_KEY | Key để xác thực với Qdrant API |
    | LAST_HIT | Dấu thời gian (epoch) của lần truy cập cuối, dùng cho cơ chế auto-stop |
    | COLLECTION_PROD | Tên collection production (production_documents) |
    | COLLECTION_TEST | Tên collection test (test_documents) |

  - **Logic Function:**
    - Phải sử dụng Structured Logging (ví dụ json.dumps) để dễ dàng truy vết
    - Action status phải trả về trạng thái (phase) hiện tại của cluster và endpoint
    - Phải có action touch để cập nhật biến LAST_HIT, reset bộ đếm thời gian auto-stop

- **Tự động hóa bằng Cloud Scheduler:**

  - **Cấu hình Cron:** Một job Cloud Scheduler sẽ được cấu hình để "ping" Cloud Function mỗi 10 phút.

    ```yaml
    # Cấu hình job cho Cloud Scheduler
    schedule: "*/10 * * * *"
    http_target:
      uri: "URL_CUA_CLOUD_FUNCTION"
      http_method: POST
      body: "e30=" # base64 của {}
    ```

  - **Quyền IAM cần thiết:** Service Account của Cloud Scheduler cần có role `roles/cloudfunctions.invoker`.

### 6.2. Chiến lược "Scale Up/Down" (Thay đổi cấu hình linh hoạt)

- **Mục tiêu:** Điều chỉnh tài nguyên cluster (CPU/RAM/Node) theo nhu cầu sử dụng thực tế (cao điểm và thấp điểm).
- **Trạng thái:** Đây là chiến lược cho các giai đoạn sau.
- **Phương án nghiên cứu:**
  - **A (In-Place Scaling):** Thay đổi cấu hình trên cùng cluster.
  - **B (Multi-Cluster Scaling):** Chuyển đổi giữa các cluster có cấu hình khác nhau bằng snapshot.

## 7. Lộ Trình & Phát Triển Tương Lai

- **Giai đoạn 1 (Hiện tại):** Hoàn thiện Cloud Function `manage_qdrant` với đầy đủ các yêu cầu kỹ thuật đã nêu để triển khai chiến lược On/Off. Cần tinh chỉnh script tính toán chi phí (`qdrant_cost_calc.py`) để bổ sung trường `runtime_hours_month`, giúp checkpoint CPG5.3 phản ánh chi phí chính xác hơn.

- **Giai đoạn sau:** Dựa trên số liệu sử dụng, nghiên cứu và triển khai chiến lược Scale Up/Down.
