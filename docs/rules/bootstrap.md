
<!-- SESSION-STARTUP -->
## Session Startup (Codex/Cursor)

Mục tiêu: Mỗi phiên mới chỉ cần 1 bước: chạy post-boot quickcheck để verify → (apply nếu cần) → verify + SOP và in DoD.

Lệnh chạy:

```bash
bash CLI.POSTBOOT.250.sh
# hoặc: make postboot
```

Kết quả mong đợi:
- Log tại `.ci/postboot.log` và DoD snapshot (marker, sop.pass, gh status, origin).
- Tập tin dấu mốc `.ci/.bootstrap_done` (nếu gh đã đăng nhập).
- Báo cáo `.ci/sop_bootstrap_check/summary.json` với `pass:true` khi hợp lệ.

Gợi ý khắc phục nhanh:
- gh chưa cài/đăng nhập: cài GitHub CLI; script sẽ thử `GITHUB_TOKEN` hoặc Google Secret Manager (`$PROJECT`/`$SECRET_NAME`).
- Sai remote `origin`: cập nhật về repo hợp lệ.

Env override thường dùng:
- `PROJECT`, `SECRET_NAME`, `GITHUB_TOKEN`

Copy-paste prompt có sẵn: `.ci/prompt_codex.txt`, `.ci/prompt_cursor.txt`.
<!-- /SESSION-STARTUP -->
