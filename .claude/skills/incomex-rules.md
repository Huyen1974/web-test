# SKILL INCOMEX — Theo dòng chảy công việc

> 🖥️ = Desktop (điều hành) | 🔧 = CLI (thực thi) | Cả hai = cả 2 đọc
> Đọc luật qua MCP Agent Data KB: search_knowledge() TRỰC TIẾP main process.
> CẤM background agent (AP-14). MCP = cổng DUY NHẤT vào knowledge base.

---

## BƯỚC 0 — NỀN TẢNG (đọc 1 lần, nhớ mãi)

### #1 — 3 CÂU TUYÊN NGÔN (Cả hai)
Mọi giải pháp PHẢI trả lời 3 câu:
1. **Vĩnh viễn?** — Ngày mai thay đổi, quay lại không? CÒN = sọt rác. KHÔNG FIX VỤ VIỆC, CHỈ FIX GỐC.
2. **Nhầm được không?** — Hạ tầng chặn > dặn dò. Muốn nhầm cũng không thể.
3. **100% tự động?** — Người biến mất 1 tuần → vẫn chạy? Còn bước tay = chưa xong (§0-AW).
→ Không trả lời = không làm. Chung chung = FAIL.

### #2 — LUẬT BẢO TOÀN (Cả hai)
- ID không tái sử dụng. Entity retired → ID giữ lại.
- Quan hệ không tự mất. Xoá entity → xử lý dependencies trước.
- Metadata không giảm. Chỉ thêm/sửa, KHÔNG xoá.

### #3 — 9 NGUYÊN TẮC NỀN TẢNG (Cả hai)
1. SSOT — sửa 1 chỗ = thay đổi mọi nơi
2. Tự động 100% — làm tay = thiết kế sai
3. DOT 100% — không DOT = không làm được
4. Sẵn sàng thay đổi — thay đổi = metadata/config, sửa code = tồi
5. Tự phát hiện, tự sửa — hệ thống biết khi sai, không chờ người
6. 5 tầng đồng bộ CẤM code Nuxt — Nuxt = màn hình, bypass = CẤM
7. Dual-trigger — 2 triggers, 1 trigger = chưa xong
8. Assembly First — PG → Directus → nguồn mở → code cuối
9. Không chắc đúng = Sai — không chắc → DỪNG + verify
→ Chi tiết: search_knowledge("law-01-foundation-principles")

### #4 — DATA FLOW ĐẦY ĐỦ (Cả hai)
3 luồng:
1. PG → Directus → Nuxt (hiển thị)
2. Directus → Agent Data → Qdrant (tri thức + vector)
3. Agent Data → Directus + Qdrant (ngược lại khi cần)
Mỗi collection sync 1 chiều. CẤM bypass (§0-AV). Anti-duplicate Điều 14 (3 cấp).

### #5 — DANH SÁCH CẤM (Cả hai)
--admin (AP-03), ALTER TABLE trực tiếp (AP-15), hardcode (§0-AU), bypass DOT (AP-09), manual deploy (AP-05), background agent (AP-14), push thẳng main, filter ẩn issues (AP-04), "excluded" che entity (AP-10), sáng tác Nuxt page cho collection mới (AP-11).

### #6 — DOT = NHIỆT KẾ (Cả hai)
DOT kiểm tra phải làm việc = thiết kế có lỗ → sửa GỐC thiết kế, KHÔNG fix data cho khớp (AP-16).
DOT idle = thiết kế tốt. DOT verify PHẢI so COUNT(*) thật (AP-12).
KHÔNG FIX VỤ VIỆC, CHỈ FIX GỐC — patch = CẤM.

### #7 — VAI TRÒ (Cả hai)
Desktop = chỉ đạo + thiết kế. CLI = thực thi. Việc lớn → giao agent, 1 prompt mỗi lần.

### #8 — ĐỌC LUẬT Ở ĐÂU (Cả hai)
Qua MCP: search_knowledge() TRỰC TIẾP main process.
Files quan trọng:
- knowledge/dev/ssot/operating-rules.md
- knowledge/dev/laws/constitution.md
- knowledge/dev/laws/law-*.md
- knowledge/dev/ssot/anti-patterns.md
MCP = cổng DUY NHẤT. Agent liệt kê files đã đọc + version.

