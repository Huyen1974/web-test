---
status: FROZEN
approved_by: Antigravity
role: GCP Infrastructure Architect
date: 2026-01-10
version: FINAL-LOCKED-v1.0
---

# BUCKETS MASTER BLUEPRINT & CONNECTION STATUS
**Phạm vi áp dụng:** Repo `web-test` & `agent-data-test`.
**Trạng thái:** ACTIVE (Deep Forensic Verified).

## 1. NGUYÊN TẮC KỸ THUẬT & SỬ DỤNG (GLOBAL RULES)
*Áp dụng cho TOÀN BỘ bucket. Blueprint này là WHITELIST duy nhất.*

1.  **Naming Convention (HP-13):**
    * Công thức: `huyen1974-{app_id}-{content_type}-{environment}`
    * Environment: `test`, `production`, hoặc `shared`.
    * *Phạm vi Terraform:*
        * **User-created Legacy:** Bắt buộc IMPORT & LOCK (`ignore_changes`) trong Terraform.
        * **Google-managed (Nhóm 0):** TUYỆT ĐỐI KHÔNG đưa vào Terraform.

2.  **Terraform State Strategy (CRITICAL):**
    * **Partial Backend Config:** TUYỆT ĐỐI KHÔNG hardcode tên bucket state trong file `backend.tf`.
    * Phải inject bucket name khi init: `terraform init -backend-config="bucket=${TF_STATE_BUCKET}"`.
    * Sử dụng thư mục tách biệt: `terraform/env/test` và `terraform/env/production` (hoặc Workspace) để tránh lẫn state.

3.  **Security & Access (HP-02):**
    * **Single Identity:** Bucket User-Managed chỉ cấp quyền cho `chatgpt-deployer` (DevOps SA).
    * **Role Mapping Chuẩn (Terraform):**
        * *Standard Buckets:* `roles/storage.objectAdmin` (Full quyền trên Object).
        * *State Buckets:* `roles/storage.objectAdmin`.
        * *Uploads Buckets:* DevOps SA (`objectAdmin`) + `allUsers` (`objectViewer`).
    * **Break-glass Owner:** Chỉ **Project Owner** có quyền bypass.
    * **Log Sink Exception:** Service Account của Cloud Logging được quyền `objectCreator`.
    * **Public Access:**
        * *Private Buckets (Default):* `UBLA=true; PAP=enforced`.
        * *Uploads Buckets:* `UBLA=true; PAP=inherited`. Fallback: Signed URL.

4.  **Retention & Versioning Policy (Cost Control):**
    * **Backups:** Retention = 90 ngày; Versioning = Enabled.
    * **Logs:** Retention = 30-90 ngày; Versioning = Disabled.
    * **Snapshots:** Retention = 30 ngày; Versioning = Disabled.
    * **Noncurrent Versions (Cost Cut):** Với bucket bật Versioning, tự động xóa phiên bản cũ nếu có >3 phiên bản mới hơn (`num_newer_versions = 3`).
    * **Safety:** `prevent_destroy = true` cho tất cả Data/Backup buckets.

5.  **Quy hoạch Môi trường (Environment Protocol):**
    * **Test/Dev:** Chấp nhận xóa/tạo lại nếu không phải data critical.
    * **Production:** "Zero-Touch" sau khi deploy. Mọi thay đổi phải qua Terraform Plan/Apply.

6.  **Định nghĩa Hành động "LOCK" (Anti-Drift):**
    * Khi thực hiện **IMPORT & LOCK**, Terraform bắt buộc cấu hình:
    * `lifecycle { prevent_destroy = true; ignore_changes = [labels, lifecycle_rule, versioning, website, cors, uniform_bucket_level_access, public_access_prevention] }`
    * *Lưu ý:* IAM bindings của bucket LOCK không quản lý bằng Terraform (trừ trường hợp uploads public).
    * *Mục tiêu:* Terraform nhận biết sự tồn tại của bucket nhưng **KHÔNG BAO GIỜ** sửa đổi cấu hình của nó.

## 2. KHUNG QUY HOẠCH CHI TIẾT (5 NHÓM)

*Hướng dẫn Forensic & Design:*
- **Cột "Cấu hình (Lifecycle/Ver)":** Ghi rõ policy (VD: "Delete after 30 days", "Versioning: Enabled").
- **Cột "Quyền truy cập (IAM Principle)":** Ghi rõ Service Account nào cần quyền gì (VD: "DevOps SA: ObjectAdmin").
- **Cột "Terraform Path":** Đường dẫn tới file .tf quản lý bucket này (VD: `web-test/terraform/storage.tf`).
- **Cột "Tình trạng kết nối":** Kết quả kiểm tra thực tế (VD: "Đang trỏ sai", "Mồ côi", "OK").

