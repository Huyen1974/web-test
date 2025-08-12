📜 Hiến Pháp Hạ Tầng Agent Data – Version 1.11e (Final Freeze)
Updated: August 04, 2025 Purpose: Supreme principles governing Agent Data Langroid. All Laws and plans MUST comply. Scope: agent-data-test / agent-data-production Changes from v1.11d:
•	v1.11e: Tinh chỉnh cuối cùng về mô hình secrets cho phù hợp với thực tế hạ tầng, ràng buộc định dạng của tiền tố bucket, và tự động hóa hoàn toàn quy trình dọn dẹp artifact sau khi được phê duyệt. Đây là bản đóng băng cuối cùng.

### Điều I – Phạm vi & Mục tiêu
ID	Principle	Description	Source Documents / Notes
HP-01	Single Owner Simplicity	Single owner manages infrastructure for minimal, observable configs.	HẠ TẦNG GOOGLE CLOUD.docx (reflects single project architecture)
HP-02	Absolute IaC with Minimalism	All resources via Terraform; Terraform quản lý khai báo secret (metadata), giá trị cụ thể được inject thủ công / CI, không hard-code trong HCL. Tất cả các GCS Bucket được tạo mới BẮT BUỘC phải bật uniform_bucket_level_access.	HẠ TẦNG GOOGLE CLOUD.docx, QDRANT INFO & Requirement.docx
HP-03	No False Reporting	No “PASS/Complete” unless conclusion == success verified by CI logs.	Plan checkpoint V7.docx, 0.6b1-fix9
HP-04	Automated Test Count Control	Hệ thống tự động kiểm soát sự thay đổi về số lượng bài kiểm tra. Mọi thay đổi (thêm/bớt test) phải được phản ánh một cách tường minh thông qua việc cập nhật file "manifest" (test_manifest_baseline.txt). CI sẽ tự động thất bại nếu phát hiện có sự thay đổi chưa được ghi nhận (Manifest Drift ≠ 0).	Plan checkpoint V7.docx (CP0.4), o3 gap, User chốt cuối
HP-05	Central Secrets Inheritance	Mô hình quản lý secrets được chuẩn hóa là quản lý tập trung, sử dụng một repo trung tâm (ví dụ: chatgpt-githubnew) để điều phối việc đồng bộ secrets từ Google Secret Manager sang các repo con thông qua script. Khi hạ tầng được nâng cấp lên tài khoản GitHub Organization, mô hình sẽ chuyển sang sử dụng Organization-Level secrets.
Trong trường hợp quy trình đồng bộ tự động gặp sự cố kéo dài (ví dụ: >24 giờ), Owner được phép cập nhật secret thủ công tại repo trung tâm, với điều kiện bắt buộc phải có bản ghi kiểm toán (audit log) chi tiết.	HẠ TẦNG GOOGLE CLOUD.docx, o3 X-2, user decision, o3 edit

### Điều II – Quy ước Định danh Chung
Resource	Standard Naming	Example	Notes
GCP Project	github-chatgpt-ggcloud		Dùng chung cho cả test/prod theo quyết định cuối cùng.
Service Account	chatgpt-deployer@`<project>`.iam.gserviceaccount.com	chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com	Least privilege. Đây là Service Account duy nhất được sử dụng. Cấm tạo SA mới trừ khi có sự sửa đổi Hiến pháp.
WIF Pool	agent-data-pool		Single pool.
WIF Provider	github-provider		Attribute conditions per repo, có kế hoạch di dời provider cũ.
GCS Bucket	`<standard-prefix>`/agent-data-`<purpose>`-`<env>`	huyen1974-agent-data-artifacts-test	Tiền tố chuẩn hóa (`<standard-prefix>`) được định nghĩa và quản lý trong TF-LAW, với giá trị mặc định là huyen1974. Tiền tố này BẮT BUỘC phải tuân thủ định dạng tên miền DNS (RFC 1035). Ghi chú: `<purpose>` là mục đích sử dụng (ví dụ: artifacts, tfstate, backup); `<env>` là môi trường (test hoặc production).
`<br>`
Nguyên tắc chung về định danh:
•	Tài nguyên công khai (Bucket, Repo, Project ID): Bắt buộc chỉ dùng dấu gạch ngang (-).
•	Tài nguyên nội bộ (Secret ID, Qdrant Collection): Được phép dùng cả gạch ngang (-) và gạch dưới (_).
`<br>`
Ngoại lệ: Các bucket do Google Cloud tự sinh (vd: gcf-v2-sources*, artifacts.*.appspot.com) không thuộc phạm vi của quy ước này.

Qdrant Cluster	agent-data-vector-dev-useast4		Shared cluster for development.
Qdrant Collection	`<env>`_documents	test_documents, production_documents	Phân tách trong cluster dùng chung.
GitHub Repos	agent-data-`<env>`	agent-data-test, agent-data-production
Secrets (GCP)	`<purpose>`_`<env>`	Qdrant_agent_data_N1D8R2vC0_5	Nguồn gốc tại Secret Manager, tham chiếu từ nguồn tập trung.
> *Xuất sang Trang tính*

### Điều III – Chính sách Bảo mật & Quyền hạn
ID	Principle	Description
HP-SEC-01	Least Privilege	Only necessary roles; prohibit admin roles.
HP-SEC-02	Secret Rotation	Rotate keys every 90 days for production; 120 days for test.
HP-SEC-03	Audit Logging	Enable Cloud Audit Logs for DATA_WRITE.
HP-SEC-04	Secret Scanning	Zero findings via TruffleHog.
> *Xuất sang Trang tính*