### #9 — THUẬT NGỮ — KHÔNG LẪN (Cả hai)
| Thuật ngữ | Nghĩa | Ví dụ |
|-----------|-------|-------|
| "Lớp" | 7 cấp cấu tạo thực thể (Điều 0-B) | Lớp 0 hạ nguyên tử → Lớp 6 công trình. 33 species. |
| "Tầng" | 5 cấp kiến trúc hệ thống (Điều 5) | Tầng 1 hạ tầng → Tầng 5 giám sát. |
| "Layer" | 5 cấp navigation UI (Pivot/Registries) | Layer 1 tổng quan → Layer 5 ma trận. |
3 khái niệm KHÁC NHAU. Lẫn = sửa ngay.

Chi tiết:
**7 Lớp cấu tạo (Điều 0-B):**
- Lớp 0: Hạ nguyên tử — config, settings, field definitions
- Lớp 1: Nguyên tử — entity đơn lẻ nhỏ nhất có ID (contact, product...)
- Lớp 2: Phân tử — nhóm atoms có quan hệ (order + items)
- Lớp 3: Hợp chất — kết hợp phân tử (workflow instance)
- Lớp 4: Cấu trúc — template/khuôn mẫu quản lý instances
- Lớp 5: Tổ hợp — module/hệ thống con
- Lớp 6: Công trình — toàn bộ hệ thống

**5 Tầng kiến trúc (Điều 5):**
- Tầng 1: Hạ tầng — VPS, PG, Directus, Nuxt, Agent Data, Qdrant
- Tầng 2: Cơ sở — Registries, Metadata, DOT, Fields, Taxonomy
- Tầng 3: Modules nền tảng — Table, Comment, Workflow, CI/CD
- Tầng 4: Chuyên môn — Business logic, domain-specific
- Tầng 5: Giám sát — DOT kiểm tra, system_issues, 2 động cơ

**5 Layer navigation UI:**
- Layer 1: Tổng quan (summary counts)
- Layer 2: Drill-down theo species/facet
- Layer 3: Chi tiết entity
- Layer 4: Quan hệ (dependencies, edges)
- Layer 5: Ma trận (GROUP BY đa chiều)

---

## BƯỚC 1 — NHẬN VIỆC (mỗi mission)

### #10 — 1 PROMPT = 1 VIỆC (🖥️ Desktop)
Desktop soạn 1 prompt = 1 mục tiêu rõ. Không gộp nhiều mission.

### #11 — PROMPT CHUẨN (🖥️ Desktop)
Template: CHECKPOINT → MỤC TIÊU → BƯỚC → VERIFY → SAU DONE.
Quote nguyên tắc + files agent phải đọc.

### #12 — DESKTOP CHECKPOINT TRONG PROMPT (Cả hai)
Desktop ghi các mục đã kiểm tra vào prompt:
✅ Vĩnh viễn: [lý do]
✅ Nhầm: [hạ tầng chặn]
✅ 100% tự động: [cách]
✅ 5 câu thiết kế: [tóm tắt]
✅ Data flow: [chiều nào]
✅ 1 việc: [mục tiêu]
→ CLI đọc → xác nhận hoặc phản biện TRƯỚC khi code.

### #13 — CLI ĐỌC + XÁC NHẬN (🔧 CLI)
Đọc skill + OR + luật qua search_knowledge. Liệt kê files + version.

---

## BƯỚC 2 — NGHĨ TRƯỚC KHI LÀM (thiết kế)

> Khi thiết kế feature/collection MỚI. Fix bug/edit config → N/A + lý do.

### ★ CHECKPOINT: QUY TRÌNH 4 BƯỚC (HP v4.1.0) — TRƯỚC KHI THIẾT KẾ

Trước khi thiết kế hoặc lên roadmap bất kỳ mission nào, ĐI QUA 4 BƯỚC:

