# INCOMEX — AGENTS.md

## QUY TẮC #1 — ĐỌC SKILL TRƯỚC
Đọc `.claude/skills/incomex-rules.md` (36 mục, 8 bước).
search_knowledge TRỰC TIẾP main process. CẤM background agent.

## QUY TẮC #2 — LÀM THEO SKILL
- Bước 0: nền tảng (3 câu tuyên ngôn + 9 nguyên tắc)
- Bước 1-2: đọc + thiết kế TRƯỚC khi code
- Bước 3: code (rào chắn: DOT 100%, dual-trigger, metadata>code)
- Bước 4-5: 2 mũ + verify production PASTE OUTPUT THẬT
- Bước 6: report gạch từng bước + evidence. Thiếu evidence = FAIL.
- MERGE ≠ DONE. Chỉ DONE khi verify production PASS.

## BẮT BUỘC
1. Đọc OR: search_knowledge("operating rules SSOT")
2. Đọc Hiến pháp: search_knowledge("hiến pháp v4.0 constitution")
3. Đọc luật liên quan đến mission
4. Tuân thủ 36 mục trong .claude/skills/incomex-rules.md
5. Report tại knowledge/current-state/reports/

## QUY TRÌNH
Quy trình 2 mũ (§0-W) = BẮT BUỘC. MERGE ≠ DONE.
Chi tiết 8 bước: xem .claude/skills/incomex-rules.md

## CẤM
- ALTER TABLE trực tiếp
- Code logic trong Nuxt
- INSERT SQL tay (phải qua DOT)
- Viện dẫn DFL v1.1 hoặc Hiến pháp v3.9
- Background agent / Task
- Chỉ ghi "PASS" không paste output (AP-02)

## TECH STACK
- PG 16 DUY NHẤT (MySQL RETIRED)
- Directus CMS + API
- Nuxt 3 (chỉ đọc)
- Agent Data + Qdrant
- VPS Contabo EU, Docker
