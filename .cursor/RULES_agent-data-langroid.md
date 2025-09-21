📂 Final: .cursor/RULES_agent-data-langroid.md (Cập nhật 30.07.2025)

# ⛔ CURSOR RULES – Agent Data Langroid (critical)

## 1. Project root (edit‑allowed ONLY)
/Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid
✅ Mọi thao tác phải nằm trong thư mục này.
⛔ Không được đọc/ghi/sửa ngoài path.
### GH Auth Bootstrap — Canonical Rule (không tự tạo)
#### Mục đích
Bảo đảm `gh` đã đăng nhập bằng PAT từ Google Secret Manager trước khi chạy bất kỳ lệnh GitHub nào (`gh run`, `gh pr`, `gh api`…).

#### Nguồn chuẩn (không tạo lại)
- **Script chính thức**: `scripts/bootstrap_gh.sh` (được duy trì bởi Maintainers).
- **Checksum khóa**: `.ci/bootstrap_gh.sha256` (để phát hiện mọi thay đổi trái phép).
- **GSM Project**: `github-chatgpt-ggcloud`
- **Secret (PAT)**: `gh_pat_sync_secrets` (phải có scopes: `repo`, `workflow`)
- **Service Account điều hành**: `chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com`

#### QUY TẮC BẮT BUỘC
- **Tuyệt đối KHÔNG** tạo mới hay sửa file `scripts/bootstrap_gh.sh`. Nếu file bị mất hoặc sai checksum, phải dừng ngay và yêu cầu Maintainers khôi phục.
- Mọi CLI chỉ được phép sử dụng bootstrap theo 2 chế độ: `verify` (đọc PAT và không ghi cấu hình) và `apply` (đăng nhập vào keychain cục bộ nếu cần).
- Nếu phát hiện logic bootstrap *inline* trong các script cũ (ví dụ `M5.1_cli01_verify.sh`), chúng được xem là **LEGACY**: được phép chạy để kiểm tra, nhưng không được dùng để tạo/sao chép/ghi đè nội dung bootstrap.

