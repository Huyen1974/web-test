# Tổng kết & Quy trình Vận hành Chuẩn (Bản cuối cùng sau khi vận hành thử)

Qua suốt quá trình vận hành thử chi tiết vừa rồi, chúng ta đã cùng nhau khám phá và xác thực được rất nhiều điểm khác biệt quan trọng giữa lý thuyết và thực tế. Cảm ơn sự kiên nhẫn và những góp ý chính xác của bạn.

Dưới đây là quy trình vận hành cuối cùng, đã được kiểm chứng, hiệu chỉnh và sẵn sàng để sử dụng.

## I. Tóm tắt các phát hiện chính:

- **Quy trình TẮT (Suspend):** Hoàn toàn khả thi qua API.
- **Quy trình MỞ LẠI (Reactivate):** 100% thủ công qua giao diện web, bao gồm cả việc Reactivate và Restore. Do đó, Cloud Function manage_qdrant không còn hữu dụng cho quy trình "Mở lại".
- **Dữ liệu:** Bị xóa sau khi Reactivate. Việc Restore từ snapshot là bắt buộc.
- **API & Authentication:**
  - Thao tác quản lý (tạo backup, suspend): Dùng `Authorization: apikey <management_key>`.
  - Thao tác dữ liệu (đếm, truy vấn): Dùng `api-key: <data_key>`.
  - Endpoint tạo backup chính xác là `POST /api/cluster/backup/v1/accounts/{ACC_ID}/backups`.

## II. Quy trình Vận hành Chuẩn

### 🔴 A. QUY TRÌNH TẮT CLUSTER (Tự động hoặc Thủ công)

**Cách 1: Tự động (Khuyến nghị)**

Chạy lệnh duy nhất sau để Cloud Function manage_qdrant tự động thực hiện:

```bash
gcloud functions call manage_qdrant --data='{"action":"stop"}'
```

**Cách 2: Thủ công (Dùng khi cần gỡ lỗi)**

- **Nạp biến môi trường:**

```bash
export ACC_ID=$(gcloud secrets versions access latest --secret="Qdrant_account_id")
export CLUS_ID="529a17a6-01b8-4304-bc5c-b936aec8fca9"
export MGMT_KEY=$(gcloud secrets versions access latest --secret="Qdrant_cloud_management_key")
```

- **Tạo Backup:**

```bash
curl -X POST \
  -H "Authorization: apikey $MGMT_KEY" -H "Content-Type: application/json" \
  -d '{"backup": {"account_id": "'"$ACC_ID"'", "cluster_id": "'"$CLUS_ID"'", "name": "manual-backup-'"$(date +%s)"'"}}' \
  "https://api.cloud.qdrant.io/api/cluster/backup/v1/accounts/$ACC_ID/backups"
```

- **Xác nhận Backup thành công:** Chạy lệnh sau và kiểm tra backup mới nhất có `"status": "BACKUP_STATUS_SUCCEEDED"`.

```bash
curl -s -H "Authorization: apikey $MGMT_KEY" \
  "https://api.cloud.qdrant.io/api/cluster/backup/v1/accounts/$ACC_ID/backups" | jq
```

- **Tạm dừng Cluster:**

```bash
curl -X POST -H "Authorization: apikey $MGMT_KEY" \
  "https://api.cloud.qdrant.io/api/cluster/v1/accounts/$ACC_ID/clusters/$CLUS_ID/suspend"
```

- **Xác nhận Cluster đã tắt:** Chạy lệnh sau đến khi kết quả là `CLUSTER_PHASE_SUSPENDED`.

```bash
curl -s -H "Authorization: apikey $MGMT_KEY" \
  "https://api.cloud.qdrant.io/api/cluster/v1/accounts/$ACC_ID/clusters/$CLUS_ID" | jq -r '.cluster.state.phase'
```

### 🟢 B. QUY TRÌNH MỞ LẠI CLUSTER (100% Thủ công)

- **Reactivate Cluster:**
  - Truy cập giao diện web Qdrant.
  - Nhấn nút "Reactivate Cluster".
  - Quan sát trực quan trên UI cho đến khi cluster có trạng thái Healthy.

- **Restore Dữ liệu từ Backup (Bắt buộc):**
  - Trong giao diện cluster, vào tab Backups.
  - Trong danh sách "Available Backups", tìm đến bản backup gần nhất bạn muốn khôi phục.
  - Nhấn vào menu Actions ở cuối hàng và chọn Restore.
  - **QUAN TRỌNG:** Một hộp thoại sẽ hiện ra, bạn cần nhập tên cluster `agent_data_vector_paid_sg` để xác nhận.
  - Theo dõi mục "Restores" ở phía dưới cho đến khi trạng thái là SUCCEEDED.

- **Kiểm tra lại Dữ liệu:**
  - Nạp biến môi trường:

```bash
export CLUSTER_ENDPOINT="https://529a17a6-01b8-4304-bc5c-b936aec8fca9.us-east4-0.gcp.cloud.qdrant.io"
export DATA_KEY=$(gcloud secrets versions access latest --secret="Qdrant_agent_data_N1D8R2vC0_5")
```

  - Đếm số vector: Chạy lệnh đếm trên các collection của bạn (test_documents, production_documents).

```bash
curl -X POST "$CLUSTER_ENDPOINT/collections/test_documents/points/count" \
  -H "api-key: $DATA_KEY" \
  -H "Content-Type: application/json" -d '{"exact": true}'
```

  - Xác nhận kết quả count lớn hơn 0, chứng tỏ dữ liệu đã được nạp lại.

---

**Quy trình trên là kết quả cuối cùng và đáng tin cậy nhất sau khi chúng ta đã cùng nhau kiểm chứng.** 