| Bước | Câu hỏi | Nếu thiếu |
|------|---------|-----------|
| ① Mục tiêu | Việc này giải quyết vấn đề gì? | Không biết đi đâu |
| ② Phương pháp | Giải quyết bằng cách nào? | Không biết đi bằng gì |
| ③ Điều kiện cần | Hạ tầng đầu vào ĐÃ ĐỦ chưa? | **Roadmap thiếu khả thi** |
| ④ Roadmap | Thứ tự? Phụ thuộc? Chia nhỏ? | Không biết bắt đầu từ đâu |

**Bước ③ checklist điều kiện cần:**
- Collection/table đầu vào đã tồn tại?
- Dữ liệu đầu vào đã có? Ai tạo ra nó?
- DOT liên quan đã deploy + có cron?
- Pivot dòng hiển thị đã có?
- APR flow cho action này đã hoạt động?
- 5 tầng đồng bộ cho đầu vào sẵn sàng?
- Dual-trigger: DOT A kiểm tra đã có?

Nếu bước ③ phát hiện thiếu → DỪNG. Bổ sung điều kiện cần TRƯỚC hoặc điều chỉnh roadmap.

### #14 — TRẢ LỜI 3 CÂU TUYÊN NGÔN CHO MISSION (Cả hai)
1. Vĩnh viễn: giải pháp fix gốc thế nào?
2. Nhầm: hạ tầng chặn cách nào?
3. Tự động: feature chạy không cần người thế nào?
→ CỤ THỂ cho mission. Chung chung = FAIL. Không trả lời = không code.

### #15 — ASSEMBLY GATE Q0 (🔧 CLI)
Q0: PG? → Q1: Directus? → Q2: Nuxt dynamic? → Q3: Nguồn mở? → Q4: Code = cuối.
"Nghĩ bằng PG, làm qua Directus."

### #16 — 5 CÂU THIẾT KẾ SẢN PHẨM (Cả hai)
1. Mô hình tổng thể — bức tranh lớn?
2. Quy trình khép kín — trigger đầu (dual) → hoàn thành?
3. Công cụ đầy đủ — mỗi bước có DOT/script/PG function?
4. Môi trường thực thi — registry/table nào?
5. Nguyên tắc vàng — metadata > code?
→ Câu nào không trả lời = thiết kế chưa xong.

### #17 — KHÔNG CHẮC = DỪNG (🔧 CLI)
Chưa rõ → search_knowledge verify. CẤM đoán.
"Cứ làm đi, sai thì sửa" = CẤM. "Tạo rắc rối 10 phút, dọn dẹp cả tuần."

---

## BƯỚC 3 — CODE (rào chắn)

### #18 — GHI PROGRESS (🔧 CLI)
Tạo file reports/[mission]-progress.md ĐẦU mission. Liệt kê TODO. Tick [x] mỗi bước xong. File này = report cuối + evidence.

### #19 — DOT 100% (🔧 CLI)
Mọi thao tác qua DOT/script. CẤM làm tay. CẤM ALTER TABLE (AP-15). Schema qua Directus Fields API. DOT Cấp B = cổng duy nhất có secret (GSM).

### #20 — DOT THEO CẶP (🔧 CLI)
Cấp B (ghi) PHẢI có Cấp A (kiểm tra). Động cơ chính (thực hiện) + phụ (phát hiện lệch → xử lý + báo cáo).

### #21 — DUAL-TRIGGER (🔧 CLI)
2 triggers: chính (realtime) + phụ (safety net: cron/DOT scan).
1 trigger = chưa xong. Exempt = EXM-NNN (ID + lý do + ngày hết hạn + người duyệt).

### #22 — CẤM HARDCODE + AUTO SCALE (🔧 CLI)
Dynamic mechanism. Thiết kế cho trăm triệu entities. §0-AU.

### #23 — METADATA > CODE (🔧 CLI)
Thay đổi KD = thay đổi config (INSERT/UPDATE). Sửa code = thiết kế tồi → DỪNG, thiết kế lại.

### #24 — NUXT = MÀN HÌNH (🔧 CLI)
Không logic business. Không tạo page riêng (AP-11). readItems fields:['*'] → tự thấy mới.

