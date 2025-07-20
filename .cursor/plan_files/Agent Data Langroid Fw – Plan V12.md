# Agent Data Langroid Fw – Plan V12

**Plan V12 – updated 2025-07-20**

## KẾ HOẠCH PHÁT TRIỂN AGENT DATA (KNOWLEDGE MANAGER) – Langroid × Google Cloud Serverless

**Codename:** agentdatalangroid | **Version 12** (Final - Consistent) | **Cập nhật:** 19 / 07 / 2025

## Δ THAY ĐỔI V12.1 (so với V11)

1. **Pin dependency realignment:**
   - langroid==0.58.0 (giữ nguyên)
   - slowapi==0.1.9 – bản mới bỏ ràng buộc redis<4.
   - redis>=5.0.1,<6.0.0 – phù hợp cho Langroid 0.58.0 & Slowapi 0.1.9.
   - → Cập nhật tại Section 0 (ID 0.2 & 0.7), Bảng rủi ro S1, Checklist CP0.9.

2. **Quy tắc lockfile & CI (CP0.1):**
   - Lockfile (requirements.txt) phải được tạo bằng pip-compile --no-upgrade; cấm chỉnh tay.
   - Thêm bước git diff --exit-code requirements.txt vào CI sau khi generate để bảo đảm "no change".
   - → Cập nhật tại Checkpoint V7 (CP0.1) và .cursor/GLOBAL_RULES.md.

3. **Chuẩn hoá repo & đường dẫn:**
   - Remote repo: https://github.com/Huyen1974/agent-data-test (nhánh main).
   - Local working dir: /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid.
   - → Cập nhật tại mọi Prompt*, .cursor/RULES_agent-data-langroid.md, và các ví dụ lệnh.

4. **Nhất quán hậu tố môi trường:**
   - Sửa toàn bộ hậu tố -prod thành -production để nhất quán với các tài liệu quy hoạch hạ tầng (repo.docx, Cursor rules.docx). Áp dụng cho mục 3 và 7.

## 0 · MỤC TIÊU & NGUYÊN TẮC

- Giảm rủi ro kỹ thuật – Langroid 0.58.0, code sạch, module hoá.
- Nhanh & An toàn – MVP chạy sớm, CI/CD xanh ≥ 95 %.
- Serverless first · Vector first · MCP compatible.
- AI-Driven Loop – Grok4 prompt ⇒ Cursor+Sonnet4 code ⇒ CI test ⇒ Grok4 refine.
- Tái sử dụng tối đa – ưu tiên module reuse (phần 12) để tiết kiệm 50-70% effort.

## 1 · CHI TIẾT TÁC VỤ (PROMPT-DRIVEN)

**Pri ký hiệu:** 🚀 = MVPCore | 🛡 = Hardening | ⚙ = Future / CostOpt

### Giai đoạn 0 · Foundation & Setup

| ID | Pri | Tác vụ | Ghi chú |
|:---|:---:|:-------|:---------|
| 0.1 | 🚀 | Nhân bản repo agent-data-test & agent-data-production | MIT LICENSE, template, buckets & AR chỉ định. |
| 0.2 | 🚀 | Cấu trúc Python + pyproject.toml | langroid==0.58.0, slowapi==0.1.9, redis>=5.0.1,<6.0.0, fastapi, uvicorn; pip-tools lock. |
| 0.3.1 | 🚀 | CI skeleton | checkout → setup-python → install lock → pytest → verify lockfile unchanged. |
| 0.3.2 | 🚀 | Workflow tách test.yml, deploy.yml, e2e.yml | test fast / deploy / nightly. |
| 0.4 | 🚀 | Terraform minimal | buckets, enable APIs Cloud Run/Artifact/Firestore. |
| 0.5 | 🚀 | Khung kiểm thử (tests/, pytest.ini, collect_manifest.py) | badge test count. |
| 0.6 | 🚀 | Golden fixtures | JSON/PDF chuẩn. |
| 0.7 | 🚀 | Dependency pinning | Lockfile = pip-compile --no-upgrade; Dependabot weekly. |
| 0.8 | 🚀 | Pre-commit hooks (black, ruff, secretscan, manifest drift) | CI failfast. |
| 0.9 | 🛡 | Trufflehog secret scan (CI gate) | |
| 0.10 | 🛡 | SBOM + Trivy scan | SBOM SPDX json. |
| 0.11 | 🛡 | OPA/Conftest policy IaC | |
| 0.12 | 🚀 | Qdrant Paid Tier (SG) + Cloud Fn manage_qdrant | start/stop/status; secret QDRANT_URL. |
| 0.13 | 🚀 | Pin & test Langroid 0.58.0 | Compat test MCP Tool; CP0.9 extended. |

