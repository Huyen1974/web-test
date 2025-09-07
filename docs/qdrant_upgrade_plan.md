### Kế Hoạch Nâng Cấp Qdrant Cloud (TD-QD-01, HP-DR-01)

**Mục tiêu**
- Giải quyết nợ kỹ thuật TD-QD-01: Kích hoạt khả năng sao lưu (backup) tự động qua API cho Qdrant Cloud.
- Tuân thủ Hiến pháp HP-DR-01 (Disaster Recovery): Có chiến lược sao lưu/khôi phục được kiểm chứng, có thể tự động hóa (API-first), hỗ trợ kiểm toán.

**Phân tích Hiện trạng**
- Tier hiện tại: “PaidSG” (theo mô tả vận hành nội bộ).
- Hạn chế: Chưa hỗ trợ backup tự động qua API (không có lịch/bản sao chép định kỳ có thể điều khiển bằng script/CI), gây lệ thuộc thao tác thủ công và không đáp ứng yêu cầu DR.

**Các phương án đề xuất (tham chiếu trang giá/feature matrix của Qdrant Cloud – cần xác nhận trước khi chốt)**

1) Tier “Standard/Pro” (hoặc tên tương đương có hỗ trợ API backup)
- Chi phí ước tính/tháng: phụ thuộc cấu hình (vCPU/RAM/Storage). Ước lượng sơ bộ cho cụm cỡ nhỏ (2 vCPU, 8 GB RAM, 100 GB storage): vài trăm USD/tháng (cần đối chiếu calculator chính thức).
- Ưu điểm:
  - Có API cho snapshot/backup, dễ tích hợp với CI (GitHub Actions/Cloud Build) và lịch sao lưu (Cloud Scheduler).
  - Phù hợp ngân sách R&D/PoC; mở đường tự động hóa DR.
- Nhược điểm:
  - SLA và tính năng bảo mật/vận hành (VPC, SSO, …) có thể hạn chế so với tiers cao hơn.

2) Tier “Business/Enterprise” (hoặc tên tương đương, đầy đủ tính năng DR & bảo mật)
- Chi phí ước tính/tháng: cao hơn mức Standard/Pro (có thể từ thấp ~1k USD/tháng trở lên tùy cấu hình/region – cần xác minh chính thức).
- Ưu điểm:
  - Hỗ trợ mạnh về DR/SLA, khả năng backup/snapshot nâng cao, có thể có lịch backup managed, bảo mật (VPC peering, Private egress), hỗ trợ doanh nghiệp.
  - Phù hợp nếu lưu lượng/SLAs tăng và yêu cầu compliance.
- Nhược điểm:
  - Chi phí cao; cần biện minh ROI khi nâng cấp.

Ghi chú ước tính: Số liệu chi phí phụ thuộc giá theo region, cấu hình node, dung lượng lưu trữ và I/O. Cần xác nhận lại bằng pricing page/calculator chính thức của Qdrant Cloud tại thời điểm phê duyệt.

**Kế hoạch triển khai sơ bộ (Cutover Plan)**
1. Chuẩn bị
   - Chọn tier mục tiêu (Standard/Pro hoặc Business) và region tương ứng (ưu tiên gần hệ thống hiện tại: `us-east4` hoặc `asia-southeast1` theo hạ tầng GCP).
   - Bật tính năng backup/snapshot API trên cluster mới; tạo service account/key (nếu cần) và cấu hình quyền.
2. Tạo cluster mới (New-Qdrant)
   - Tạo cluster theo tier mục tiêu.
   - Lấy endpoint mới và xác thực (API key) – lưu vào Secret Manager: `QDRANT_CLUSTERX_ID`, `QDRANT_CLUSTERX_KEY` (hoặc cập nhật secret hiện dùng).
3. Sao chép dữ liệu
   - Từ cluster hiện tại (PaidSG), tạo snapshot/backup các collections (ví dụ: `test_documents`).
   - Tải snapshot về GCS (bucket sao lưu nội bộ), sau đó khôi phục vào New-Qdrant qua API.
   - Xác thực dữ liệu (đếm số bản ghi, checksum, sample queries).
4. Cập nhật cấu hình ứng dụng
   - Cập nhật `QDRANT_URL`/`QDRANT_API_KEY` (Secret Manager và GitHub Actions/WIF) trỏ sang New-Qdrant.
   - Triển khai lại Cloud Run (Step 6.8 runner) để nhận cấu hình mới.
5. Kiểm thử sau nâng cấp
   - Chạy E2E smoke test (ingest → metadata → chat), và bài kiểm tra Data Lifecycle (orphan vector) để xác nhận đồng bộ Firestore ⇆ Qdrant.
   - Rà soát metrics/dashboards.
6. Cắt dịch vụ & dọn dẹp
   - Khi xác nhận ổn định, đóng write vào cluster cũ, theo dõi 24–48h.
   - Gỡ cluster cũ sau khi hết thời gian quan sát (hoặc giữ 1–2 tuần nếu chính sách DR yêu cầu).

**Đề xuất**
- Giai đoạn hiện tại (MVP vận hành, chi phí tối ưu): Chọn phương án 1 (Standard/Pro có API backup). Đáp ứng yêu cầu TD-QD-01 và HP-DR-01 ở mức đủ dùng, chi phí hợp lý, tích hợp nhanh với workflow sao lưu tự động (Cloud Scheduler → Cloud Run/Functions → Qdrant API).
- Trung hạn (nếu tăng lưu lượng/SLA/compliance): Đánh giá nâng lên Business/Enterprise để có tính năng DR/bảo mật cao hơn (lịch backup managed, VPC, SSO, SLA chặt chẽ).

**Phụ lục – Checklist triển khai**
- [ ] Xác nhận tier đích và hạn mức ngân sách với chủ dự án.
- [ ] Tạo cluster mới và kiểm tra API backup (snapshot create/list/restore).
- [ ] Thiết lập workflow lịch backup (Cloud Scheduler/GA cron) → lưu snapshot vào GCS.
- [ ] Chạy migration, xác nhận dữ liệu, chạy E2E & Data Lifecycle.
- [ ] Cập nhật tài liệu vận hành/DR runbook (khôi phục từ snapshot).

