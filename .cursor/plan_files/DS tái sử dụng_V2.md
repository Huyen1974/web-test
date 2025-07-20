# DS tái sử dụng_V2

**DS tái sử dụng_V2 – updated 2025-07-20**

## Agent Data Langroid Reuse Plan – Phiên bản hoàn chỉnh

**(Theo phản biện Grok4 & V12)**
**Version 2.0 – Aligned with Agent Data Plan V12 & Checkpoint Plan V7 | 19 / 07 / 2025**

## Δ THAY ĐỔI TRỌNG ĐIỂM so với V1

- **Đồng bộ tham chiếu:** Thay toàn bộ "Plan V10" bằng "Plan V12" để nhất quán với bản kế hoạch mới nhất.
- **Cập nhật checkpoint:** Sửa "CP V5" thành "CP V7" ở module C1 để khớp với Checkpoint Plan V7 (Section 5 V12).
- **Nhấn mạnh compat:** Thêm note kiểm tra compat Langroid với dependencies (e.g., Slowapi 0.1.9, Redis >=5.0.1,<6.0.0) ở Phụ lục, khớp rủi ro S1 V12 và CP0.9 V7.
- **Giữ nguyên bảng reuse:** Không thay đổi % reuse hoặc status, vì đã khớp Section 12 V12.

## I. Mục tiêu & Nguyên tắc triển khai

- **Mục tiêu chính:** Triển khai nhanh hệ thống Agent Data dựa trên framework Langroid, tận dụng tối đa mã nguồn sẵn có, hạn chế rủi ro (backdoor, CI fail).
- **Nguyên tắc:**
  - Ưu tiên các module đã được cộng đồng kiểm chứng và sử dụng ổn định (Langroid, SDK Google).
  - Phân lớp rõ ràng để dễ quản lý, kiểm thử, mở rộng: Core Agent Logic, Supporting Modules, Infrastructure & Stability.
  - Gắn với các ID chuẩn hóa trong Plan V12, đồng bộ với CP/CI/CD.
  - Ghi rõ các phần cần tự code và mức độ reuse ước lượng (theo %).

## II. Cấu trúc Danh sách Tái Sử Dụng (Reuse Table – FULL)

### Core Agent Logic

| ID | Module | Source/Dependency | Status | Tự Code | Ghi chú Grok4 | Reuse (%) |
|:---|:-------|:------------------|:------:|:-------:|:--------------|:----------|
| A1 | agent_data.main | Langroid DocChatAgent | ✅ Full | Config only | Subclass dễ. Test OpenAI compat (CP0.9). Dùng example doc-chat-agent.py. | 95% |
| A2 | qdrant_config | Langroid QdrantDBConfig | ✅ Full | No | Native Qdrant support. Có sparse embedding. Không cần viết lại. | 100% |
| A3 | memory/session | Custom (Firestore) | ⚠️ Partial | Yes | Langroid không có native Firestore. Dựa trên mẫu LangChain/Google Docs. | 70% |
| A4 | task_api | Langroid Task, TaskTool | ✅ Full | Prompt only | Có orchestration sẵn. Đề xuất limit vòng lặp để tránh lỗi. | 95% |

### Supporting Modules

| ID | Module | Source/Dependency | Status | Tự Code | Ghi chú Grok4 | Reuse (%) |
|:---|:-------|:------------------|:------:|:-------:|:--------------|:----------|
| B1 | tool/search_docs | Langroid ToolMessage | ✅ Full | Prompt only | Chỉ cần define ToolMessage cho Qdrant query. Có thể đặt ngưỡng score. | 85% |
| B2 | parser/file_ingest | google-cloud-storage | ⚠️ Partial | Yes | Phải tải file về từ GCS. Langroid không native support. | 60% |
| B3 | metadata/tagging | Firestore SDK + ToolMessage | ⚠️ Partial | Yes | Dùng ToolMessage wrap CRUD Firestore. Không có sẵn, cần tự viết. | 50% |
| B4 | storage/gs_blob | GCS SDK | ⚠️ Partial | Yes | Xử lý signed URL, upload/download GCS. Không có trong Langroid. | 40% |
| B5 | scheduler/cleanup_qdrant | Google Workflows | ✅ Full | Config only | Viết workflow cleanup/snapshot. Qdrant có docs hỗ trợ tốt. | 70% |
| B6 | api/gateway | FastAPI + Pydantic | ✅ Full | Prompt only | Langroid dễ wrap vào FastAPI. Nên thêm auth. Có ví dụ từ langroid-examples. | 80% |
| B7 | tool/crawl_web | Crawl4AI (Langroid 0.58.0) | ✅ Full | Config only | Optional. Hữu ích nếu ingest từ web. Native support từ bản mới. | 90% |

### Infrastructure & Stability

| ID | Module | Source/Dependency | Status | Tự Code | Ghi chú Grok4 | Reuse (%) |
|:---|:-------|:------------------|:------:|:-------:|:--------------|:----------|
| C1 | checkpoint_runner.py | Langroid test + Pytest | ✅ Full | Prompt only | Runner test theo CP V7. Gợi ý test trước khi merge. | 70% |
| C2 | .github/workflows/ci.yml | GitHub Actions + pytest | ✅ Full | Config only | Langroid có CI cơ bản. Add checkpoint + scan (Trivy). | 80% |
| C3 | scripts/cost_checker.sh | gcloud billing | ✅ Full | Yes | Tự viết shell script, dùng SDK Google Cloud. Đơn giản. | 60% |
| C4 | scripts/clean_orphan_gcs.sh | gsutil | ✅ Full | Yes | Clean file orphan. Gắn với metadata Firestore để lọc. | 70% |
| C5 | scripts/verify_api_health.py | requests + FastAPI | ✅ Full | Prompt only | Ping /chat, check latency. Nên chạy định kỳ post-deploy. | 75% |
| C6 | scripts/preflight_check.py | os/env + Qdrant SDK | ✅ Full | Prompt only | Check env, Qdrant key, config trước khi deploy lên Cloud Run. | 80% |

## III. Tổng kết & Khuyến nghị

- **Tổng reuse trung bình toàn hệ thống:** ~75%, tương đương tiết kiệm 50-70% effort.
- **Ưu tiên triển khai:**
  - Giai đoạn đầu (S1): Chỉ build các module Full reuse và dễ config.
  - Giai đoạn tiếp theo (S2): Bổ sung các module partial cần tự code.
- **Kiểm thử sớm:** Mỗi module nên có test nhỏ (fixture) để tránh lỗi CI.
- **Prompt Cursor:** Dựa trên bảng trên, soạn theo ID (e.g. A1, B2...) để kiểm soát logic rõ ràng.

## IV. Phụ lục: Ghi chú bổ sung từ phản biện Grok4

- **Langroid 0.58.0** là bản ổn định, MIT License, dễ mở rộng; kiểm tra compat với dependencies như Slowapi 0.1.9 và Redis >=5.0.1,<6.0.0 để tránh breaking change.
- **Firestore memory** cần custom wrapper (chưa có trong Langroid).
- Nếu cần ingest từ Web, nên dùng **Crawl4AI** (tích hợp native từ bản 0.58.0).
- Các script cần chú trọng bảo mật (signed URL, token, cost checker...).

---

**Tài liệu này là bản chính thức cho triển khai Agent Data – Langroid Fw, dùng làm chuẩn trong kế hoạch V12 và Prompt soạn thảo bởi Grok4.**

© 2025 – Agent Data Langroid Reuse Plan Version 2.0 (REVD – FULL)