### Giai đoạn 1 · Core RAG Agent

| ID | Pri | Tác vụ | Ghi chú |
|:---|:---:|:-------|:---------|
| 1.1 | 🚀 | AgentData subclass DocChatAgent | Qdrant SG cluster; OpenAI embeddings (liên kết A1: main reuse 95%). |
| 1.2 | 🚀 | GCSIngestionTool | download temp dir → ingest (liên kết B2: file_ingest partial 60%). |
| 1.3 | 🚀 | Smoke E2E | upload sample; assert reply contains "framework" (liên kết C5: verify_api_health reuse 75%). |

### Giai đoạn 2 · Metadata Layer

| ID | Pri | Tác vụ | Ghi chú |
|:---|:---:|:-------|:---------|
| 2.1 | 🚀 | FirestoreMetadataTool | add/get/update_status (liên kết B3: tagging partial 50%). |
| 2.2 | 🚀 | Override ingest() persist metadata | (liên kết B2: partial 60%). |
| 2.3 | 🚀 | Unit + integration tests | mocks Firestore (liên kết C1: reuse 70%). |
| 2.4 | 🛡 | Nightly orphan vector check (tie 5.6) | (liên kết C4: clean_orphan reuse 70%). |

### Giai đoạn 3 · Serverless & Gateway

| ID | Pri | Tác vụ | Notes |
|:---|:---:|:-------|:---------|
| 3.1 | 🚀 | FastAPI wrapper /chat, /ingest | (liên kết B6: gateway reuse 80%). |
| 3.1.1 | 🚀 | Env & Secrets mgmt (Pydantic settings.py) | |
| 3.2 | 🚀 | Cloud Run deploy (buildx, scan, deploy) | (liên kết C6: preflight reuse 80%). |
| 3.3 | ⚙ | MCP Gateway (optional) | |
| 3.4 | 🚀 | Terraform module Cloud Run + AR | |
| 3.5 | ⚙ | Cloud Run AI agents features PoC | async orchestration, GPU opt (liên kết A4: task_api reuse 95%). |

### Giai đoạn 4 · Observability & Deploy Lifecycle

| ID | Pri | Tác vụ | Notes |
|:---|:---:|:-------|:---------|
| 4.1 | 🛡 | Metrics exporter Prom | |
| 4.2 | 🛡 | Dashboard & alerts Cloud Monitoring | |
| 4.3 | 🚀 | Budget alerts ($8 R&D, $60 Production) | (liên kết C3: cost_checker reuse 60%). |
| 4.4 | 🚀 | Docker buildx + Trivy scan | (liên kết C2: CI scan). |
| 4.5 | 🛡 | Canary deploy (no-traffic URL + smoke) | |
| 4.6 | 🛡 | Rollback playbook (manual) | |
| 4.7 | 🛡 | Automated semantic-release | |

### Giai đoạn 5 · Advanced & Hardening