### #25 — SSOT (🔧 CLI)
Sửa 1 chỗ = thay đổi mọi nơi. Không duplicate. Trỏ về nguồn.

---

## BƯỚC 4 — TRIỂN KHAI (quy trình 2 mũ §0-W)

> Agent chạy TOÀN BỘ. KHÔNG dừng chờ user. MERGE ≠ DONE.

### #26 — MŨ 1 CODER (🔧 CLI)
1. Viết mã, test local trước
2. Push → tạo PR
3. Đợi 4 required XANH. ĐỎ → fix cùng PR, KHÔNG PR mới.

### #27 — MŨ 2 REVIEWER (🔧 CLI)
4. Chuyển mũ: self-review logic
5. Merge (deploy tự động)
6. Đợi deploy XANH. ĐỎ → fix.

### #28 — GỘP 1 PR (🔧 CLI)
Nhiều bước = 1 PR. CI/CD 1 lần. Fail → commit thêm, KHÔNG PR mới (AP-07).

---

## BƯỚC 5 — VERIFY (sau deploy)

### #29 — VERIFY = PASTE OUTPUT THẬT (🔧 CLI)
7. Verify trên vps.incomexsaigoncorp.vn. So khớp PG.
CẤM chỉ ghi "PASS" (AP-02). FAIL → fix theo mục tiêu prompt → quay Mũ 1.
Format: "curl URL → [output]. PG: SELECT count = [N]. KHỚP/SAI."

### #30 — TỰ PHÁT HIỆN + ĐIỀU 31 (🔧 CLI)
Sau done: hệ thống tự biết khi sai? 2 động cơ còn hoạt động? Scanner down > 24h không ai biết = NGUY HIỂM NHẤT. Cần scanner → ghi TD nếu chưa có.

---

## BƯỚC 6 — BÁO CÁO + DỌN DẸP

### #31 — UPDATE OR + TD + HANDOFF (🔧 CLI)
SAU MỖI prompt. BẮT BUỘC. "OR v7.__ updated" hoặc "Không cần — lý do."

### #32 — REPORT (🔧 CLI)
8. Upload tại reports/. Handoff nếu context > 60%.

### #33 — MẪU BÁO CÁO (Cả hai)
Gạch từng bước (0→6) với evidence cụ thể. Thiếu evidence = FAIL.
PHẢI có section "3 câu Tuyên ngôn" với câu trả lời cụ thể.

---

## BƯỚC 7 — DESKTOP REVIEW

### #34 — CHECK TUYÊN NGÔN (🖥️ Desktop)
Agent trả lời 3 câu chưa? Cụ thể? Thuyết phục? Thiếu = trả về.

### #35 — CHECK EVIDENCE (🖥️ Desktop)
Agent paste output thật? Hay chỉ "PASS"? Thiếu = trả về.

### #36 — CHECK UPDATE (🖥️ Desktop)
Agent update OR + TD + handoff chưa? Thiếu = yêu cầu.

---

## MẪU DESKTOP CHECKPOINT TRONG PROMPT

> Desktop ghi ĐẦU mỗi prompt. CLI đọc → xác nhận/phản biện.

✅ Vĩnh viễn: [cụ thể]
✅ Nhầm: [hạ tầng chặn]
✅ 100% tự động: [cách]
✅ Bảo toàn: [ID/quan hệ/metadata]
✅ Assembly Gate: PG=[...], Directus=[...], Nuxt=[dynamic]
✅ 5 câu thiết kế: [tóm tắt 5 câu]
✅ Data flow: [chiều nào]
✅ 1 việc: [mục tiêu duy nhất]

---

## CƯỠNG CHẾ TUÂN THỦ (3 tầng)
- Tầng 1 Gợi ý: Skill nhắc nguyên tắc (~40%)
- Tầng 2 Cấu trúc: Prompt checkpoint + report gạch từng mục + Desktop review (~70%)
- Tầng 3 Hạ tầng: CI gate, PG role, pre-commit hook — KHÔNG THỂ bypass (~95%)
→ Mỗi lần vi phạm → phân tích → thêm gate. "Muốn nhầm cũng không thể."