### Điều IV – Kiểm soát CI/CD
ID	Principle	Description
HP-CI-01	Mandatory Checks	Include lint-only, agent-e2e, terraform-plan, secret-scan; all must succeed.
HP-CI-02	Pass Gate	Verify combined status before merge.
HP-CI-03	Artifact Retention	Các artifact cũ phải được quản lý vòng đời theo quy trình 2 giai đoạn:
1.	Sau 14 ngày: Các artifact sẽ được tự động đánh dấu là "stale" (cũ) để cảnh báo sớm.
2.	Sau 30 ngày: Một quy trình tự động sẽ tạo GitHub Issue [CLEANUP]... để yêu cầu phê duyệt. Việc xóa bỏ sẽ được thực hiện thủ công bởi người có thẩm quyền sau khi Issue được đóng lại.

HP-CI-04	No Continue-on-Error	Prohibit in test/lint/validate jobs, except for auth fallback.
HP-CI-05	Rollback & Fallback	Roadmap ≥ 0.7 BẮT BUỘC phải cung cấp cơ chế rollback tự động; trước thời điểm đó, việc rollback được phép thực hiện thủ công.
> *Xuất sang Trang tính*

### Điều V – Quản lý Chi phí & Giám sát
ID	Principle	Description
HP-COST-01	Budget Alerts	Budget alerts phải được cấu hình ở các ngưỡng 50%/80%/100%.
HP-OBS-01	Observability	Hệ thống BẮT BUỘC phải có dashboard giám sát các chỉ số vận hành cốt lõi (VD: độ trễ truy vấn, chi phí CI/CD). Chi tiết về chỉ số sẽ được quy định trong Luật.
> *Xuất sang Trang tính*

### Điều VI – Quản lý Dữ liệu & Phục hồi Thảm họa (DR)
ID	Principle	Description
HP-DR-01	Disaster Recovery	Hệ thống BẮT BUỘC phải có cơ chế sao lưu (backup/snapshot) tự động và định kỳ cho các dữ liệu quan trọng (VD: Qdrant cluster, Terraform state). Việc triển khai nguyên tắc này phụ thuộc vào khả năng kỹ thuật của hạ tầng; nếu tier dịch vụ không hỗ trợ, một giải pháp thay thế phải được định nghĩa trong Luật (QD-LAW), hoặc ghi nhận là nợ kỹ thuật.
HP-DR-02	Data Sync	Dữ liệu vector và metadata (ví dụ trên Firestore) phải luôn được đồng bộ. Mọi thao tác ghi phải đảm bảo tính nhất quán giữa các hệ thống.
> *Xuất sang Trang tính*

### Điều VII – Quản lý Cursor
ID	Principle	Description
HP-CS-01	Autonomous Execution	Execute to completion; stop only on blocking errors.
HP-CS-02	Mandatory Verification & Fixes	Khi CI thất bại, Cursor được phép tự động sửa lỗi và thử lại tối đa 2 lần. Sau lần thứ 2 nếu vẫn thất bại, quy trình sẽ dừng lại và thông báo cho Owner.
HP-CS-03	Rule Preservation	No delete/modify rules unless explicit prompt.
HP-CS-04	PR Description Autogeneration	Cursor prepend summary table to PR description.
HP-CS-05	Phân tách Quyền Ghi Secrets	• Các runner CI/CD thông thường (chạy test, build tại các repo con như agent-data-test) bị cấm tuyệt đối quyền secrets:write.`<br>``<br>` • Chỉ duy nhất quy trình đồng bộ secrets tự động (nếu có) mới được cấp quyền secrets:write để cập nhật secrets.
> *Xuất sang Trang tính*

### Điều VIII – Phụ lục: Bảng Điều Kiện WIF Chuẩn Hóa
Mục này quy định các điều kiện bắt buộc phải được cấu hình trong Terraform (Policy as Code) để kiểm soát truy cập từ GitHub Actions, nhằm ngăn chặn triệt để lỗi unauthorized\_client.
Kịch bản	Repository	Điều kiện attributeCondition
Pull Request (Môi trường Test)	agent-data-test	assertion.repository == 'Huyen1974/agent-data-test' && assertion.ref.startsWith('refs/heads/')
Release theo Tag (Test)	agent-data-test	assertion.repository == 'Huyen1974/agent-data-test' && assertion.ref.startsWith('refs/tags/')
Deploy (Môi trường Production)	agent-data-production	assertion.repository == 'Huyen1974/agent-data-production' && assertion.ref == 'refs/heads/main'
Release Production theo Tag	agent-data-production	assertion.repository == 'Huyen1974/agent-data-production' && assertion.ref.startsWith('refs/tags/')
> *Xuất sang Trang tính*
> *Ghi chú: Provider cũ github-provider (với alias cursor-ci-provider) sẽ được giữ lại trong 30 ngày kể từ ngày cập nhật để đảm bảo các quy trình cũ không bị gián đoạn trong quá trình chuyển đổi. Sau thời gian này, alias phải được xóa bỏ.*

#### Phụ lục – Khung 5 Luật Chuyên đề
1.	GC-LAW (Google Cloud)
2.	TF-LAW (Terraform)
3.	GH-LAW (GitHub)
4.	QD-LAW (Qdrant)
5.	CS-LAW (Cursor)
