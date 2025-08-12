📜 Kế hoạch Hợp nhất Luật vào Hạ tầng – Version 1.12-fix
Cập nhật: 06/08/2025
Version: 1.12-fix
Thay đổi so với v1.12:
- Cập nhật cú pháp cho tất cả các định nghĩa schedule: - cron: để bao gồm cả múi giờ (timeZone) một cách tường minh, tăng cường sự rõ ràng và tuân thủ các thực hành tốt nhất (best practice).

### 1. Ngữ cảnh & Mục tiêu
- Ngữ cảnh: Toàn bộ hệ thống văn bản pháp quy của dự án đã được "khóa" lại, bao gồm Hiến pháp v1.11e, 4 bộ Luật, và 2 bộ Quy tắc cho Cursor. Hệ thống mới này định nghĩa lại các quy tắc vận hành, cấu trúc hạ tầng và tiêu chuẩn bảo mật. Cần có một kế hoạch thực thi để cập nhật hạ tầng hiện tại cho tuân thủ tuyệt đối với các quy định mới này.
- Mục tiêu:
  - Mục tiêu chính: Cập nhật, cấu hình và xác minh toàn bộ hạ tầng công nghệ (GitHub, Google Cloud) để tuân thủ 100% hệ thống pháp quy mới đã ban hành.
  - Trạng thái kết thúc: Hạ tầng sẵn sàng, an toàn và nhất quán. Toàn bộ các "Nợ Kỹ thuật" đã được ghi nhận và có kế hoạch thực thi. Dự án sẵn sàng quay trở lại thực thi Kế hoạch Agent Data V12.
- Người thực thi: Cursor là người thực thi chính. Owner chỉ can thiệp khi có yêu cầu phê duyệt.

### 2. Các Nhiệm vụ Lớn (Milestones)

| ID | Nhiệm vụ Lớn | Mô tả |
|----|--------------|-------|
| M1 | Soạn thảo và Thiết lập Quy tắc cho Cursor | Dịch và chuẩn hóa 2 file RULES (Global & Project) sang tiếng Anh. Tạo cấu trúc thư mục .cursor/ và đặt các file luật làm tài liệu tham chiếu. |
| M2 | Cấu hình & Xác minh Secrets và WIF | Bảo mật PAT, xác minh secrets trên repo trung tâm. Cấu hình WIF trên Google Cloud theo đúng Hiến pháp và xác minh chi tiết. |
| M3 | Đồng bộ Secrets và Xác minh Tổng thể | Cập nhật và chạy workflow sync-secrets.yml. Chạy script xác minh tổng thể (verify_setup.sh) để kiểm tra toàn diện. |
| M4 | Cập nhật và Xác minh Hạ tầng Terraform | Kiểm tra và đảm bảo trạng thái Qdrant. Chạy terraform plan để kiểm tra và áp dụng các thay đổi về hạ tầng một cách an toàn. |
| M5 | Thiết lập Giám sát và Báo cáo | Cấu hình các workflow giám sát tự động cho Secret và Artifact theo quy định trong GH-LAW. |
| M6 | Thực thi Nợ Kỹ thuật & Hoàn thiện | Tạo workflow sao lưu tfstate, tạo dashboard giám sát, và thực hiện tổng kiểm tra cuối cùng. |

### 3. Lộ trình Triển khai theo Sprint

| Sprint | Ngày bắt đầu | Ngày kết thúc | Nhiệm vụ Lớn (Milestone) | Mục tiêu chính |
|--------|--------------|---------------|--------------------------|----------------|
| S1 | 07/08/2025 | 10/08/2025 | M1 | Nền tảng nhận thức cho Cursor được thiết lập. |
| S2 | 11/08/2025 | 16/08/2025 | M2 | Cấu hình bảo mật nền tảng (Secrets, PAT, WIF) được xác minh. |
| S3 | 17/08/2025 | 22/08/2025 | M3 & M4 | Hạ tầng được đồng bộ và xác minh toàn diện. |
| S4 | 23/08/2025 | 25/08/2025 | M5 & M6 | Hệ thống giám sát và các nợ kỹ thuật được thực thi, sẵn sàng bàn giao. |

Xuất sang Trang tính

### 4. Kế hoạch chi tiết theo từng Prompt

Sprint 1: Thiết lập Nền tảng Nhận thức cho Cursor (M1)

