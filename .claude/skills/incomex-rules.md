# INCOMEX SYSTEM RULES — v4.0 (S148 BAN HÀNH)

> ĐỌC TOÀN BỘ FILE NÀY TRƯỚC KHI LÀM BẤT CỨ GÌ.
> Vi phạm bất kỳ checkpoint nào = PR REJECT. Không ngoại lệ.

---

## CHECKPOINT — ĐẾM TỪNG MỤC (18 điểm)

Mỗi mission/prompt, bạn PHẢI tự đếm: "✅ CP-01 done, ✅ CP-02 done..."
Thiếu bất kỳ CP nào trong report = CHƯA HOÀN THÀNH.

### TRƯỚC KHI LÀM (CP-01 → CP-05)

- [ ] **CP-01: ĐỌC LUẬT.** search_knowledge TRỰC TIẾP MAIN PROCESS:
  - "hiến pháp v4.0 constitution 9 nguyên tắc"
  - "operating rules SSOT"
  - Luật liên quan đến mission (Điều 26? Điều 0-H? ...)
  - Anti-patterns
  - **TUYỆT ĐỐI KHÔNG background agent, KHÔNG Task, KHÔNG delegate.**

- [ ] **CP-02: QUOTE OR.** Ghi version OR đã đọc (vd: "OR v7.16").

- [ ] **CP-03: ASSEMBLY GATE.** Tự hỏi 5 câu:
  ```
  Q0: "PG đã giải quyết chưa?"
  Q1: "Directus có sẵn không?"
  Q2: "Nuxt/Agency OS có sẵn không?"
  Q3: "Nguồn mở?"
  Q4: "Code mới?" → CHỈ KHI Q0-Q3 = KHÔNG
  ```

- [ ] **CP-04: TUYÊN NGÔN.** Tự hỏi 3 câu:
  - "Nếu ngày mai thay đổi, vấn đề còn xảy ra không?" CÒN = sọt rác.
  - "Agent mới vào, có thể làm nhầm không?" CÓ = chặn hạ tầng.
  - "Đang fix triệu chứng hay fix gốc?" Triệu chứng = CẤM.

- [ ] **CP-05: KHÔNG CHẮC = DỪNG.** Nếu không chắc bước nào → DỪNG + hỏi user. KHÔNG "cứ làm đi".

### TRONG KHI LÀM (CP-06 → CP-13)

- [ ] **CP-06: PG TRƯỚC.** Mọi logic/data = PG function/view/trigger. KHÔNG code Nuxt logic.
- [ ] **CP-07: DIRECTUS API.** Schema change = Directus Fields/Collections API qua DOT Cấp B. CẤM ALTER TABLE.
- [ ] **CP-08: NUXT = MÀN HÌNH.** readItems ONLY. KHÔNG reduce(), KHÔNG synthetic rows, KHÔNG hardcode.
- [ ] **CP-09: DOT 100%.** Mọi thao tác qua DOT. KHÔNG INSERT/UPDATE SQL tay. KHÔNG thao tác Directus Admin tay.
- [ ] **CP-10: DUAL-TRIGGER.** Mỗi data path = trigger chính (PG trigger/webhook) + trigger phụ (cron/DOT).
- [ ] **CP-11: 5 TẦNG.** Thay đổi phải đồng bộ: PG → Directus → Nuxt → Agent Data → Qdrant.
- [ ] **CP-12: KHAI SINH.** Entity mới → birth_registry (Điều 0-G). Collection mới → collection_registry (Điều 2).
- [ ] **CP-13: DOT THEO CẶP.** DOT ghi (Cấp B) PHẢI có DOT kiểm tra (Cấp A) tương ứng.

### SAU KHI LÀM (CP-14 → CP-18)

- [ ] **CP-14: VERIFY PRODUCTION.** URL production → data KHỚP PG. Ghi evidence: "URL: [url] — hiện [giá trị]. PG: [giá trị]. KHỚP."
- [ ] **CP-15: DOT HEALTH.** Chạy DOT kiểm tra liên quan → PASS. DOT kiểm tra IDLE = thiết kế tốt.
- [ ] **CP-16: REPORT.** Lưu tại knowledge/current-state/reports/. Ghi rõ CP nào PASS.
- [ ] **CP-17: UPDATE SSOT.** OR + TD + handoff cập nhật. Version OR tăng.
- [ ] **CP-18: TUYÊN NGÔN CUỐI.** "Thêm entity mới ngày mai → cần sửa code không?" KHÔNG = ✅. CẦN = thiết kế SAI → làm lại.