> **LƯU Ý QUAN TRỌNG:** Trong các bảng dưới đây, `backend.tf (Template)` chỉ là file mẫu. Thao tác `init`/`apply` thực tế **PHẢI** được chạy trong thư mục `terraform/env/{env}` tương ứng.

### NHÓM 0: GOOGLE MANAGED & LEGACY ARTIFACTS (DO NOT TOUCH)
*Phạm vi:* Các bucket do Google tự tạo (Cloud Build, Cloud Functions, Container Registry). Terraform KHÔNG quản lý nhóm này.

| ID | Tên Bucket Chuẩn | Mục đích | Owner | Trạng thái | Hành động |
|:---|:---|:---|:---|:---|:---|
| Sys-1 | `github-chatgpt-ggcloud_cloudbuild` | Cloud Build Logs | Google | Exist | **KEEP & MONITOR** |
| Sys-2 | `us.artifacts.github-chatgpt-ggcloud.appspot.com` | Legacy Registry | Google | **UNVERIFIED** | **VERIFY (CLI) -> FREEZE or REMOVE** |
| Sys-3 | `asia.artifacts.github-chatgpt-ggcloud.appspot.com` | Registry | Google | **UNVERIFIED** | **VERIFY (CLI) -> AUDIT or REMOVE** |
| Sys-4 | `gcf-v2-sources-812872501910-asia-southeast1` | Cloud Functions | Google | Exist | **KEEP & MONITOR** |
| Sys-5 | `gcf-v2-uploads-812872501910-asia-southeast1` | Cloud Functions | Google | **UNVERIFIED** | **VERIFY (CLI) -> MONITOR or REMOVE** |
| Sys-7 | `run-sources-github-chatgpt-ggcloud-asia-southeast1` | Cloud Run Build | Google | Exist | **KEEP & MONITOR** |

### NHÓM 1: BUCKET DÙNG CHUNG (SYSTEM-WIDE)

| ID | Tên Bucket Chuẩn | Mục đích | Cấu hình | Quyền truy cập | Terraform Path | Trạng thái | Hành động | Tình trạng kết nối |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| S1 | `huyen1974-system-backups-shared` | **System Backups** (MySQL, Postgres, Chatwoot, Logs) | Lifecycle: 90d; Ver: Enabled | DevOps SA | `web-test/terraform/storage.tf` | **MISSING** | **CREATE** | Use folders: `/mysql`, `/pgsql`, `/chatwoot`. |
| S2 | `huyen1974-system-temp-shared` | Scratchpad/Temp Processing | Lifecycle: 3d | DevOps SA | `web-test/terraform/storage.tf` | **MISSING** | **CREATE** | Planned. |
| S3-Orphan | `huyen1974-artifact-storage` | **Unknown/Legacy Artifacts** | Standard | DevOps SA | `web-test/terraform/storage.tf` | **EXIST** | **IMPORT & LOCK** | Orphan. Keep safe. |
| S4-Orphan | `huyen1974-log-storage` | **System Logs (Legacy)** | Standard | DevOps SA | `web-test/terraform/storage.tf` | **EXIST** | **IMPORT & LOCK** | Orphan. Keep safe. |
| S5-Orphan | `huyen1974-chatgpt-functions` | **Legacy Functions Code** | Standard | DevOps SA | `web-test/terraform/storage.tf` | **EXIST** | **IMPORT & LOCK** | Legacy User-created. |

### NHÓM 2: REPO `AGENT-DATA-TEST` (NHÁNH TEST)