| ID | Pri | Tác vụ | Notes |
|:---|:---:|:-------|:---------|
| 5.1 | 🛡 | Session memory (Firestore) | (liên kết A3: partial 70%). |
| 5.2 | 🛡 | Pub/Sub A2A events | (liên kết A4: reuse 95%). |
| 5.3 | 🛡 | TreeView backend | |
| 5.4 | ⚙ | Hybrid Qdrant PoC | (liên kết A2: reuse 100%). |
| 5.5 | 🛡 | Prompt repository & versioning | |
| 5.6 | 🛡 | DataLifecycleManager nightly sync & reconcile | (liên kết B5: cleanup reuse 70%). |
| 5.7 | 🛡 | Feedback & Curation loop for Evaluation Suite | |
| 5.8 | 🛡 | Artifact lifecycle mark_stale (no delete) | |
| 5.8.1 | 🛡 | Slack weekly report stale images + CP G5.3 (stale_count < 5) | |

## 2 · VECTOR STORE STRATEGY

| Stage | Mô tả | Chi phí / SLA |
|:------|:------|:--------------|
| PaidSG | 1 node 2 GB, on/off Fn | $20–30/mo, P95 ≤ 350 ms |
| Hybrid | Paid peak + Docker idle | –20 % cost |
| Vertex AI | > 100 M vectors | Global SLA |

## 3 · REPO & BUCKET STRATEGY

| Repo | Buckets (GCS) | Artifact Registry |
|:-----|:--------------|:------------------|
| agent-data-test | *-src, *-artifacts, *-logs | asia-docker/.../agent-data-test |
| agent-data-production | hậu tố production | asia-docker/.../agent-data-production |

## 4 · ARTIFACT MANAGEMENT

- Tag = semantic version vX.Y.Z; manifest.json commit-tracked.
- mark_stale_artifacts gắn status=stale cho image >30 ngày và không active.
- Không auto-delete. DevOps xoá thủ công sau hai chữ ký:
  - gcloud artifacts docker images list … --filter='labels.status=stale'
  - gcloud artifacts docker images delete … --quiet
- Weekly Slack report (Fn report_stale_artifacts) ➜ CP G5.3.

## 5 · TESTING & CHECKPOINTS

(Chi tiết đầy đủ trong Plan Checkpoint V7 – Version khớp)

## 6 · RỦI RO & GIẢM THIỂU (CẬP NHẬT)

| Sprint | Rủi ro | Giảm thiểu / CP |
|:-------|:--------|:----------------|
| S1 | Sequencing overscope | Pri 🚀 + CP0.* pass ≥ 80 % |
| S1 | Dependency breaking change | ID 0.7 & CP0.9 pin versions. Kiểm tra compat của Langroid, Slowapi, Redis. |
| S1 | Qdrant cost variance | ID 0.12, CPG5.3 |
| S2 | Cost burst (API) | Budget alerts, manage_qdrant off |
| S2 | Integration latency | Cloud Run async PoC, CP G4.2a < 800 ms (kiểm tra reuse B1/B2) |
| S3 | Orphan vectors | 5.6 nightly reconcile |
| S3 | Artifact bloat | 5.8 mark_stale + 5.8.1 Slack |
| S4 | Rollback delay | 4.5 + 4.6 |

## 7 · CHI PHÍ ƯỚC TÍNH 2025

| Thành phần | R&D (S1–S3) | Production MVP |
|:-----------|:------------|:---------------|
| Qdrant Paid SG | $20–30 | $25–40 |
| Cloud Run / Fn | 3–5 | 5–10 |
| OpenAI API | 5 | 20 |
| Logs / Misc | 2 | 5 |
| **Tổng** | **< $40** | **≈ $60** |

## 8 · GLOSSARY (mới)

| Thuật ngữ | Giải thích |
|:----------|:-----------|
| MCP | Model Context Protocol (Cursor ↔ Agent) |
| DocChatAgent | Langroid RAG template (reuse A1) |
| Crawl4AI | Langroid 0.58 module – web crawling via Playwright (optional reuse B7) |
| CP / CPG | Checkpoint / Checkpoint Group |
| Grok4 Loop | Prompt → code → test → refine |

