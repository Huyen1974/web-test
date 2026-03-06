# Skill: Incomex Operating Rules — CƯỠNG CHẾ

> Đọc file này TRƯỚC MỌI tác vụ. Vi phạm = reject.

## NGUYÊN TẮC SỐ 1: LẮP RÁP, KHÔNG CODE

**LUÔN ưu tiên lắp ráp. Code là lựa chọn CUỐI CÙNG.**

Hệ thống đã cài Nuxt UI v2.22.3 (125+ components), Directus SDK, đầy đủ công cụ.
Không có lý do gì để viết custom component khi đã có sẵn.

## TRƯỚC KHI LÀM BẤT CỨ GÌ — ĐỌC TÀI LIỆU

```
search_knowledge("operating rules SSOT")
search_knowledge("assembly module SSOT")
search_knowledge("tech debt")
search_knowledge("current state system")
```

Đọc xong mới bắt đầu. Không đọc = không làm.

## ASSEMBLY GATE — 5 CÂU HỎI BẮT BUỘC TRƯỚC KHI CODE

Trước khi viết BẤT KỲ dòng code nào, DỪNG LẠI và trả lời:

```
┌──────────────────────────────────────────────────────────┐
│ ASSEMBLY GATE — Không qua = KHÔNG ĐƯỢC CODE              │
├──────────────────────────────────────────────────────────┤
│ 1. Nuxt UI đã có component cho việc này chưa?            │
│    Tìm trong: UTable, UTimeline, UStepper, UModal,       │
│    UCheckbox, UTabs, UBadge, UTooltip, UPopover,         │
│    USkeleton, UPagination, UAccordion, UInput,            │
│    UTextarea, USelect, UForm, USlideover, UDropdown,      │
│    UBreadcrumb, UProgress, UNavigationMenu, UAvatar,      │
│    UAlert, UChip, UDivider, URadio, UToggle              │
│                                                          │
│ 2. Codebase đã có component tương tự chưa?               │
│    grep -r "ComponentName" web/ --include="*.vue" -l     │
│                                                          │
│ 3. CÓ SẴN → Dùng NGUYÊN hoặc WRAP. KHÔNG viết lại.     │
│                                                          │
│ 4. KHÔNG CÓ → Ghi rõ: đã tìm ở đâu, tại sao không có. │
│    XIN Ý KIẾN trước khi code. KHÔNG ngẫu hứng code bừa. │
│                                                          │
│ 5. Code mới (nếu được duyệt) đăng ký                    │
│    custom-code-registry.md                               │
└──────────────────────────────────────────────────────────┘
```

GHI câu trả lời vào ĐẦU báo cáo/output. Không có Assembly Gate = reject.

## QUY TẮC CỤ THỂ

### Bảng/Table:
- KHÔNG viết `<table>`, `<tr>`, `<thead>`, `<td>`, `<th>`
- Dùng `<UTable>` hoặc `<DirectusTable>` (wrapper UTable)
- Bảng mới = config DirectusTable props. Tối đa 20 dòng.

### Timeline/Stepper:
- KHÔNG viết custom timeline
- Dùng `<UTimeline>` hoặc `<UStepper>`

### Form elements:
- KHÔNG viết raw `<input>`, `<select>`, `<textarea>`, `<input type="checkbox">`
- Dùng `<UInput>`, `<USelect>`, `<UTextarea>`, `<UCheckbox>`

### Popup/Modal:
- KHÔNG viết custom positioned popup
- Dùng `<UPopover>`, `<UModal>`, `<UTooltip>`, `<USlideover>`

### Directus = DOT 100%:
- MỌI thao tác schema Directus (tạo/sửa collection, field, permission, flow) → PHẢI dùng DOT tools.
- KHÔNG dùng Directus API trực tiếp cho schema. KHÔNG dùng curl. KHÔNG dùng MCP cho schema (MCP = data CRUD only).
- TRƯỚC KHI thao tác Directus, LUÔN kiểm tra DOT có sẵn:
```bash
# Bắt buộc chạy TRƯỚC:
ls dot/bin/dot-* | grep KEYWORD        # Tìm tool liên quan
ls dot/bin/dot-schema-* | grep KEYWORD  # Tìm schema tool cụ thể
ls dot/bin/dot-permission-*             # Tìm permission tool
ls dot/bin/dot-flow-*                   # Tìm flow tool
```
- CÓ tool → đọc nó (`cat dot/bin/dot-TÊN`) → dùng ngay
- KHÔNG CÓ tool → ĐỀ XUẤT viết thêm, ghi rõ cần tool gì, làm gì. KHÔNG tự viết DOT mới mà không kiểm tra trước.
- Khi viết DOT mới (sau khi được duyệt): ghi dòng đầu `# CHECKED-NO-DUPLICATE: [đã grep, không có tool tương tự]`