#### Cách dùng bắt buộc trong mọi CLI trước khi gọi `gh ...`
```bash
# B1: KIỂM TRA TÍNH TOÀN VẸN CỦA BOOTSTRAP
# Phải tồn tại cả script và file checksum của nó.
test -f scripts/bootstrap_gh.sh || { echo "❌ Missing scripts/bootstrap_gh.sh — Abort"; exit 1; }
test -f .ci/bootstrap_gh.sha256 || { echo "❌ Missing .ci/bootstrap_gh.sha256 — Abort"; exit 1; }

# So sánh checksum hiện tại với checksum đã khóa để chống sửa đổi.
sha_now="$(shasum -a 256 scripts/bootstrap_gh.sh | awk '{print $1}')" && \
sha_ref="$(cat .ci/bootstrap_gh.sha256 | tr -d '\r\n')" && \
[ "$sha_now" = "$sha_ref" ] || { echo "❌ Bootstrap checksum mismatch — Abort"; exit 1; }

# B2: THỰC THI XÁC THỰC
# Luôn thử 'verify' trước. Nếu chưa đăng nhập, mới chạy 'apply'.
PROJECT="github-chatgpt-ggcloud" SECRET_NAME="gh_pat_sync_secrets" scripts/bootstrap_gh.sh verify || true
gh auth status -h github.com >/dev/null 2>&1 || \
  PROJECT="github-chatgpt-ggcloud" SECRET_NAME="gh_pat_sync_secrets" scripts/bootstrap_gh.sh apply

# B3: KIỂM TRA KẾT QUẢ SAU CÙNG
# Phải đăng nhập thành công và có đủ scopes 'repo', 'workflow'.
gh auth status -h github.com >/dev/null 2>&1 || { echo "❌ gh not authenticated after bootstrap"; exit 1; }
scopes="$(gh api -i /user | awk -F': ' 'tolower($1)~/^x-oauth-scopes/ {print $2}')" && \
  echo "$scopes" | tr ',' '\n' | tr -d ' ' | grep -qi '^repo$'     || { echo "❌ Missing scope: repo"; exit 1; } && \
  echo "$scopes" | tr ',' '\n' | tr -d ' ' | grep -qi '^workflow$' || { echo "❌ Missing scope: workflow"; exit 1; }

echo "✅ GH Bootstrap successful."

---

## 2. GitHub repositories
Bạn đang làm việc với đúng 2 repo:
- `agent-data-test`
- `agent-data-production`

⛔ Không được thao tác với bất kỳ repo nào khác.

---

## 3. Artifact Registry
Mỗi repo sẽ có Artifact Registry riêng tương ứng:
- `agent-data-test`
- `agent-data-production`

☑️ Lưu Docker, Cloud Functions, Cloud Run... Không tách nhỏ.

---

## 4. CI/CD – Kỷ luật tuyệt đối
✅ Mỗi thay đổi phải đảm bảo CI xanh toàn phần: Cloud Function, Cloud Run, Workflow YAML.

⛔ Không được merge khi CI còn đỏ dù chỉ 1 bước.
⛔ Không dùng `continue-on-error: true` trong mọi bước test hoặc validate.

---

## 5. Terraform buckets (do Terraform quản lý)

| Bucket Name                                           | Repo        |
|------------------------------------------------------|-------------|
| huyen1974-agent-data-artifacts-test                  | test        |
| huyen1974-agent-data-artifacts-production            | production  |
| huyen1974-agent-data-knowledge-test                  | test        |
| huyen1974-agent-data-knowledge-production            | production  |
| huyen1974-agent-data-logs-test                       | test        |
| huyen1974-agent-data-logs-production                 | production  |
| huyen1974-agent-data-qdrant-snapshots-test           | test        |
| huyen1974-agent-data-qdrant-snapshots-production     | production  |
| huyen1974-agent-data-source-test                     | test        |
| huyen1974-agent-data-source-production               | production  |
| huyen1974-agent-data-tfstate-test                    | test        |
| huyen1974-agent-data-tfstate-production              | production  |

➡️ Terraform phải giữ quyền trên các bucket này theo đúng repo tương ứng.

---

## 6. 🔐 SECRETS & IAM (baseline chuẩn nhất)

| Purpose                  | GitHub secret              | Example / Note                             |
|--------------------------|----------------------------|---------------------------------------------|
| GCP project ID           | `GCP_PROJECT_ID`           | `github-chatgpt-ggcloud`                    |
| Deployer SA              | `GCP_SERVICE_ACCOUNT`      | `chatgpt-deployer@...`                      |
| WIF provider             | `GCP_WIF_PROVIDER`         | `projects/.../providers/...`                |
| WIF pool ID              | `GCP_WIF_POOL`             | e.g. `gha-pool`                             |
| SA fallback key (base64) | `GCP_SA_KEY_JSON`          | Dùng nếu WIF lỗi                            |
| OpenAI Key               | `OPENAI_API_KEY`           | runtime                                     |
| Lark app secret          | `LARK_APP_SECRET`          | runtime                                     |
| Qdrant mgmt key          | `QDRANT_CLOUD_MGMT_KEY`    | cho tạo/xoá cluster                         |
| Qdrant cluster 1 ID      | `QDRANT_CLUSTER1_ID`       | e.g. `N1D8R2vC0_5`                           |
| Qdrant cluster 1 key     | `QDRANT_CLUSTER1_KEY`      | auth key cụ thể cho cluster trên            |

> Quy ước thêm: `QDRANT_CLUSTER{N}_KEY` / `QDRANT_CLUSTER{N}_ID`

🌐 GCP secrets lưu tại `github-chatgpt-ggcloud` → Secret Manager
🔐 GitHub Secrets lưu tại `agent-data-test` / `agent-data-production`

---

## 7. IAM roles (đã phân quyền)

✅ Bắt buộc giữ:
- `roles/viewer`, `roles/cloudasset.viewer`, `roles/artifactregistry.writer`
- `roles/cloudfunctions.developer`, `roles/iam.serviceAccountUser`
- `roles/run.admin`, `roles/logging.logWriter`, `roles/secretmanager.secretAccessor`
- `roles/serviceusage.serviceUsageAdmin`, `roles/storage.admin`

⛔ Cấm gán thêm:
- `roles/secretmanager.admin`, `roles/iam.serviceAccountAdmin`
- `roles/cloudscheduler.admin`, `roles/cloudsql.*`, `roles/pubsub.publisher`
- `roles/cloudbuild.builds.editor`, `roles/run.invoker`, `roles/workflows.admin`

---

## 8. Kiểm soát CI & test count
### CI Verification Rules
- Mọi commit phải pass CI với `conclusion == success`
- Dùng các lệnh kiểm tra:
```bash
gh run view --log
gh run list -L1
gh run watch --exit-status --interval 15 --timeout 900
```
- Terraform: TF_EXIT phải là 0 hoặc 2
- ⛔ Cấm tuyệt đối dùng continue-on-error trong bất kỳ job test/lint/validate

### Test Count Rules (Manifest Drift & Baseline)
Nguyên tắc: Mọi thay đổi về số lượng file trong thư mục tests/ phải được kiểm soát chặt chẽ thông qua cơ chế "Manifest Drift" (CP0.4).
- ✅ Cơ chế kiểm soát: CI sẽ chạy lệnh: `python scripts/check_manifest.py`
  Lệnh này sẽ so sánh số lượng file trong thư mục tests/ với số lượng đã chốt trong file test_manifest_baseline.txt
- ❌ CI sẽ thất bại nếu số lượng file không khớp (Manifest drift ≠ 0)

### Quy trình cập nhật baseline hợp lệ:
1. Viết file test mới ➜ commit trước đó phải CI xanh
2. Chạy lệnh: `python scripts/collect_manifest.py > test_manifest_baseline.txt`
3. Commit cùng lúc:
   - Các file test mới
   - File test_manifest_baseline.txt cập nhật
4. Mô tả commit phải ghi rõ lý do thay đổi số lượng test
5. CI sau commit phải xanh

⛔ Cursor không được chỉnh sửa test mà không cập nhật manifest. Không được tự thêm test nếu chưa pass đủ CI + update manifest.
📌 Đây là cơ chế bắt buộc để giữ số lượng test ổn định, tránh báo cáo ảo hoặc CI rác.

### Cursor Client Integration (Reports)
- Script chính để ghi báo cáo: `scripts/client/save_report.sh`.
- Biến môi trường bắt buộc: `AGENT_DATA_API_KEY` (lấy từ Secret an toàn).
- Tuỳ chọn:
  - `AGENT_DATA_BASE_URL` (mặc định `http://localhost:8000`).
  - `AGENT_DATA_PARENT_ID` (mặc định `root`).
  - `AGENT_DATA_REPORT_TAGS` (danh sách tag, mặc định `report`).
  - `REPORT_DOCUMENT_ID` nếu cần ép document_id.