## 9 · ROADMAP (2 tuần / Sprint)

| Sprint | Deliverable chính | Checkpoint mới |
|:-------|:------------------|:---------------|
| S1 | Repo, CI xanh, manage_qdrant live, Langroid 0.58 pinned | CP0.1-0.8, 0.12, 0.13 (ưu tiên Full reuse module) |
| S2 | Cloud Run /chat live + Metadata sync | CPG3.*, CPG4.1 |
| S3 | Observability basic, DataLifecycle nightly | CPG4.2*, 5.6, Slack stale |
| S4 | Canary deploy + semantic-release | 4.5, 4.7 |
| S5 | Session mem, Tree view, artifact lifecycle | 5.8, 5.8.1 |
| S6 | Hybrid Qdrant PoC + Cloud Run AI features (3.5) | Advanced metrics |

## 10 · AI PROMPT LOOP (OPERATING MODEL – không đổi)

- Grok4 sinh Prompt (ID-based).
- Cursor + Sonnet4 code & test.
- CI chạy checkpoints.
- AutoRefine: nếu CI fail, Grok4 sinh prompt fix.

## 11 · BUFFER & FALLBACK

- Mỗi sprint dành 1 ngày buffer debug.
- Nếu CP 🚀 fail > 20 % → có 2 lựa chọn:
  - a) Simplify (ex: dùng Chroma tạm thay Qdrant).
  - b) Extend sprint ≤ 3 ngày (một lần).
- Fallback luôn: Cloud Run rollback revision.

## 12 · DANH SÁCH TÁI SỬ DỤNG MODULE

(Chi tiết từ "Chatgpt DS tái sử dụng" đã chốt, dùng làm chuẩn để soạn prompt cho Cursor. Tích hợp để tối ưu effort, ưu tiên Full reuse ở giai đoạn đầu.)

### I. Mục tiêu & Nguyên tắc triển khai

- **Mục tiêu chính:** Triển khai nhanh hệ thống Agent Data dựa trên framework Langroid, tận dụng tối đa mã nguồn sẵn có, hạn chế rủi ro (backdoor, CI fail).
- **Nguyên tắc:**
  - Ưu tiên các module đã được cộng đồng kiểm chứng và sử dụng ổn định (Langroid, SDK Google).
  - Phân lớp rõ ràng để dễ quản lý, kiểm thử, mở rộng: Core Agent Logic, Supporting Modules, Infrastructure & Stability.
  - Gắn với các ID chuẩn hóa trong Plan V12, đồng bộ với CP/CI/CD.
  - Ghi rõ các phần cần tự code và mức độ reuse ước lượng (theo %).

### II. Cấu trúc Danh sách Tái Sử Dụng (Reuse Table – FULL)

#### Core Agent Logic

| ID | Module | Source/Dependency | Status | Tự Code | Ghi chú Grok4 | Reuse (%) |
|:---|:-------|:------------------|:------:|:-------:|:--------------|:----------|
| A1 | agent_data.main | Langroid DocChatAgent | ✅ Full | Config only | Subclass dễ. Test OpenAI compat (CP0.9). Dùng example doc-chat-agent.py. | 95% |
| A2 | qdrant_config | Langroid QdrantDBConfig | ✅ Full | No | Native Qdrant support. Có sparse embedding. Không cần viết lại. | 100% |
| A3 | memory/session | Custom (Firestore) | ⚠️ Partial | Yes | Langroid không có native Firestore. Dựa trên mẫu LangChain/Google Docs. | 70% |
| A4 | task_api | Langroid Task, TaskTool | ✅ Full | Prompt only | Có orchestration sẵn. Đề xuất limit vòng lặp để tránh lỗi. | 95% |

#### Supporting Modules