| ID | Tên Bucket Chuẩn | Mục đích | Cấu hình | Quyền truy cập | Terraform Path | Trạng thái | Hành động | Tình trạng kết nối |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| A1-T | `huyen1974-agent-data-tfstate-test` | TF State (Test) | Ver: Enabled | DevOps SA | `agent-data-test/terraform/backend.tf` (Template) | **EXIST** | **IMPORT** | Standard State. |
| A2-T | `huyen1974-agent-data-knowledge-test` | RAG Source | Private | DevOps SA | `agent-data-test/terraform/storage.tf` | **EXIST** | **IMPORT** | **Qdrant Connected**. |
| A3-T | `huyen1974-agent-data-artifacts-test` | Artifacts | Private | DevOps SA | `agent-data-test/terraform/storage.tf` | **EXIST** | **IMPORT** | Existing. |
| A4-T | `huyen1974-agent-data-logs-test` | Logs | **Lifecycle: 30d; Ver: Disabled** | DevOps SA | `agent-data-test/terraform/storage.tf` | **EXIST** | **IMPORT** | Existing. |
| A5-T | `huyen1974-agent-data-qdrant-snapshots-test` | Snapshots | **Lifecycle: 30d; Ver: Disabled** | DevOps SA | `agent-data-test/terraform/storage.tf` | **EXIST** | **IMPORT** | **Critical**. NO DELETE. |
| A6-T | `huyen1974-agent-data-backup-test` | Backups | **Lifecycle: 90d; Ver: Enabled** | DevOps SA | `agent-data-test/terraform/storage.tf` | **EXIST** | **IMPORT** | **Critical**. NO DELETE. |
| A-L1 | `huyen1974-agent-data-source-test` | Legacy Source | Private | DevOps SA | `agent-data-test/terraform/storage.tf` | **EXIST** | **IMPORT & LOCK** | Legacy. |
| A-L2 | `huyen1974-faiss-index-storage` | **Legacy FAISS (TEST ONLY)** | Private | DevOps SA | `agent-data-test/terraform/storage.tf` | **EXIST** | **IMPORT & LOCK** | Legacy. Prod MUST NOT use. |
| Legacy | `huyen1974-agent-data-terraform-state` | Legacy State | N/A | DevOps SA | N/A | **EXIST** | **DEPRECATED & FREEZE - DO NOT USE** | Migrate to A1-T. |
| **A7-T** | `huyen1974-agent-data-uploads-test` | **User Uploads** (Images/PDF) | **Standard; No Lifecycle** (Permanent) | DevOps SA + App | `agent-data-test/terraform/gcs_buckets.tf` | **NEW** | **CREATE (PR #217)** | Added during stabilization. |

### NHÓM 3: REPO `AGENT-DATA-TEST` (NHÁNH PRODUCTION)

| ID | Tên Bucket Chuẩn | Mục đích | Cấu hình | Quyền truy cập | Terraform Path | Trạng thái | Hành động | Tình trạng kết nối |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| A1-P | `huyen1974-agent-data-tfstate-production` | TF State (Prod) | Ver: Enabled | DevOps SA | `agent-data-test/terraform/backend.tf` (Template) | **EXIST** | **IMPORT** | Standard State. |
| A2-P | `huyen1974-agent-data-knowledge-production` | RAG Source | Private | DevOps SA | `agent-data-test/terraform/storage.tf` | **EXIST** | **IMPORT** | **Qdrant Connected**. |
| A3-P | `huyen1974-agent-data-artifacts-production` | Artifacts | Private | DevOps SA | `agent-data-test/terraform/storage.tf` | **EXIST** | **IMPORT** | Existing. |
| A4-P | `huyen1974-agent-data-logs-production` | Logs | **Lifecycle: 30d; Ver: Disabled** | DevOps SA | `agent-data-test/terraform/storage.tf` | **EXIST** | **IMPORT** | Existing. |
| A5-P | `huyen1974-agent-data-qdrant-snapshots-production`| Snapshots | **Lifecycle: 30d; Ver: Disabled** | DevOps SA | `agent-data-test/terraform/storage.tf` | **EXIST** | **IMPORT** | **Critical**. NO DELETE. |
| A6-P | `huyen1974-agent-data-backup-production` | Backups | **Lifecycle: 90d; Ver: Enabled** | DevOps SA | `agent-data-test/terraform/storage.tf` | **MISSING** | **CREATE** | **Critical**. NO DELETE. |
| A-LP | `huyen1974-agent-data-source-production` | Legacy Source | Private | DevOps SA | `agent-data-test/terraform/storage.tf` | **EXIST** | **IMPORT & LOCK** | Legacy. |
| **A7-P** | `huyen1974-agent-data-uploads-production` | **User Uploads** (Images/PDF) | **Standard; No Lifecycle** (Permanent) | DevOps SA + App | `agent-data-test/terraform/gcs_buckets.tf` | **MISSING** | **CREATE (RESERVED)** | Reserved for E2. |

### NHÓM 4: REPO `WEB-TEST` (NHÁNH TEST)

| ID | Tên Bucket Chuẩn | Mục đích | Cấu hình | Quyền truy cập | Terraform Path | Trạng thái | Hành động | Tình trạng kết nối |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| W1-T | `huyen1974-web-test-tfstate` | TF State (Test) | Ver: Enabled | DevOps SA | `web-test/terraform/backend.tf` (Template) | **EXIST** | **IMPORT** | Matches `TF_STATE_BUCKET` env. |
| W2-T | `huyen1974-web-uploads-test` | Directus Assets | **Standard; No Lifecycle** (Permanent) | DevOps SA + Public | `web-test/terraform/storage.tf` | **MISSING** | **CREATE & MIGRATE** | Migrate from Legacy-1. |
| W3-T | `huyen1974-kestra-storage-test` | Kestra Storage | **Standard; Lifecycle: 90d** | DevOps SA | `web-test/terraform/storage.tf` | **MISSING** | **CREATE** | Workflow logs/data. |
| W4-T | `huyen1974-chatwoot-storage-test` | Chatwoot Uploads | **Standard; No Lifecycle** (Permanent) | DevOps SA + Public | `web-test/terraform/storage.tf` | **MISSING** | **CREATE** | Planned. |
| W5-T | `huyen1974-affiliate-data-test` | Affiliate Data | **Standard; No Lifecycle** (Permanent) | DevOps SA | `web-test/terraform/storage.tf` | **MISSING** | **CREATE** | Planned. |
| Legacy-1 | `directus-assets-test-20251223` | Legacy Assets | N/A | DevOps SA | N/A | **EXIST (ACTIVE)** | **KEEP -> MIGRATE -> FREEZE -> DELETE** | **Strict:** Verify Object Count. Switch Config. Keep Read-only 7 days before delete. |

### NHÓM 5: REPO `WEB-TEST` (NHÁNH PRODUCTION)

| ID | Tên Bucket Chuẩn | Mục đích | Cấu hình | Quyền truy cập | Terraform Path | Trạng thái | Hành động | Tình trạng kết nối |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| W1-P | `huyen1974-web-production-tfstate` | TF State (Prod) | Ver: Enabled | DevOps SA | `web-test/terraform/backend.tf` (Template) | **MISSING** | **CREATE (RESERVED)** | Ready for E2. |
| W2-P | `huyen1974-web-uploads-production` | Directus Assets | **Standard; No Lifecycle** (Permanent) | DevOps SA + Public | `web-test/terraform/storage.tf` | **MISSING** | **CREATE (RESERVED)** | Ready for E2. |
| W3-P | `huyen1974-kestra-storage-production` | Kestra Prod | **Standard; Lifecycle: 90d** | DevOps SA | `web-test/terraform/storage.tf` | **MISSING** | **CREATE (RESERVED)** | Ready for E2. |
| W4-P | `huyen1974-chatwoot-storage-production` | Chatwoot Prod | **Standard; No Lifecycle** (Permanent) | DevOps SA + Public | `web-test/terraform/storage.tf` | **MISSING** | **CREATE (RESERVED)** | Ready for E2. |
| W5-P | `huyen1974-affiliate-data-production` | Affiliate Data | **Standard; No Lifecycle** (Permanent) | DevOps SA | `web-test/terraform/storage.tf` | **MISSING** | **CREATE (RESERVED)** | Ready for E2. |

## PHỤ LỤC X (TẠM THỜI): QUY TRÌNH DI DỜI & CÔ LẬP NHÓM 0 (US/LEGACY)
*Mục tiêu: Chuyển hạ tầng về Asia để tối ưu chi phí, nhưng giữ lại dữ liệu cũ để an toàn. Phụ lục này sẽ được xóa sau khi hoàn tất.*

1.  **Bước 1 (Terraform):** Tạo `Artifact Registry` mới tại `asia-southeast1`. **TUYỆT ĐỐI KHÔNG** dùng lệnh `destroy` lên các bucket cũ (`sys-2`, `sys-3`).
2.  **Bước 2 (CI/CD):** Cập nhật Github Actions (`deploy.yml`) để Push image vào kho mới (Asia).
3.  **Bước 3 (Switch):** Cập nhật Cloud Run để Pull image từ kho mới. Verify thành công.
4.  **Bước 4 (Freeze):** Vào Console/CLI, set IAM của bucket cũ (`us.artifacts...`) thành **Read-Only** (thu hồi quyền Write).
5.  **Cấm kỵ:** Không được xóa bucket cũ cho đến khi có lệnh tiêu hủy văn bản (ít nhất 30 ngày sau).
