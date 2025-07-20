# KH quay lại con đường_V2

**KH quay lại con đường_V2 – updated 2025-07-20**

## KẾ HOẠCH "QUAY LẠI ĐÚNG ĐƯỜNG"

**(chỉ xử lý phần đã lệch, dừng ở cuối Giai đoạn 0)**
**Version 2.0 – Aligned with Agent Data Plan V12 & Checkpoint Plan V7 | 19 / 07 / 2025**

## Δ THAY ĐỔI TRỌNG ĐIỂM so với V1

- **Đồng bộ dependencies:** Cập nhật phiên bản pin của slowapi lên 0.1.9 và redis lên >=5.0.1,<6.0.0 để giải quyết xung đột và khớp V12 (ID 0.2/0.7) & V7 (CP0.9).
- **Tăng cường quy tắc lockfile & CI:** Lockfile phải do pip-compile --no-upgrade sinh, thêm git diff --exit-code để kiểm tra không chỉnh tay, khớp V12 (Δ) & V7 (CP0.1).
- **Tham chiếu kế hoạch:** Thay toàn bộ "Plan V11" bằng "Plan V12" và "CP V5/V6" bằng "CP V7" để nhất quán.
- **Chuẩn hóa đường dẫn & repo:** Ghi rõ remote github.com/Huyen1974/agent-data-test (nhánh main) và local /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid, khớp V12 (Δ) & V7 (Section 11).
- **Checkpoint chi tiết:** Cập nhật CP0.4 thành "Manifest drift =0" (strict), thêm nhấn mạnh compat kiểm tra ở CP0.9; giữ nguyên các CP khác nhưng align với V7.
- **Thêm note production:** Sau ổn định test, tạo repo agent-data-production với hậu tố production, khớp V12 (Section 3).
- **Reuse & compat:** Nhấn mạnh kiểm tra compat trong CI (e.g., Langroid, Slowapi, Redis) theo V12 (Section 12) & V7 (Section 11).

**Phạm vi:** ID 0.1 → 0.5 (+ 0.9) theo Plan V12 — khắc phục sai lệch rồi trở lại kế hoạch gốc tại ID 0.6.

**Nguyên tắc đặt Prompt:** dùng mã gốc + a,b,c… (vd. 0.1a, 0.1b). Loại bỏ tác vụ "Cursor rules" (đã xong).

## DANH SÁCH TÁC VỤ

| # | ID | Pri | Tác vụ | Ghi chú |
|---|:---|:---:|:-------|:---------|
| 1 | 0.1a | 🚀 | Repo agent-data-test sạch & CI khởi tạo | • Xóa toàn bộ mã/tests ADK (agent_data_manager, shim).<br>• Giữ skeleton agent_data/ (init.py, cli.py, server.py).<br>• Push repo mới + MIT LICENSE. Remote: github.com/Huyen1974/agent-data-test (nhánh main), Local: /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid. |
| 2 | 0.1b | 🚀 | CI tối giản xanh | • Reuse workflow C2 (checkout, setup-python 3.11, pip-compile --no-upgrade && git diff --exit-code requirements.txt).<br>• Job failfast.<br>• Badge ✅ đầu tiên. | **CP0.1** (pip-compile --no-upgrade) |
| 3 | 0.2a | 🚀 | Pin dependency đúng kế hoạch | • pyproject.toml: langroid==0.58.0, slowapi==0.1.9, redis>=5.0.1,<6.0.0.<br>• python -m piptools compile … & install lock. Kiểm tra compat redis/slowapi. | **CP0.1, CP0.9** |
| 4 | 0.2b | 🚀 | Lint 0 lỗi | • pre-commit autoupdate, pre-commit clean.<br>• Loop fix Black/Ruff tới PASS. | **CP0.2** |
| 5 | 0.3.1a | 🚀 | Unittest nền, cov ≥80 % | • Viết tests/test_foundation.py (import, CLI, /health).<br>• Run pytest -m unit --cov ≥80 %. | **CP0.3** |
| 6 | 0.3.1b | 🚀 | Freeze testcount | • Sinh tests/.snapshot.<br>• CI step diff -u .snapshot → fail nếu lệch (Manifest drift =0). | **CP0.4** |
| 7 | 0.5a | 🚀 | Secret scan sạch | • .trufflehogignore + xoá log giả.<br>• trufflehog --fail = 0 finding. | **CP0.5** |
| 8 | 0.3.2a | 🚀 | CI skeleton hoàn chỉnh | • Jobs: lint → test → secret (needs).<br>• Coverage badge. | **CP0.1-0.5** |
| 9 | 0.3.2b | 🚀 | Gate checkpoint | • Thêm script checkpoint_runner (reuse C1) chặn merge khi CP 🚀 đỏ. | |
| 10 | 0.4a | 🚀 | Terraform minimal (dọn bucket trùng) | • Di chuyển block bucket → gcs_buckets.tf (var env).<br>• terraform plan -detailed-exitcode (no apply). | **CPG0.1** |
| 11 | 0.5b | 🚀 | Hook manifest drift local | • Thêm hook vào .pre-commit-config.yaml. | |
| 12 | 0.5c | 🚀 | Báo cáo Foundation Green | • Đưa link CI xanh chứng minh CP0.1-0.5 & 0.9 ✔.<br>• Checklist gửi User. Sau ổn định test, nhân bản sang agent-data-production với hậu tố production. | **Sprint S1 deliverable** |