| ID | Module | Source/Dependency | Status | Tự Code | Ghi chú Grok4 | Reuse (%) |
|:---|:-------|:------------------|:------:|:-------:|:--------------|:----------|
| B1 | tool/search_docs | Langroid ToolMessage | ✅ Full | Prompt only | Chỉ cần define ToolMessage cho Qdrant query. Có thể đặt ngưỡng score. | 85% |
| B2 | parser/file_ingest| google-cloud-storage | ⚠️ Partial | Yes | Phải tải file về từ GCS. Langroid không native support. | 60% |
| B3 | metadata/tagging | Firestore SDK + ToolMessage| ⚠️ Partial | Yes | Dùng ToolMessage wrap CRUD Firestore. Không có sẵn, cần tự viết. | 50% |
| B4 | storage/gs_blob | GCS SDK | ⚠️ Partial | Yes | Xử lý signed URL, upload/download GCS. Không có trong Langroid. | 40% |
| B5 | scheduler/cleanup_qdrant| Google Workflows | ✅ Full | Config only | Viết workflow cleanup/snapshot. Qdrant có docs hỗ trợ tốt. | 70% |
| B6 | api/gateway | FastAPI + Pydantic | ✅ Full | Prompt only | Langroid dễ wrap vào FastAPI. Nên thêm auth. Có ví dụ từ langroid-examples. | 80% |
| B7 | tool/crawl_web | Crawl4AI (Langroid 0.58.0) | ✅ Full | Config only | Optional. Hữu ích nếu ingest từ web. Native support từ bản mới. | 90% |

#### Infrastructure & Stability

| ID | Module | Source/Dependency | Status | Tự Code | Ghi chú Grok4 | Reuse (%) |
|:---|:-------|:------------------|:------:|:-------:|:--------------|:----------|
| C1 | checkpoint_runner.py | Langroid test + Pytest | ✅ Full | Prompt only | Runner test theo CP V7. Gợi ý test trước khi merge. | 70% |
| C2 | .github/workflows/ci.yml | GitHub Actions + pytest| ✅ Full | Config only | Langroid có CI cơ bản. Add checkpoint + scan (Trivy). | 80% |
| C3 | scripts/cost_checker.sh| gcloud billing | ✅ Full | Yes | Tự viết shell script, dùng SDK Google Cloud. Đơn giản. | 60% |
| C4 | scripts/clean_orphan_gcs.sh| gsutil | ✅ Full | Yes | Clean file orphan. Gắn với metadata Firestore để lọc. | 70% |
| C5 | scripts/verify_api_health.py| requests + FastAPI | ✅ Full | Prompt only | Ping /chat, check latency. Nên chạy định kỳ post-deploy. | 75% |
| C6 | scripts/preflight_check.py| os/env + Qdrant SDK | ✅ Full | Prompt only | Check env, Qdrant key, config trước khi deploy lên Cloud Run. | 80% |

### III. Tổng kết & Khuyến nghị

- **Tổng reuse trung bình toàn hệ thống:** ~75%, tương đương tiết kiệm 50-70% effort.
- **Ưu tiên triển khai:**
  - Giai đoạn đầu (S1): Chỉ build các module Full reuse và dễ config.
  - Giai đoạn tiếp theo (S2): Bổ sung các module partial cần tự code.
- **Kiểm thử sớm:** Mỗi module nên có test nhỏ (fixture) để tránh lỗi CI.
- **Prompt Cursor:** Dựa trên bảng trên, soạn theo ID (e.g. A1, B2...) để kiểm soát logic rõ ràng.

### IV. Phụ lục: Ghi chú bổ sung từ phản biện Grok4

- Langroid 0.58.0 là bản ổn định, MIT License, dễ mở rộng.
- Firestore memory cần custom wrapper (chưa có trong Langroid).
- Nếu cần ingest từ Web, nên dùng Crawl4AI (tích hợp native từ bản 0.58.0).
- Các script cần chú trọng bảo mật (signed URL, token, cost checker...).

---

© 2025 – Agent Data Langroid FW Version 12 (Final) – mọi phần trước đây giữ nguyên, các bổ sung được ghi rõ Δ.