---

## 9 NGUYÊN TẮC NỀN TẢNG

| # | Tên | Checkpoint liên quan |
|---|-----|---------------------|
| 1 | SSOT | CP-06 (PG trước) |
| 2 | Tự động 100% | CP-09 (DOT 100%) |
| 3 | DOT 100% | CP-09, CP-13 |
| 4 | Sẵn sàng thay đổi | CP-04, CP-18 |
| 5 | Tự phát hiện | CP-13 (DOT theo cặp), CP-15 |
| 6 | 5 tầng — CẤM code Nuxt | CP-08, CP-11 |
| 7 | Dual-trigger | CP-10 |
| 8 | Assembly First | CP-03, CP-06 |
| 9 | Không chắc = Sai | CP-05 |

## QUICK REF

- Hiến pháp: knowledge/dev/laws/constitution.md
- 9 Nguyên tắc: knowledge/dev/laws/law-01-foundation-principles.md
- OR SSOT: knowledge/dev/ssot/operating-rules.md
- Điều 26 Pivot: knowledge/dev/architecture/dieu26-new-registries-counting-law-draft.md
- Anti-patterns: knowledge/dev/ssot/anti-patterns.md
- Reports: knowledge/current-state/reports/

## QUY TRÌNH 2 MŨ (§0-W) — BẮT BUỘC MỌI MISSION

### MŨ 1 — CODER
1. Viết mã (test local trước)
2. Push → Tạo PR
3. Đợi 4 required checks XANH
   - ĐỎ → tự fix → commit thêm vào CÙNG PR → đợi lại
   - KHÔNG tạo PR mới

### MŨ 2 — REVIEWER
4. Chuyển mũ: xem lại logic lần cuối (self-review)
5. Merge (deploy tự động qua CI/CD)
6. Đợi deploy CI XANH
   - ĐỎ → tự fix → commit thêm
7. Verify production: curl/browser kiểm tra trên vps.incomexsaigoncorp.vn
   - KHÔNG ĐẠT → tự fix theo mục tiêu của prompt gốc → quay lại bước 2
8. Báo cáo tại reports/

> MERGE ≠ DONE. Chỉ DONE khi verify production PASS.
> Agent thực hiện TOÀN BỘ 8 bước. KHÔNG dừng giữa chừng chờ user.

### 2 MŨ PHÂN CÔNG
```
Mũ 1 — SOẠN: Desktop đọc luật + thiết kế + soạn prompt
Mũ 2 — LÀM: CLI đọc prompt + thực thi + verify + report
```
Desktop KHÔNG code. CLI KHÔNG thiết kế. Mỗi lần 1 prompt duy nhất.

## GỘP BƯỚC

Khi có thể: gộp nhiều bước vào 1 PR. Verify local trước push. CI/CD 1 lần.
Fail → commit thêm KHÔNG PR mới.

## PROMPT TEMPLATE (mẫu S153)

Khi Desktop soạn prompt cho CLI agent, dùng cấu trúc:

### [MÃ MISSION] — [TÊN NGẮN]

#### CHECKPOINT
> [Quote OR hoặc nguyên tắc liên quan]
> Đọc: [danh sách files agent PHẢI đọc trước khi code]

#### MỤC TIÊU
[1-2 câu: việc gì, kết quả mong đợi]

#### CÁC BƯỚC
[Liệt kê cụ thể từng bước. Bao gồm cả quy trình 2 mũ ở cuối]

#### VERIFY
[Điều kiện PASS cụ thể: URL nào, giá trị gì, khớp PG hay không]

#### SAU KHI DONE
- Update OR nếu cần
- Upload report tại reports/
- Handoff nếu context > 60%

---

## CẤM

- CẤM --admin bypass CI
- CẤM ALTER TABLE trực tiếp
- CẤM code logic trong Nuxt
- CẤM INSERT/UPDATE SQL tay (phải qua DOT)
- CẤM background agent / Task
- CẤM "cứ làm đi sai thì sửa"
- CẤM viện dẫn DFL v1.1 hoặc Hiến pháp v3.9