| ID Prompt | Tác vụ Chi tiết | Điều kiện Hoàn thành (PASS Condition) |
|-----------|-----------------|---------------------------------------|
| P-167 | Soạn thảo file GLOBAL_RULES và Project RULES bằng tiếng Anh. | Hai file .md được tạo trong .cursor/, sử dụng mô hình cấu trúc lai (YAML Front Matter + Diễn giải) và được Owner phê duyệt. |
| P-168 | Tổ chức thư mục tham chiếu luật. | Thư mục .cursor/laws_files/ được tạo. 5 file luật được sao chép vào. Thay đổi được commit vào nhánh feat/merge-to-laws. |

Sprint 2: Cấu hình và Xác minh Bảo mật (M2)

| ID Prompt | Tác vụ Chi tiết | Điều kiện Hoàn thành (PASS Condition) |
|-----------|-----------------|---------------------------------------|
| P-169 | Bảo mật PAT và Viết Script validate_secrets.py. | 1. Di dời PAT của sync-secrets vào Google Secret Manager (gh_pat_sync_secrets). 2. Tạo secret gh_pat_sync_secrets_expiry (định dạng RFC 3339) để lưu ngày hết hạn. 3. Cập nhật sync-secrets.yml để inject PAT qua WIF/OIDC. 4. Tạo script (scripts/validate_secrets.py) để xác nhận secrets tồn tại và PAT còn hạn ≥15 ngày. |
| P-170 | Cập nhật mã Terraform cho WIF. | Cập nhật file Terraform IAM để cấu hình WIF theo Hiến pháp Điều VIII. |
| P-170a | Viết và chạy Script verify_wif_attr.sh. | Tạo script mới để gọi gcloud... describe và so sánh attributeCondition đang được cấu hình với đặc tả trong Hiến pháp. |

Sprint 3: Đồng bộ và Cập nhật Hạ tầng (M3 & M4)

| ID Prompt | Tác vụ Chi tiết | Điều kiện Hoàn thành (PASS Condition) |
|-----------|-----------------|---------------------------------------|
| P-171 | Cập nhật workflow sync-secrets.yml để bổ sung lịch chạy tự động hàng ngày theo GH-LAW §5.2. Cú pháp BẮT BUỘC phải tường minh về múi giờ như sau:<br>```yaml<br>schedule:<br> - cron: '0 2 * * *'<br># timeZone: 'UTC' # Ghi chú: Chạy lúc 2h sáng UTC.<br>```<br><br>Sau khi cập nhật, kích hoạt thủ công để chạy ngay. | Workflow được cập nhật, commit và chạy thành công ít nhất một lần. |
| P-172 | Kiểm tra và Khởi động Qdrant. | Viết và chạy script gọi đến Cloud Function manage_qdrant với action status. Nếu trạng thái trả về là STOPPED, tự động gọi action start để kích hoạt lại cluster. |
| P-173 | Rà soát và Cập nhật Mã Terraform (UBLA). | Rà soát và cập nhật mã Terraform. Với các bucket legacy, bổ sung logic sử dụng biến TF_VAR_SKIP_UBLA để bỏ qua việc bật UBLA. Quy trình áp dụng an toàn: sao lưu tfstate trước, sau đó áp dụng dần dần dưới sự giám sát. |

Sprint 4: Hoàn thiện Giám sát và Tổng kiểm tra (M5 & M6)

