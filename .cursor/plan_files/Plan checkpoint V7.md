# Plan checkpoint V7

**Plan checkpoint V7 – updated 2025-07-20**

## PLAN CHECKPOINT – Technical Quality Gates

**Version 7.0 – Aligned with Agent Data Plan V 12 (REVD) | 19 / 07 / 2025**

## Δ THAY ĐỔI TRỌNG ĐIỂM so với V 6.0

- **Đồng bộ dependencies:** Cập nhật phiên bản pin của slowapi lên 0.1.9 và redis lên ~5.0.1 (≥5.0.1,<6.0.0) để giải quyết xung đột. Thay đổi này được áp dụng trực tiếp vào checkpoint CP0.9.
- **Tăng cường checkpoint CP0.1:** Quy tắc CI được làm chặt hơn. Lockfile (requirements.txt) bắt buộc phải được tạo bởi lệnh pip-compile --no-upgrade và CI sẽ kiểm tra bằng git diff để đảm bảo tệp không bị chỉnh sửa thủ công.
- **Chuẩn hóa đường dẫn:** Thống nhất và ghi rõ đường dẫn remote repository và thư mục làm việc cục bộ trong GHI CHÚ VẬN HÀNH để tránh các lỗi push/trigger nhầm lẫn.
- **Ghi chú vận hành:** Cập nhật các ghi chú để phản ánh những thay đổi trên, nhấn mạnh việc kiểm tra tương thích của dependencies và các quy tắc CI mới.

**Mục đích:** Liệt kê tất cả checkpoint (CP) kỹ thuật mà CI pipeline / Grok4 phải chạy; nêu Priority · Sprint đầu tiên · Điều kiện PASS · Lệnh kiểm.

- **Priority ký hiệu:** 🚀 = MVPCore | 🛡 = Hardening | ⚙ = FutureScale
- **Failfast:** CP 🚀 fail ⇒ block merge / deploy; CP 🛡 / ⚙ chỉ cảnh báo khi phase chưa bật.
- **Trạng thái:** Trạng thái CP được ghi vào Firestore checkpoints/{id} (status ✔ / ✖, priority, sprint, timestamp).

## 0 · TOOLCHAIN & BASELINE

| ID | Pri | Sprint | PASS condition | Command / Tool |
|:---|:---:|:-------|:---------------|:---------------|
| CP0.1 | 🚀 | S1 | Lockfile (requirements.txt) được tạo bởi pip-compile --no-upgrade và không có thay đổi nào sau đó (git diff --exit-code). | `pip-compile --no-upgrade requirements.in && git diff --exit-code requirements.txt` |
| CP0.2 | 🚀 | S1 | pre-commit run --all-files pass | `pre-commit run --all-files` |
| CP0.3 | 🚀 | S1 | pytest -m unit --cov ✖ = 0 failures | `pytest -m unit --cov=agent_data` |
| CP0.4 | 🚀 | S1 | Manifest drift = 0 | `python scripts/check_manifest.py` |
| CP0.5 | 🚀 | S1 | Secret scan 0 finding | `trufflehog filesystem . --fail` |
| CP0.6 | 🛡 | S3 | semantic-release --noop OK | `semantic-release --noop` |
| CP0.7 | 🛡 | S3 | sbom.spdx.json exists & size > 0 | `test -s sbom.spdx.json` |
| CP0.8 | 🚀 | S1 | Cloud Function manage_qdrant /status ⇒ RUNNING | `python scripts/check_qdrant_fn.py` |
| CP0.9 | 🚀 | S1 | Pin dependencies: langroid==0.58.0, slowapi==0.1.9, redis trong khoảng [5.0.1, 6.0.0). | `python -c "import langroid, slowapi, redis; from packaging.version import Version; assert langroid.__version__=='0.58.0'; assert slowapi.__version__=='0.1.9'; assert Version('5.0.1') <= Version(redis.__version__) < Version('6.0.0')"` |
| CP0.10 | 🚀 | S1 | Pricedcalc file exists (qdrant_cost.json) | `python scripts/qdrant_cost_calc.py --assert` |

## 1 · IaC & WORKFLOW

