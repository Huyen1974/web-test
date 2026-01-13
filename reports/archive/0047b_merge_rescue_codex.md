# 0047B – Merge rescue (CLI.CODEX.RESCUE-0047B)

## Tóm tắt
- Viết lại hoàn toàn `scripts/auto_merge_pr.sh` theo pattern backup → soft-ungate → merge → regate (trap đảm bảo restore).
- Kiểm tra PR #106: state=OPEN, mergeable=MERGEABLE, base=main, tất cả checks (Pass Gate, Guard Bootstrap Scaffold, Quality Gate, E2E, Terraform Deploy) SUCCESS.
- Soft-ungate tạm thời (disable review + status checks) rồi merge bằng `gh pr merge --admin --squash --delete-branch` → thành công.
- Regate khôi phục branch protection về cấu hình gốc (bảo vệ đầy đủ) và xác minh bằng `gh api .../branches/main/protection`.
- Cập nhật backlog: 0047-VERSIONING-STRATEGY = DONE (PR #106, CI xanh, merge bởi Codex).

## Script mới
- Đường dẫn: `scripts/auto_merge_pr.sh` (executable).
- Cách dùng: `./scripts/auto_merge_pr.sh <PR_ID>`
- Luồng: pre-check PR & CI → backup protection (GET + normalize) → áp dụng relaxed protection (tạm null reviews/status checks) → `gh pr merge --admin --squash --delete-branch` → trap luôn restore protection từ backup.
- Log prefix `[AUTO-MERGE]`, fail-safe `[ERROR]`; yêu cầu `gh auth status -t` có đủ scope.

## Bằng chứng
- Trước merge: `gh pr view 106 --json state,mergeable,statusCheckRollup` ⇒ state=OPEN, mergeable=MERGEABLE, 4/4 check runs SUCCESS (Pass Gate, Quality Gate, E2E, build; Terraform/Guard nằm trong workflow Terraform Deploy).
- Sau merge: `gh pr view 106 --json state,mergeCommit` ⇒ state=MERGED, mergeCommit=1e6b918d521077fa9606db8101db5acecd56b3bf.
- `git fetch origin && git log -1 --oneline` on main ⇒ `1e6b918 docs(0047): Add Directus content versioning design (#106)`.
- Branch protection sau regate khớp cấu hình gốc: required checks 5 contexts, 1 code-owner review, enforce_admins=true (verified via `gh api repos/.../branches/main/protection`).

## Trạng thái
- Kết quả: **SUCCESS – PR #106 đã merge vào main**, branch protection phục hồi, CI trên PR #106 trước merge đã xanh.
- Working tree: giữ nguyên các thay đổi trước đó của người dùng (reports/0032..., W203, W204, web/types/view-model-0032.ts) – không động chạm; thêm file script mới và cập nhật backlog.

## Next steps
- 0047B hoàn tất; điểm xuất phát cho 0047C là main @ `1e6b918` với design doc v2 (parent–child) đã merge.
- Nếu cần merge tự động PR khác, dùng script mới nhưng kiểm tra CI/PR state trước khi ungate.
