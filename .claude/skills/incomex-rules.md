# Skill: Incomex Operating Rules — CƯỠNG CHẾ

> Đọc file này TRƯỚC MỌI tác vụ. Vi phạm = reject.

## ⚡ MERGE RULE (web-test) — v4.68
"CI GREEN" = CHỈ 4 required checks GREEN:
- Pass Gate
- Quality Gate
- check-critical-files
- Contract Schema Validation

MERGE NGAY khi 4 cái trên xanh.
KHÔNG đợi: build, E2E Tests, Terraform Deploy, required-docs-guard (non-blocking).
Đợi non-blocking = VI PHẠM, lãng phí thời gian User.

## ⚡ AUTO MODE — GIẢM PERMISSION PROMPTS
Chạy với auto mode: `claude --enable-auto-mode` hoặc Shift+Tab chuyển mode.
Auto mode = AI tự đánh giá rủi ro, chỉ hỏi khi nguy hiểm thật.
User KHÔNG hiểu kỹ thuật, bấm Yes vô nghĩa, lãng phí thời gian.
Hệ thống đã có post-deploy E2E bắt lỗi — rủi ro thấp.

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

## ASSEMBLY GATE — 6 CÂU HỎI BẮT BUỘC TRƯỚC KHI CODE

Trước khi viết BẤT KỲ dòng code nào, DỪNG LẠI và trả lời:

```
┌──────────────────────────────────────────────────────────┐
│ ASSEMBLY GATE v2 — Không qua = KHÔNG ĐƯỢC CODE           │
├──────────────────────────────────────────────────────────┤
│ 0. PostgreSQL đã có sẵn (VIEW/FUNCTION/TRIGGER/CTE)?    │
│    Kiểm tra: psql \df, \dv, pg_trigger — dùng PG trước  │
│                                                          │
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

## NGUYÊN TẮC FIX GỐC

Khi phát hiện data bất thường:
1. **LIỆT KÊ** — bao nhiêu, loại gì, từ đâu
2. **ĐIỀU TRA** — tại sao xảy ra (root cause)
3. **PHÂN LOẠI** — cũ/mới, nghiêm trọng/nhẹ
4. **FIX QUY TRÌNH** — sửa process để không tái diễn
5. **MỚI DỌN** — chỉ dọn data SAU KHI hiểu gốc

**KHÔNG BAO GIỜ xoá/sửa data để số đẹp mà chưa điều tra.**
**KHÔNG BAO GIỜ nới threshold để health check xanh mà chưa fix gốc.**

## COLLECTION CREATION CHECKLIST — 8 BƯỚC BẮT BUỘC

Khi tạo collection MỚI trong Directus/PG, PHẢI hoàn thành TẤT CẢ:

```
┌─────────────────────────────────────────────────────────┐
│ COLLECTION CREATION CHECKLIST — Thiếu = ĐIỂM MÙ         │
├─────────────────────────────────────────────────────────┤
│ 1. PG table tạo xong (Directus API hoặc ALTER TABLE)   │
│ 2. meta_catalog entry (CAT-NNN, name, entity_type...)   │
│ 3. v_registry_counts entry + code_column đúng           │
│ 4. PG TRIGGER đếm (trg_count_xxx) → refresh counts     │
│ 5. Changelog flows (3: create + update + delete)        │
│ 6. AI Agent READ permission                             │
│ 7. v_all_entity_codes VIEW cập nhật (nếu managed)      │
│ 8. Auto-label trigger (trg_label_assign_xxx)            │
└─────────────────────────────────────────────────────────┘
```

Chạy `dot-coverage-inspector` sau khi tạo → 0 blind spots.

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
[ ] Assembly Gate 6 câu đã trả lời (bao gồm câu 0 PostgreSQL)?
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

## TD-111: CODE = UNIQUE ID TOÀN HỆ THỐNG

- **code (PREFIX-NNN) = unique ID duy nhất** cho cross-reference giữa các collection.
- **KHÔNG dùng integer id** (auto-increment) làm foreign key hoặc cross-reference.
- Integer id chỉ dùng nội bộ trong 1 collection (primary key).
- Collections MỚI **PHẢI dùng UUID** làm primary key (không dùng auto-increment integer).
- Khi tham chiếu entity khác: dùng code field (VD: `workflow_code = "WF-001"`), KHÔNG dùng `workflow_id = 1`.
