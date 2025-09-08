### BÁO CÁO TỔNG KẾT GIAI ĐOẠN 9: TRẠNG THÁI & TÍNH BỀN BỈ

**1. MỤC TIÊU GIAI ĐOẠN:**
* Nâng cấp Agent từ "stateless" thành "stateful" thông qua bộ nhớ phiên.
* Tăng cường tính bền bỉ và cải thiện trải nghiệm người dùng cho tính năng ingest file bằng kiến trúc bất đồng bộ.

**2. CÁC HẠNG MỤC ĐÃ HOÀN THÀNH:**
* **9.1 - Xây dựng Bộ nhớ Phiên (Session Memory):**
    * Đã triển khai thành công lớp `FirestoreChatHistory` để lưu và truy xuất lịch sử hội thoại.
    * API `/chat` đã được nâng cấp để hỗ trợ `session_id` và tự động bind lịch sử theo phiên.
    * Đã xác minh bằng unit test và E2E test hội thoại nhiều lượt.
* **9.2 - Tích hợp Pub/Sub cho Ingest Bất đồng bộ:**
    * Đã refactor endpoint `/ingest` để publish message (chứa `gcs_uri`) lên Pub/Sub topic `agent-data-tasks-test` và trả về `202 Accepted` ngay lập tức.
    * Đã xây dựng và triển khai Cloud Function `ingest-processor` (Gen2, trigger Pub/Sub) để xử lý ingest trong nền (tải xuống, cập nhật metadata vào Firestore collection `metadata_test`).
    * Đã cập nhật Terraform (topic Pub/Sub, Function Gen2, IAM invoker cho Eventarc/PubSub/Compute SA, quyền storage.objectViewer) và viết lại E2E test để xác minh luồng bất đồng bộ từ đầu đến cuối.

**3. KẾT QUẢ:**
* **THÀNH CÔNG:** Giai đoạn 9 đã hoàn thành. Agent hiện đã thông minh hơn với khả năng ghi nhớ ngữ cảnh và hệ thống đã bền bỉ hơn với cơ chế xử lý bất đồng bộ.

**4. NỢ KỸ THUẬT MỚI GHI NHẬN:**
* **[NỢ-04] Refactor E2E Ingest Verification:** Loại bỏ cơ chế "best-effort metadata write" tạm thời trong API `/ingest`. Bài test E2E cần được nâng cấp để chỉ dựa vào kết quả xử lý của Cloud Function `ingest-processor` để có một quy trình hoàn toàn độc lập.

---

**5. HÀNH ĐỘNG TIẾP THEO:**
* Sẵn sàng lên kế hoạch và thực thi Giai đoạn 10: Giám sát Hệ thống (Technical Observability).