| ID Prompt | Tác vụ Chi tiết | Điều kiện Hoàn thành (PASS Condition) |
|-----------|-----------------|---------------------------------------|
| P-174 | Tạo 2 workflow mới theo GH-LAW §7 và NEW RULES §6: artifact-audit.yml và secrets-audit.yml, bao gồm cả bước gửi cảnh báo Slack. Lịch chạy BẮT BUỘC phải tường minh về múi giờ như sau:<br>artifact-audit.yml:<br>```yaml<br>schedule:<br> - cron: '0 2 * * *'<br># timeZone: 'UTC'<br>```<br><br>secrets-audit.yml:<br>```yaml<br>schedule:<br> - cron: '0 3 * * *'<br># timeZone: 'UTC'<br>``` | Hai file workflow được tạo và commit. Logic quét và cảnh báo được triển khai. |
| P-175 | Viết và Chạy Script xác minh tổng thể verify_setup.sh. | Tạo script scripts/verify_setup.sh để kiểm tra toàn diện: 1. WIF hoạt động (bao gồm cả kịch bản PR từ fork). 2. Secrets đọc được. 3. Manifest Drift bằng 0 (CP0.4). 4. Số lượng artifact "stale" dưới ngưỡng (CPG5.3). 5. Terraform Plan không có destroy (CPG0.1). 6. Budget alert đã được cấu hình (CPG7.4). 7. Log CI (gh run view) xác nhận thành công. 8. Chi phí Qdrant dưới ngưỡng (CPG4.2c). |
| P-176 | Tạo workflow backup-tfstate.yml để thực thi nợ kỹ thuật TD-TF-02. Lịch chạy hàng tháng BẮT BUỘC phải tường minh về múi giờ như sau:<br>```yaml<br>schedule:<br> - cron: '0 1 1 * *'<br># timeZone: 'UTC' # Ghi chú: Chạy vào 01:00 UTC ngày đầu tiên mỗi tháng.<br>``` | Workflow backup-tfstate.yml được tạo và commit vào nhánh feat/merge-to-laws. |
| P-177 | Tạo Workflow Dọn dẹp Artifact An toàn. | Tạo workflow cleanup-artifacts.yml chỉ được kích hoạt khi một PR có nhãn approved-cleanup và được Owner duyệt theo GH-LAW §7.5. |
| P-178 | Tạo Dashboard Giám sát. | Tạo dashboard giám sát cơ bản trên Cloud Monitoring (HP-OBS-01). Ghi nhận TD-OBS-01. |
| P-179 | Tổng kiểm tra cuối cùng và Merge. | Thực thi lại kiểm tra Manifest Drift (CP0.4). Thực thi lại script verify_setup.sh. Chạy lại terraform plan. Báo cáo toàn bộ kết quả. Merge nhánh feat/merge-to-laws vào main. |

### 5. Quản lý Rủi ro

| Rủi ro | Hậu quả tiềm tàng | Biện pháp Giảm thiểu / Runbook |
|--------|-------------------|--------------------------------|
| PAT của workflow sync-secrets hết hạn | Workflow thất bại, gây ra rủi ro "Drift secrets". | Script validate_secrets.py (P-169) kiểm tra hạn PAT (CPG6.1). Cảnh báo tự động từ secrets-audit.yml. |
| Workflow sync-secrets down > 24h | Secrets trên repo con trở nên lỗi thời, gây lỗi xác thực. | Quy trình fallback thủ công được kích hoạt theo GH-LAW §5.5. |
| Cấu hình WIF sai | Toàn bộ pipeline CI/CD thất bại do lỗi xác thực. | Script verify_setup.sh và verify_wif_attr.sh (P-170a) kiểm tra chi tiết. Yêu cầu CI pass sau khi cấu hình (P-170). |
| Workflow cleanup xóa nhầm artifact | Mất artifact quan trọng (log, build history). | Workflow P-177 yêu cầu nhãn approved-cleanup và phê duyệt của Owner trước khi chạy. |
| Terraform destroy tài nguyên ngoài scope | Mất dữ liệu hoặc gián đoạn dịch vụ. | Script verify_setup.sh kiểm tra plan không có hành động destroy (CPG0.1). Tài nguyên quan trọng có prevent_destroy=true. |
| Quên cấu hình Budget Alert | Chi phí vượt ngân sách không được cảnh báo. | Script verify_setup.sh kiểm tra sự tồn tại của budget alert (CPG7.4). |
| Mất tfstate do sự cố | Mất khả năng quản lý và khôi phục hạ tầng. | Workflow backup-tfstate.yml (P-176) sao lưu định kỳ (CPG6.2). |
| Bật UBLA trên bucket "legacy" gây lỗi | Terraform state lock, CI thất bại. | Quy trình an toàn trong P-173 (sử dụng cờ TF_VAR_SKIP_UBLA). |
| Chi phí Qdrant vượt ngưỡng cho phép | Phát sinh chi phí ngoài dự kiến, ảnh hưởng ngân sách dự án. | Script verify_setup.sh (P-175) kiểm tra định kỳ. Nếu vượt ngưỡng, một cảnh báo tự động sẽ được gửi qua Slack. Runbook: Kích hoạt manage_qdrant với action stop để tạm dừng cluster hoặc giảm số lượng replica. |