**Sau 0.5c, ta trở lại Plan V12 tại ID 0.6 (Golden fixtures) — tiếp tục roadmap gốc.**

## ĐIỀU KIỆN THÀNH CÔNG

- CI test branch xanh 100 % với tất cả CP0.* ✔.
- Langroid 0.58.0 được pin & kiểm tra mỗi run, bao gồm compat Slowapi/Redis theo CP0.9.
- .snapshot kiểm soát số test; thay đổi cần review (Manifest drift =0).
- Không còn mã ADK legacy trong repo.

**Nếu OK, Grok sẽ soạn Prompt 0.1a; o3 giám sát log CI và tự động dừng nếu bất kỳ CP 🚀 đỏ.**

## TIẾN ĐỘ THỰC HIỆN

- ✅ **Bước 1 (0.1a reset clean ADK/push new) OK** - fix nhầm dự án/debt, bám ID 0.1 nhân bản repo MIT template.
- ✅ **Bước 2 (0.1b CI minimum green disable test only lint-fmt) OK** - early green failfast, reuse C2 80% config, no deps bump red.
- ✅ **Bước 3 (0.2a pin deps langroid==0.58.0/slowapi==0.1.9/redis>=5.0.1,<6.0.0) OK** - fix version vô tội vạ, bám ID 0.2 pyproject.toml lock piptools, CP0.1 no changes.
- ✅ **Bước 4 (0.2b lint 0 pre-commit) OK** - fix lint partial 465, bám CP0.2 pass.
- ✅ **Bước 5 (0.3.1a unit test foundation cov >=80%) OK** - fix test arbitrary/low coverage, bám ID 0.5 khung kiểm thử pytest.ini, CP0.3 unit --cov 0 failures >70%.
- ✅ **Bước 6 (0.3.1b freeze snapshot diff fail) OK** - fix test nhảy múa, bám CP0.4 manifest drift =0.
- ✅ **Bước 7 (0.5a secret clean .trufflehogignore/rm logs 0) OK** - fix secret 72 unverified, bám CP0.5 trufflehog --fail 0.
- ✅ **Bước 8 (0.3.2a CI complete jobs order lint>test>secret) OK** - fix CI not green, bám ID 0.3.2 tách workflow, failfast CP red block.
- ✅ **Bước 9 (0.3.2b gate checkpoint reuse C1 runner block merge red) OK** - enforce failfast, bám CI map unittests CP0.4.
- ✅ **Bước 10 (0.4a Terraform move bucket var plan no apply) OK** - fix Terraform incomplete, bám ID 0.4 minimal buckets, CPG0.1 plan no destroy.
- ✅ **Bước 11 (0.5b hook manifest local pre-commit) OK** - enforce test freeze local, bám CP0.2 pre-commit manifest drift.
- ✅ **Bước 12 (0.5c report green link CI CP0.1-0.5/0.9 ✔) OK** - S1 deliverable Repo/CI green, ready ID 0.6.

---

© 2025 – KH Quay Lại Đúng Đường Version 2.0 (đồng bộ Agent Data Plan V12 & Checkpoint Plan V7)