| ID | Pri | Sprint | PASS | Command |
|:---|:---:|:-------|:-----|:--------|
| CPG0.1 | 🚀 | S1 | terraform plan không destroy ngoài scope | `terraform plan -out=tfplan` |
| CPG0.2 | 🚀 | S1 | .github/workflows/* YAML lint pass | `actionlint` |
| CPG0.3 | 🛡 | S3 | OPA/Conftest 0 deny | `conftest test terraform/` |

## 2 · CORE CONNECTIVITY

| ID | Pri | Sprint | PASS | Command |
|:---|:---:|:-------|:-----|:--------|
| CPG1.1 | 🚀 | S1 | qdrant_client.collections.list() ok (SG cluster) | `python scripts/check_qdrant.py` |
| CPG1.2 | 🚀 | S1 | openai.models.list() ok | `python scripts/check_openai.py` |

## 3 · METADATA / VECTOR COHERENCE

| ID | Pri | Sprint | PASS | Command |
|:---|:---:|:-------|:-----|:--------|
| CPG2.1 | 🚀 | S2 | Firestore doc passes Pydantic schema | `pytest -m "metadata"` |
| CPG2.2 | 🛡 | S3 | orphan_vectors == 0 | `python scripts/check_orphan_vectors.py` |

## 4 · SERVERLESS CONFIG

| ID | Pri | Sprint | PASS | Command |
|:---|:---:|:-------|:-----|:--------|
| CPG3.1 | 🚀 | S2 | Cloud Run SA có đúng roles (secretAccessor, storage.objectViewer) | `gcloud projects get-iam-policy ...` |
| CPG3.2 | 🚀 | S2 | ENV trên Cloud Run ⊆ settings.py fields | `python scripts/check_run_env.py` |

## 5 · DEPLOY & RUNTIME

| ID | Pri | Sprint | PASS | Command |
|:---|:---:|:-------|:-----|:--------|
| CPG4.1 | 🚀 | S2 | Cloud Run có ≥ 2 revisions | `gcloud run revisions list` |
| CPG4.2a | 🛡 | S3 | Canary URL P95 latency < 1000 ms | `hey -z 30s -c 20 $(CANARY_URL)` |
| CPG4.2b | 🛡 | S3 | Billing MTD < 8 USD (project test) | `python scripts/check_budget.py` |

## 6 · ARTIFACT LIFECYCLE

| ID | Pri | Sprint | PASS | Command |
|:---|:---:|:-------|:-----|:--------|
| CPG5.1 | 🛡 | S5 | Cloud Fn mark_stale_artifacts run OK (< 120 s) | `gcloud functions logs read mark_stale_artifacts` |
| CPG5.2 | 🛡 | S5 | Slack báo cáo image label status=stale xuất hiện | Check Slack / test webhook |
| CPG5.3 | 🛡 | S3 | Qdrant cost projection file < $30 /mo | `python scripts/check_qdrant_cost.py` |

*(Artifact chỉ "đánh dấu" stale – KHÔNG autodelete; xóa thủ công sau 2 chữ ký review.)*

## 7 · CI ⇆ CHECKPOINT MAP

| Job | Trigger | Checkpoints chạy |
|:----|:--------|:-----------------|
| linttoolchain | mỗi PR | CP0.1→0.5 |
| unittests | PR | CP0.4 + CPG1.1 & 1.2 + CPG2.1 |
| buildpush | merge main | CP0.6 (nếu phase 🛡 bật) + Trivy scan |
| deploymvp | S2, main | CPG3.* + CPG4.1 |
| deploycanary | S3+, main | CPG4.2a & 4.2b, traffic shift |
| nightlye2e | 02:00 UTC | Tất cả CP 🚀 + CP 🛡 đã mở |

## 8 · SPRINT CALENDAR (2 tuần / Sprint)

| Sprint | CP mới kích hoạt |
|:-------|:-----------------|
| S1 | CP0.1→0.5, 0.8, 0.9, 0.10 · CPG0.1→0.2 · CPG1.1→1.2 |
| S2 | CP0.6 optin · CPG2.1 · CPG3.* · CPG4.1 |
| S3 | CP0.7 · CPG2.2 · CPG4.2ab · CPG5.3 |
| S4 | Metrics exporter, semanticrelease checks |
| S5 | CPG5.1→5.2 (artifact stale) |
| S6 | Hybrid Qdrant PoC, advanced SLO (< 800 ms) |

## 9 · FAILFAST & ALERTING RULES

| Alert | Threshold | Action |
|:------|:----------|:-------|
| Secret scan | ≥ 1 finding | CI fail – block merge |
| Coverage | < 70 % | CI fail |
| Manifest drift | ≠ 0 | CI fail |
| Canary latency | P95 > 1 s | Cancel traffic shift |
| Budget (test) | ≥ 8 USD | Block deploy, Slack notify |
| Qdrant cost proj | > $30/mo | Slack warn, review scale |

## 10 · BUFFER & FALLBACK POLICY

- Mỗi sprint dành 1 ngày buffer cho debug checkpoint.
- Nếu CP 🚀 / 🛡 fail > 20 % sau buffer → Fallback:
  - Simplify feature (e.g., switch Chroma for temporary RAG).
  - Extend sprint tối đa +3 ngày với lý do ghi trong Firestore sprint_overrides.
- AutoRefine: CI fail triggers Grok4 to generate fixprompt automatically.

## 11 · GHI CHÚ VẬN HÀNH

- **Đường dẫn chuẩn:** Remote repo là github.com/Huyen1974/agent-data-test (nhánh main). Thư mục làm việc cục bộ trên build agent là /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid.
- **Phase flag** PROJECT_PHASE = MVP / HARDENING / SCALE quyết định CI bật CP 🛡 / ⚙.
- **Rollback** luôn khả dụng qua Cloud Run → Revisions (manual or CLI).
- **manage_qdrant** supports start|stop|status; CP0.8 gọi /status.
- **mark_stale_artifacts** chỉ gắn label. Xóa image stale bằng:

```bash
gcloud artifacts docker images delete \
asia-southeast1-docker.pkg.dev/PROJECT/agent-data-test/IMAGE:TAG \
--delete-tags --quiet
```

- **Weekly Slack digest** tổng hợp các CP 🛡 / ⚙ trạng thái ✖ → đội chịu trách nhiệm xử lý trong 48 h.
- **Reuse scripts (C1-C6):** Ưu tiên Langroid examples và Google SDK để giảm code custom; kiểm tra compat trong CI (e.g., Langroid, SlowAPI, Redis pin tại CP0.9).

---

© 2025 – Checkpoint Plan V 7.0 (đồng bộ Agent Data Plan V 11)

**Bản V7 này đã được cập nhật để phản ánh các yêu cầu kỹ thuật mới nhất, đảm bảo quy trình CI/CD hoạt động ổn định và nhất quán hơn. Bạn có thể dùng nội dung này để cập nhật các tài liệu liên quan khác (Plan V12, *.cursor rules).**