- Cú pháp khuyến nghị:
  ```bash
  AGENT_DATA_API_KEY=$KEY \
  AGENT_DATA_BASE_URL=https://agent-data-test.example.com \
  ./scripts/client/save_report.sh "Weekly Report" ./reports/week42.md
  ```
- Script sẽ tạo payload `create_document` theo MCP v2 và trả về phản hồi API (HTTP 2xx là thành công).

### Cursor Custom Commands (CLI helpers)
- `@save_report <file_path> [--title <title>] [--parent <id>] [--visible]`
  - Wrapper: `.cursor/commands/save_report.sh`
  - Hành động: Nội suy tham số, sau đó gọi `tools/save_report.sh`.
  - Ghi chú: cần `AGENT_DATA_API_KEY` (hoặc gcloud đã cấu hình) và tôn trọng `AGENT_DATA_BASE_URL`.
- `@move_document <doc_id> --to <new_parent_id> [--base-url <url>] [--dry-run]`
  - Wrapper: `.cursor/commands/move_document.sh`
  - Hành động: Gọi API `POST /documents/{doc_id}/move` (cập nhật `parent_id`).
  - Ghi chú: sử dụng `tools/move_document.sh`; nếu `--dry-run` sẽ chỉ in câu lệnh `curl`.

> Khi chạy `@` commands trong Cursor shell, có thể gọi trực tiếp các wrapper `.cursor/commands/*.sh` hoặc tạo alias tương ứng trong session.

---

## 9. Báo cáo & tự sửa lỗi (strict)
Cursor không được báo "PASS" nếu chưa verify bằng log CI.

Nếu CI đỏ, phải:
1. Kiểm tra log `gh run view`
2. Tự sửa lỗi và push lại cùng branch
3. Lặp lại tối đa 3 lần, nếu vẫn fail mới được báo lỗi

---

## 10. E2E Tests (CPG1.1, CPG1.2) - Kiểm soát chặt chẽ

### Quy tắc E2E Tests
- E2E tests (CPG1.1 Qdrant connectivity, CPG1.2 OpenAI connectivity) chỉ được chạy khi:
  - Pull request có label `e2e` được gán thủ công
  - Workflow dispatch được kích hoạt thủ công với input `e2e: true`
- ⛔ **TUYỆT ĐỐI KHÔNG** chạy E2E tests trong normal PR hoặc push để giữ CI nhanh

### Cấu hình E2E Tests
- **Workflow**: `.github/workflows/agent-e2e.yml`
- **Dependencies**: `langroid==0.58.0`, `pytest`
- **Environment**: `OPENAI_API_KEY`, `QDRANT_CLUSTER1_KEY`, `QDRANT_CLUSTER1_ID`
- **Collection**: `test_documents` (cleaned before each run)
- **Embedding**: `text-embedding-3-small` (OpenAI)
- **Region**: `asia-southeast1`

### Validation Requirements
- **CPG1.1**: Response metadata phải cite `test_documents` collection (Qdrant connectivity)
- **CPG1.2**: Real responses generated với `mock_data: false` (OpenAI connectivity)
- **Collection Info**: Đúng embedding model và distance metric
- **Regional Config**: Đúng asia-southeast1 region

### Command Sequence
```bash
python scripts/gen_fixtures.py --no-mock
pytest tests/test_fixture_pipeline.py -m fixture --disable-warnings
```

---

## 11. Bảo vệ RULES – Không được xóa
- Khi cập nhật RULES, Cursor tuyệt đối không được xoá bất kỳ nội dung nào nếu Prompt không cho phép rõ ràng.
- Chỉ được thêm phần mới nếu Prompt không nói về xoá.
- Tất cả cập nhật rules phải commit cùng commit logic.
- Khi remove workflow, dùng `git rm`, không dùng `rm -f`

✅ Đây là quy tắc chuẩn cứng Agent Data Langroid – Cursor phải luôn tuân thủ tuyệt đối.

🕘 Cập nhật: 2025-07-30