## QUY TRÌNH 2 MŨ — CHẠY 1 LÈO

**KHÔNG BAO GIỜ dừng giữa chừng. Không "chờ review". Không "ready for deploy".**

Mũ 1: Code → push → PR → CI GREEN (fix nếu đỏ, lặp đến xanh)
Mũ 2: Merge squash → Deploy VPS → Đợi 60s → Verify production → Báo cáo

```bash
# Mũ 1:
git checkout -b feat/BRANCH
git add -A && git commit -m "feat: MÔ TẢ"
git push origin HEAD
gh pr create --title "TITLE" --body "BODY"
gh pr checks PR_NUMBER  # Chờ xanh. Đỏ → fix → push → chờ lại.

# Mũ 2:
gh pr merge PR_NUMBER --squash
ssh root@38.242.240.89 "cd /opt/incomex/docker && docker compose pull nuxt && docker compose up -d nuxt"
sleep 60
curl -sI https://vps.incomexsaigoncorp.vn/ĐƯỜNG_DẪN  # Phải 200
```

## VERIFY TRỰC QUAN

**SAI:** grep class name → thấy → báo "Working"
**ĐÚNG:**
- Data thật render (không empty)?
- Tương tác hoạt động (click, sort, hover)?
- Component ĐÚNG được dùng (không phải component cũ)?

Ghi PASS/FAIL từng mục. Chưa verify = CHƯA DONE.

## BÁO CÁO

Sau MỌI mission:
```
upload_document path="knowledge/current-state/reports/TÊN-report.md"
```
Nội dung bắt buộc: Assembly Gate answers + changes + verify results (PASS/FAIL)

## KIỂM TRA TRƯỚC KHI BÁO CÁO "COMPLETE"

```
[ ] Assembly Gate 5 câu đã trả lời?
[ ] Không có custom <table>/<tr>/<thead> mới?
[ ] 2 mũ đã chạy hết (không dừng giữa)?
[ ] Verify trực quan trên production PASS?
[ ] Báo cáo đã upload Agent Data?
[ ] Tech debt đã cập nhật (nếu có)?
```

## HIẾN PHÁP KIẾN TRÚC — CHECKLIST BẮT BUỘC

Trước MỌI tác vụ, verify:
- [ ] Mọi thực thể TẠO MỚI phải có ID (PREFIX-NNN) + nằm trong registry (Điều 2)
- [ ] Mọi thực thể phải có metadata (name, description, classification, owner) (Điều 3)
- [ ] TẠO qua DOT/script. KHÔNG code trực tiếp. KHÔNG tạo ngoài quy trình (Điều 4)
- [ ] KHÔNG xây tầng trên khi tầng dưới chưa vững (Điều 5)
- [ ] Khi thấy bất đồng bộ → tư duy kiến trúc, KHÔNG chỉ fix 1 chỗ (Điều 6)
- [ ] Khai thác Directus/Nuxt UI có sẵn TRƯỚC. Code mới = lựa chọn CUỐI CÙNG (Điều 7)
- [ ] Script PHẢI idempotent + verify step cuối (Điều 11)
- [ ] Lifecycle đầy đủ: sinh + sửa + xoá (Điều 12)
- [ ] Tạo = tự xuất hiện trong danh mục. Xoá = tự biến mất (Điều 13)
- [ ] KHÔNG 2 thực thể cùng bản chất (Điều 14)

Chi tiết: search_knowledge("hiến pháp kiến trúc")

## BẢNG MÃ PREFIX

```
COL=Collection  FLD=Field       TBL=Bảng UI     MOD=Module
WF=Workflow     WCR=Đề xuất     SCR=Schema      TP=Table proposal
DOT=DOT tool    PG=Page         API=API endpoint CMP=Component
EVT=Event       DEP=Dependency  AGT=Agent       CAT=Catalog entry
Format: PREFIX-NNN (3+ số tự tăng)
```
