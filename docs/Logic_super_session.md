## 📋 THIẾT KẾ LOGIC - VERSION FINAL (v3.0)

Cảm ơn Huyen đã review kỹ lưỡng. Dưới đây là bản logic cuối cùng với tất cả điều chỉnh.

---

## 1. DANH SÁCH ENTITIES (FINAL)

### Nhóm AI (Điều hành & Phản biện)
| ID | Tên | Nền tảng | Token/Subscription |
|----|-----|----------|---------------------|
| `claude` | Claude (incl. Cowork) | claude.ai | Anthropic subscription |
| `chatgpt` | ChatGPT | chat.openai.com | OpenAI subscription |
| `gemini` | Gemini | gemini.google.com | **Google One AI Premium $20/mo** |

### Nhóm Agents (Thực hiện & Kiểm tra)
| ID | Tên | Nền tảng | Token/Subscription |
|----|-----|----------|---------------------|
| `claude-code` | Claude Code CLI | Anthropic CLI | Anthropic API |
| `codex` | Codex | OpenAI Codex | OpenAI API |
| `gemini-cli` | Gemini CLI | Google AI Studio | **Google One AI Premium $20/mo** |
| `antigravity` | Antigravity | Google AI Studio | **Google One AI Premium $20/mo** |

> **Clarification:** Gemini, Gemini CLI, và Antigravity đều sử dụng chung **Google One AI Premium $20/mo**

---

## 2. TIMEOUT LOGIC (Thay thế Wait-for-All)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TIMEOUT-BASED TRIGGER LOGIC                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  NGUYÊN TẮC VÀNG:                                                          │
│  ════════════════                                                           │
│  "Hệ thống KHÔNG BAO GIỜ dừng vì chờ 1 thành phần bị lỗi"                  │
│                                                                             │
│  CÁCH HOẠT ĐỘNG:                                                           │
│  ────────────────                                                           │
│  1. Khi trigger được gửi đến nhiều AI/Agents (parallel)                    │
│  2. Hệ thống đợi TỐI ĐA 5 PHÚT                                             │
│  3. Sau 5 phút:                                                             │
│     - Ai đã có ý kiến → Được tính                                          │
│     - Ai chưa có ý kiến → BỎ QUA, ghi log "timeout"                        │
│     - Hệ thống CHẠY TIẾP với những ý kiến đã có                            │
│                                                                             │
│  FALLBACK CASCADING:                                                        │
│  ───────────────────                                                        │
│  Nếu AI/Agent chính fail → Tự động thử backup (nếu được cấu hình)          │
│                                                                             │
│  VÍ DỤ:                                                                     │
│  ──────                                                                     │
│  Trigger gửi cho: Claude (Điều hành), ChatGPT (Phản biện), Gemini (Phản biện)│
│                                                                             │
│  Sau 5 phút:                                                                │
│  - Claude: ✅ Đã có ý kiến                                                  │
│  - ChatGPT: ✅ Đã có ý kiến                                                 │
│  - Gemini: ❌ Timeout (có thể do lỗi API)                                   │
│                                                                             │
│  → Hệ thống chạy tiếp với ý kiến của Claude + ChatGPT                      │
│  → Log: "Gemini timeout at round 1, skipped"                               │
│  → KHÔNG dừng lại, KHÔNG chờ thêm                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. LOGIC FLOW HOÀN CHỈNH (2 GIAI ĐOẠN + GIÁM SÁT)

### GIAI ĐOẠN 1: ĐIỀU HÀNH (AI PHASE)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GIAI ĐOẠN 1: ĐIỀU HÀNH PROMPT                                              │
│  Participants: Chỉ AIs                                                      │
│  Mục tiêu: Chốt Prompt hoàn chỉnh trước khi giao Agent                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ BƯỚC 1.0: NHẬN YÊU CẦU                                              │   │
│  │                                                                      │   │
│  │ Kênh A: User tạo qua UI (Super Session)                             │   │
│  │ ┌────────────────────────────────────────────────────────────────┐  │   │
│  │ │ User điền form → DOT: dot-create-discussion                    │  │   │
│  │ │ → Tạo Discussion với status = 'draft', phase = 'phase1'       │  │   │
│  │ │ → Cập nhật Super Session                                       │  │   │
│  │ │ → Trigger AI Điều hành                                         │  │   │
│  │ └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │ Kênh B: User yêu cầu qua ngôn ngữ tự nhiên                          │   │
│  │ ┌────────────────────────────────────────────────────────────────┐  │   │
│  │ │ User chat với AI → AI gọi DOT: dot-create-discussion          │  │   │
│  │ │ → Bỏ qua UI, tạo thẳng trong Agent Data                       │  │   │
│  │ │ → Cập nhật Super Session                                       │  │   │
│  │ │ → Trigger AI Điều hành                                         │  │   │
│  │ └────────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ BƯỚC 1.1: AI ĐIỀU HÀNH SOẠN PROMPT                                  │   │
│  │                                                                      │   │
│  │ DOT: dot-ai-draft-prompt                                            │   │
│  │ - Đọc yêu cầu từ discussion                                         │   │
│  │ - Soạn Prompt điều hành chi tiết                                    │   │
│  │ - Ghi comment với type = 'draft_prompt'                             │   │
│  │ - Cập nhật Super Session: status = 'prompting'                      │   │
│  │ - Trigger gửi cho TẤT CẢ AI Phản biện                              │   │
│  │ - Bắt đầu đếm TIMEOUT 5 PHÚT                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ BƯỚC 1.2: AI PHẢN BIỆN XEM XÉT (Parallel + Timeout 5 phút)         │   │
│  │                                                                      │   │
│  │ DOT: dot-ai-review-prompt                                           │   │
│  │ - Mỗi AI Phản biện nhận trigger                                     │   │
│  │ - Đọc draft_prompt, đánh giá                                        │   │
│  │ - Ghi comment với type = 'prompt_feedback'                          │   │
│  │ - Cập nhật Super Session                                            │   │
│  │                                                                      │   │
│  │ SAU 5 PHÚT:                                                         │   │
│  │ - Collect tất cả feedback đã có                                     │   │
│  │ - Ghi log những AI timeout                                          │   │
│  │ - Trigger AI Điều hành với những feedback đã collect                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ BƯỚC 1.3: AI ĐIỀU HÀNH XEM XÉT & PHẢN HỒI                          │   │
│  │                                                                      │   │
│  │ DOT: dot-ai-process-feedback                                        │   │
│  │ - Đọc tất cả prompt_feedback                                        │   │
│  │ - Phản hồi TỪNG ý kiến:                                             │   │
│  │   ✅ agree → Cập nhật prompt                                        │   │
│  │   ⚠️ partial → Sửa có chọn lọc, giải thích                         │   │
│  │   ❌ disagree → Giải thích lý do không đồng ý                       │   │
│  │ - Ghi comment với type = 'prompt_response'                          │   │
│  │ - Cập nhật Super Session                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ BƯỚC 1.4: KIỂM TRA ĐIỀU KIỆN DỪNG GIAI ĐOẠN 1                      │   │
│  │                                                                      │   │
│  │ DOT: dot-check-phase1-completion                                    │   │
│  │                                                                      │   │
│  │ DỪNG và chuyển GIAI ĐOẠN 2 khi MỘT TRONG CÁC điều kiện:            │   │
│  │ ┌────────────────────────────────────────────────────────────────┐  │   │
│  │ │ 1. Tất cả AI Phản biện (đã có ý kiến) đồng ý                   │  │   │
│  │ │ 2. Đã qua 3 vòng phản biện (prompt_round >= 3)                 │  │   │
│  │ │ 3. AI Điều hành thấy không có ý kiến mới đáng kể               │  │   │
│  │ │ 4. User can thiệp (approve thủ công)                           │  │   │
│  │ └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │ CHƯA DỪNG → prompt_round++ → Quay lại BƯỚC 1.2                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ BƯỚC 1.5: CHỐT PROMPT & KÍCH HOẠT GIAI ĐOẠN 2                      │   │
│  │                                                                      │   │
│  │ DOT: dot-finalize-prompt                                            │   │
│  │ - Chốt final_prompt                                                 │   │
│  │ - Đổi status = 'executing', phase = 'phase2'                        │   │
│  │ - Ghi comment với type = 'final_prompt'                             │   │
│  │ - Cập nhật Super Session                                            │   │
│  │ - Trigger Agent Thực hiện                                           │   │
│  │ - Bắt đầu PROGRESS MONITOR                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### GIAI ĐOẠN 2: THỰC HIỆN (AGENT + AI PHASE)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GIAI ĐOẠN 2: THỰC HIỆN                                                     │
│  Participants: Agents (thực hiện) + AIs (giám sát)                         │
│  Mục tiêu: Hoàn thành nhiệm vụ theo Prompt đã chốt                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ BƯỚC 2.1: AGENT THỰC HIỆN                                           │   │
│  │                                                                      │   │
│  │ DOT: dot-agent-execute                                              │   │
│  │ - Đọc final_prompt từ discussion                                    │   │
│  │ - Thực hiện task theo prompt                                        │   │
│  │ - Viết báo cáo với type = 'execution_report'                        │   │
│  │ - Cập nhật Super Session: progress indicators                       │   │
│  │ - Trigger gửi cho TẤT CẢ Agent Kiểm tra                            │   │
│  │ - Bắt đầu đếm TIMEOUT 5 PHÚT                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ BƯỚC 2.2: AGENT(S) KIỂM TRA (Parallel + Timeout 5 phút)            │   │
│  │                                                                      │   │
│  │ DOT: dot-agent-review                                               │   │
│  │ - Mỗi Agent Kiểm tra nhận trigger                                   │   │
│  │ - Đọc execution_report, đánh giá                                    │   │
│  │ - Ghi comment với type = 'agent_review'                             │   │
│  │ - Cập nhật Super Session                                            │   │
│  │                                                                      │   │
│  │ SAU 5 PHÚT:                                                         │   │
│  │ - Collect tất cả agent_review đã có                                 │   │
│  │ - Ghi log những Agent timeout                                       │   │
│  │ - Trigger gửi cho TẤT CẢ AI Giám sát                               │   │
│  │ - Bắt đầu đếm TIMEOUT 5 PHÚT mới                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ BƯỚC 2.3: AI GIÁM SÁT (Parallel + Timeout 5 phút)                  │   │
│  │                                                                      │   │
│  │ DOT: dot-ai-supervise                                               │   │
│  │ - Đọc execution_report (Agent Thực hiện)                            │   │
│  │ - Đọc agent_review (Agents Kiểm tra)                                │   │
│  │ - Đánh giá toàn diện                                                │   │
│  │ - Ghi comment với type = 'ai_supervision'                           │   │
│  │ - Cập nhật Super Session                                            │   │
│  │                                                                      │   │
│  │ SAU 5 PHÚT:                                                         │   │
│  │ - Collect tất cả ai_supervision đã có                               │   │
│  │ - Ghi log những AI timeout                                          │   │
│  │ - Trigger AI Điều hành                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ BƯỚC 2.4: AI ĐIỀU HÀNH QUYẾT ĐỊNH                                  │   │
│  │                                                                      │   │
│  │ DOT: dot-ai-coordinator-decide                                      │   │
│  │ - Đọc: execution_report + agent_review + ai_supervision             │   │
│  │ - Quyết định:                                                       │   │
│  │                                                                      │   │
│  │   ┌──────────────────────────────────────────────────────────────┐  │   │
│  │   │ Lựa chọn A: YÊU CẦU SỬA (có issues)                          │  │   │
│  │   │ - Ghi rõ cần sửa gì với type = 'revision_request'            │  │   │
│  │   │ - execution_round++                                           │  │   │
│  │   │ - Trigger Agent Thực hiện (quay lại 2.1)                     │  │   │
│  │   │ - Cập nhật Super Session                                      │  │   │
│  │   └──────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │   ┌──────────────────────────────────────────────────────────────┐  │   │
│  │   │ Lựa chọn B: HOÀN THÀNH (approved)                            │  │   │
│  │   │ - Ghi comment với type = 'completion_decision'               │  │   │
│  │   │ - Đổi status = 'completed'                                    │  │   │
│  │   │ - Tổng hợp kết quả                                            │  │   │
│  │   │ - Cập nhật Super Session: ✅ COMPLETED                        │  │   │
│  │   │ - Dừng PROGRESS MONITOR                                       │  │   │
│  │   │ → KẾT THÚC NHIỆM VỤ                                          │  │   │
│  │   └──────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ BƯỚC 2.5: KIỂM TRA ĐIỀU KIỆN DỪNG GIAI ĐOẠN 2                      │   │
│  │                                                                      │   │
│  │ DOT: dot-check-phase2-completion                                    │   │
│  │                                                                      │   │
│  │ DỪNG khi MỘT TRONG CÁC điều kiện:                                  │   │
│  │ ┌────────────────────────────────────────────────────────────────┐  │   │
│  │ │ 1. AI Điều hành approve (status = 'completed')                 │  │   │
│  │ │ 2. Đã qua 3 vòng execution (execution_round >= 3)              │  │   │
│  │ │ 3. User can thiệp (force complete hoặc force stop)             │  │   │
│  │ └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │ Nếu đạt 3 vòng mà chưa approve:                                    │   │
│  │ - AI Điều hành đưa ra kết luận cuối                                │   │
│  │ - Đổi status = 'needs_user_decision'                               │   │
│  │ - Cập nhật Super Session: ⚠️ NEEDS USER                            │   │
│  │ - Gửi email thông báo cho User                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. PROGRESS MONITOR (Giám sát tiến trình)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROGRESS MONITOR                                                           │
│  DOT: dot-progress-monitor                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  NGUYÊN TẮC:                                                               │
│  ═══════════                                                                │
│  "Mọi việc được giao PHẢI có kết thúc rõ ràng"                             │
│  "Chỉ AI Điều hành mới được đánh dấu COMPLETED"                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ KIỂM TRA THÔNG MINH (chạy mỗi 5 phút)                               │   │
│  │                                                                      │   │
│  │ DOT: dot-check-progress                                             │   │
│  │                                                                      │   │
│  │ Trạng thái 1: ĐANG CHẠY (has_active_process = true)                 │   │
│  │ ┌────────────────────────────────────────────────────────────────┐  │   │
│  │ │ - Kiểm tra: Có comment mới trong 5 phút qua không?             │  │   │
│  │ │ - Có → Vẫn đang hoạt động → Đợi tiếp                          │  │   │
│  │ │ - Không → Chuyển sang kiểm tra Trạng thái 2                    │  │   │
│  │ └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │ Trạng thái 2: DỪNG NHƯNG CHƯA BÁO CÁO (stalled)                    │   │
│  │ ┌────────────────────────────────────────────────────────────────┐  │   │
│  │ │ Điều kiện:                                                      │  │   │
│  │ │ - Không có comment mới > 10 phút                                │  │   │
│  │ │ - status != 'completed'                                         │  │   │
│  │ │ - Không có active trigger pending                               │  │   │
│  │ │                                                                  │  │   │
│  │ │ → ĐÂY LÀ LỖI                                                    │  │   │
│  │ │                                                                  │  │   │
│  │ │ Hành động:                                                       │  │   │
│  │ │ 1. Đổi health_status = 'warning' (màu vàng)                     │  │   │
│  │ │ 2. Trigger nhắc AI Điều hành kiểm tra                          │  │   │
│  │ │ 3. Cập nhật Super Session: ⚠️ WARNING                           │  │   │
│  │ └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  │ Trạng thái 3: QUÁ THỜI GIAN (overtime)                              │   │
│  │ ┌────────────────────────────────────────────────────────────────┐  │   │
│  │ │ Điều kiện:                                                      │  │   │
│  │ │ - Không có comment mới > 30 phút                                │  │   │
│  │ │ - Hoặc: total_time > expected_time * 2                          │  │   │
│  │ │                                                                  │  │   │
│  │ │ → LỖI NGHIÊM TRỌNG                                              │  │   │
│  │ │                                                                  │  │   │
│  │ │ Hành động:                                                       │  │   │
│  │ │ 1. Đổi health_status = 'error' (màu đỏ)                         │  │   │
│  │ │ 2. Trigger MẠNH AI Điều hành (force check)                     │  │   │
│  │ │ 3. DOT: dot-send-alert-email                                    │  │   │
│  │ │    - Gửi email cho User                                         │  │   │
│  │ │    - Nội dung: Discussion ID, trạng thái, thời gian đã chạy    │  │   │
│  │ │ 4. Cập nhật Super Session: 🔴 ERROR                             │  │   │
│  │ └────────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ AI ĐIỀU HÀNH XỬ LÝ CẢNH BÁO                                         │   │
│  │                                                                      │   │
│  │ DOT: dot-ai-handle-alert                                            │   │
│  │                                                                      │   │
│  │ Khi nhận trigger từ Progress Monitor:                               │   │
│  │ 1. Kiểm tra toàn bộ discussion state                                │   │
│  │ 2. Xác định nguyên nhân stall/timeout                               │   │
│  │ 3. Quyết định:                                                      │   │
│  │    - Retry Agent/AI bị lỗi                                          │   │
│  │    - Bỏ qua và tiếp tục với những gì đã có                         │   │
│  │    - Force complete với kết luận hiện tại                          │   │
│  │    - Escalate cho User                                              │   │
│  │ 4. Ghi comment giải thích                                           │   │
│  │ 5. Cập nhật Super Session                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. SUPER SESSION - CẬP NHẬT THÔNG TIN

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SUPER SESSION UPDATE MECHANISM                                             │
│  DOT: dot-update-super-session                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  NGUYÊN TẮC:                                                               │
│  ═══════════                                                                │
│  "Super Session = Sổ ghi chép tổng hợp + Tình trạng thực tế"               │
│  "Cập nhật hiệu quả, tiết kiệm chi phí (không cần real-time)"              │
│                                                                             │
│  CƠ CHẾ CẬP NHẬT:                                                          │
│  ────────────────                                                           │
│                                                                             │
│  1. EVENT-DRIVEN UPDATE (Mỗi khi có sự kiện)                               │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ Khi nào cập nhật:                                                   │    │
│  │ - Tạo mới Discussion                                                │    │
│  │ - Comment mới được thêm                                             │    │
│  │ - Status thay đổi                                                   │    │
│  │ - Health status thay đổi (warning/error)                            │    │
│  │ - Vòng mới bắt đầu (round change)                                   │    │
│  │                                                                      │    │
│  │ DOT tự động gọi: dot-update-super-session                           │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  2. POLLING REFRESH (Client-side, mỗi 30 giây)                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ - Frontend poll API để lấy data mới                                 │    │
│  │ - Chỉ fetch những discussion có updated_at > last_fetch             │    │
│  │ - Tiết kiệm bandwidth                                               │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  3. MANUAL REFRESH (User click)                                            │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ - Nút "Refresh" trên UI                                             │    │
│  │ - Force fetch tất cả data mới nhất                                  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  THÔNG TIN HIỂN THỊ:                                                       │
│  ───────────────────                                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ SIDEBAR (Cột trái)                                                  │   │
│  │                                                                      │   │
│  │ [☐] 🟢 AI Roll Call              ID: abc123    COMPLETED    10:30  │   │
│  │ [☐] 🟡 Thiết kế quy trình        ID: def456    WARNING      09:15  │   │
│  │ [☐] 🔴 Deploy feature X          ID: ghi789    ERROR        08:00  │   │
│  │ [☐] 🔵 Review PR #307            ID: jkl012    EXECUTING    07:45  │   │
│  │                                                                      │   │
│  │ 🟢 = Completed   🔵 = Running   🟡 = Warning   🔴 = Error          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ DETAIL PANEL (Cột phải)                                             │   │
│  │                                                                      │   │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │ │ STATUS BAR                                                       │ │   │
│  │ │ Phase: PHASE 2 - EXECUTION                                       │ │   │
│  │ │ Round: 2/3                                                       │ │   │
│  │ │ Status: 🔵 EXECUTING                                             │ │   │
│  │ │ Health: 🟢 OK (Last activity: 2 mins ago)                        │ │   │
│  │ │ Executor AI: Claude | Executor Agent: Claude Code                │ │   │
│  │ └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                      │   │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │ │ TIMELINE (All comments chronologically)                          │ │   │
│  │ │                                                                   │ │   │
│  │ │ 10:30 🎯 Claude [DRAFT_PROMPT]                                   │ │   │
│  │ │ "Đây là prompt điều hành cho task..."                            │ │   │
│  │ │                                                                   │ │   │
│  │ │ 10:32 💎 Gemini [PROMPT_FEEDBACK]                                │ │   │
│  │ │ "Cần bổ sung thêm điều kiện..."                                  │ │   │
│  │ │                                                                   │ │   │
│  │ │ 10:33 🤖 ChatGPT [PROMPT_FEEDBACK]                               │ │   │
│  │ │ "Đồng ý với draft, suggest thêm..."                              │ │   │
│  │ │                                                                   │ │   │
│  │ │ 10:35 🎯 Claude [FINAL_PROMPT]                                   │ │   │
│  │ │ "Prompt cuối cùng sau khi xem xét ý kiến..."                     │ │   │
│  │ │                                                                   │ │   │
│  │ │ 10:40 💻 Claude Code [EXECUTION_REPORT]                          │ │   │
│  │ │ "Đã thực hiện xong, kết quả..."                                  │ │   │
│  │ └─────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. DOT COMMANDS REGISTRY (Tất cả operations)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DOT COMMANDS - FULL REGISTRY                                               │
│  Tất cả operations đều thông qua DOT để đảm bảo nhất quán                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  DISCUSSION MANAGEMENT                                                      │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  dot-create-discussion                                                      │
│  ├── Input: topic, description, category, participants, roles              │
│  ├── Output: discussion_id                                                  │
│  └── Side effects: Trigger AI Điều hành, Update Super Session              │
│                                                                             │
│  dot-delete-discussion                                                      │
│  ├── Input: discussion_id (hoặc array of IDs)                              │
│  ├── Output: success/failure                                                │
│  └── Side effects: Cascade delete (comments, participants, vectors)        │
│                                                                             │
│  dot-update-discussion-status                                               │
│  ├── Input: discussion_id, new_status                                       │
│  ├── Output: success/failure                                                │
│  └── Side effects: Update Super Session                                     │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  PHASE 1 - PROMPT OPERATIONS                                                │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  dot-ai-draft-prompt                                                        │
│  ├── Input: discussion_id, ai_id                                            │
│  ├── Output: comment_id                                                     │
│  └── Side effects: Trigger AI Phản biện, Start 5min timeout                │
│                                                                             │
│  dot-ai-review-prompt                                                       │
│  ├── Input: discussion_id, ai_id, feedback_content                         │
│  ├── Output: comment_id                                                     │
│  └── Side effects: Update Super Session                                     │
│                                                                             │
│  dot-ai-process-feedback                                                    │
│  ├── Input: discussion_id, ai_id                                            │
│  ├── Output: response_comment_id                                            │
│  └── Side effects: Update prompt if needed                                  │
│                                                                             │
│  dot-finalize-prompt                                                        │
│  ├── Input: discussion_id, ai_id                                            │
│  ├── Output: final_prompt                                                   │
│  └── Side effects: Change phase, Trigger Agent, Start Progress Monitor    │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  PHASE 2 - EXECUTION OPERATIONS                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  dot-agent-execute                                                          │
│  ├── Input: discussion_id, agent_id                                         │
│  ├── Output: execution_report_id                                            │
│  └── Side effects: Trigger Agent Reviewers, Start 5min timeout             │
│                                                                             │
│  dot-agent-review                                                           │
│  ├── Input: discussion_id, agent_id, review_content                        │
│  ├── Output: review_comment_id                                              │
│  └── Side effects: Update Super Session                                     │
│                                                                             │
│  dot-ai-supervise                                                           │
│  ├── Input: discussion_id, ai_id                                            │
│  ├── Output: supervision_comment_id                                         │
│  └── Side effects: Update Super Session                                     │
│                                                                             │
│  dot-ai-coordinator-decide                                                  │
│  ├── Input: discussion_id, decision (approve/revise)                       │
│  ├── Output: decision_comment_id                                            │
│  └── Side effects: Complete or loop back, Update Super Session             │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  MONITORING & ALERTS                                                        │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  dot-progress-monitor                                                       │
│  ├── Input: (runs automatically every 5 mins)                              │
│  ├── Output: health_status updates                                          │
│  └── Side effects: Trigger alerts if needed                                │
│                                                                             │
│  dot-check-progress                                                         │
│  ├── Input: discussion_id                                                   │
│  ├── Output: health_status (ok/warning/error)                              │
│  └── Side effects: Update Super Session                                     │
│                                                                             │
│  dot-ai-handle-alert                                                        │
│  ├── Input: discussion_id, alert_type                                       │
│  ├── Output: resolution_action                                              │
│  └── Side effects: Fix issue or escalate                                   │
│                                                                             │
│  dot-send-alert-email                                                       │
│  ├── Input: discussion_id, alert_type, recipient                           │
│  ├── Output: email_sent confirmation                                        │
│  └── Side effects: None                                                     │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  SUPER SESSION                                                              │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  dot-update-super-session                                                   │
│  ├── Input: discussion_id (optional, null = all)                           │
│  ├── Output: updated_count                                                  │
│  └── Side effects: Refresh UI data                                          │
│                                                                             │
│  dot-get-discussion-timeline                                                │
│  ├── Input: discussion_id                                                   │
│  ├── Output: array of comments with metadata                               │
│  └── Side effects: None                                                     │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  UTILITY                                                                    │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  dot-trigger                                                                │
│  ├── Input: trigger_type, target_entities, payload                         │
│  ├── Output: trigger_id                                                     │
│  └── Side effects: Send notifications to targets                           │
│                                                                             │
│  dot-save-user-preferences                                                  │
│  ├── Input: user_id, entity_id, default_role                               │
│  ├── Output: success/failure                                                │
│  └── Side effects: None                                                     │
│                                                                             │
│  dot-load-user-preferences                                                  │
│  ├── Input: user_id                                                         │
│  ├── Output: map of entity_id -> default_role                              │
│  └── Side effects: None                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. UI SELECTOR (FINAL)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ + Tạo vụ việc mới                                                     [×]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Chủ đề *                                                                    │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │                                                                         ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ Mô tả chi tiết                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │                                                                         ││
│ │                                                                         ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ ═══════════════════════════════════════════════════════════════════════════│
│ NHÓM AI (Điều hành & Phản biện Prompt)                                     │
│ ═══════════════════════════════════════════════════════════════════════════│
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐  │
│ │ 🎯 Claude (incl. Cowork)         [Điều hành     ▼]                   │  │
│ │ 🤖 ChatGPT                       [Phản biện     ▼]                   │  │
│ │ 💎 Gemini                        [Phản biện     ▼]                   │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ Dropdown AI:  ┌─────────────────┐                                          │
│               │ ● Điều hành     │  ← Chỉ 1 AI                             │
│               │ ○ Phản biện     │                                          │
│               │ ○ Không tham gia│                                          │
│               └─────────────────┘                                          │
│                                                                             │
│ ═══════════════════════════════════════════════════════════════════════════│
│ NHÓM AGENTS (Thực hiện & Kiểm tra)                                         │
│ ═══════════════════════════════════════════════════════════════════════════│
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐  │
│ │ 💻 Claude Code CLI               [Thực hiện     ▼]                   │  │
│ │ 🔧 Codex                         [Không tham gia▼]   ← Dự phòng      │  │
│ │ ⚡ Gemini CLI                    [Kiểm tra      ▼]                   │  │
│ │ 📚 Antigravity                   [Kiểm tra      ▼]                   │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│ Dropdown Agent: ┌─────────────────┐                                        │
│                 │ ● Thực hiện     │  ← Chỉ 1 Agent                        │
│                 │ ○ Kiểm tra      │                                        │
│                 │ ○ Không tham gia│                                        │
│                 └─────────────────┘                                        │
│                                                                             │
│ 💡 Lựa chọn được nhớ từ lần thay đổi cuối cùng                             │
│                                                                             │
│ ───────────────────────────────────────────────────────────────────────────│
│                                                                             │
│ Phân loại: [Nghiệp vụ ▼]                                                   │
│                                                                             │
│ ☐ 🔥 Khẩn cấp                                                              │
│                                                                             │
│                                      [Hủy]  [Tạo vụ việc]                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. DELETE UI (FINAL - Giống Outlook)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR - DELETE FLOW                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Tìm kiếm...                                                    🔍  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [☐] 🟢 AI Roll Call              abc123    COMPLETED    10:30 AM   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ [☑] 🟡 Test session cũ           def456    WARNING      09:15 AM   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ [☑] 🔴 Debug lỗi XYZ             ghi789    ERROR        08:00 AM   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ [☐] 🔵 Review PR #307            jkl012    EXECUTING    07:45 AM   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [Chọn tất cả]  [Bỏ chọn]         [🗑️ Xóa (2 mục)]                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  CONFIRMATION MODAL:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  ⚠️ Xác nhận xóa 2 mục                                              │   │
│  │                                                                      │   │
│  │  Bạn sắp xóa:                                                       │   │
│  │  • Test session cũ (def456)                                         │   │
│  │  • Debug lỗi XYZ (ghi789)                                           │   │
│  │                                                                      │   │
│  │  Hành động này sẽ xóa:                                              │   │
│  │  - Tất cả comments liên quan                                        │   │
│  │  - Dữ liệu participants                                             │   │
│  │  - Vectors trong Agent Data                                         │   │
│  │                                                                      │   │
│  │  ⚠️ Không thể hoàn tác!                                             │   │
│  │                                                                      │   │
│  │                         [Hủy]  [🗑️ Xóa vĩnh viễn]                  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. DATA MODEL (FINAL)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ai_entities                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ id              │ string    │ PK (claude, chatgpt, gemini, claude-code...) │
│ name            │ string    │ Display name                                 │
│ type            │ enum      │ 'ai' | 'agent'                               │
│ emoji           │ string    │ 🎯 🤖 💎 💻 🔧 ⚡ 📚                          │
│ description     │ text      │ Mô tả vai trò                                │
│ platform        │ string    │ claude.ai, openai.com, google...             │
│ subscription    │ string    │ Gói sử dụng                                  │
│ is_active       │ boolean   │ Có sẵn sàng không                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ai_discussions                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ id              │ uuid      │ PK                                           │
│ topic           │ string    │ Tiêu đề                                      │
│ description     │ text      │ Nội dung yêu cầu ban đầu                     │
│ category        │ enum      │ 'business'|'technical'|'administrative'      │
│ status          │ enum      │ 'draft'|'prompting'|'executing'|             │
│                 │           │ 'reviewing'|'completed'|'needs_user'|        │
│                 │           │ 'archived'                                   │
│ phase           │ enum      │ 'phase1_prompt'|'phase2_execution'           │
│ prompt_round    │ integer   │ 1-3 (vòng phản biện prompt)                  │
│ execution_round │ integer   │ 1-3 (vòng thực hiện)                         │
│ health_status   │ enum      │ 'ok'|'warning'|'error'                       │
│ executor_ai_id  │ FK        │ → ai_entities (AI Điều hành)                 │
│ executor_agent_id│ FK       │ → ai_entities (Agent Thực hiện)              │
│ final_prompt    │ text      │ Prompt đã chốt                               │
│ user_override   │ boolean   │ User đã can thiệp                            │
│ last_activity_at│ timestamp │ Lần hoạt động cuối (cho Progress Monitor)    │
│ expected_completion│ timestamp│ Thời gian dự kiến hoàn thành               │
│ created_at      │ timestamp │                                              │
│ updated_at      │ timestamp │                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ai_discussion_participants                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ id              │ uuid      │ PK                                           │
│ discussion_id   │ FK        │ → ai_discussions                             │
│ entity_id       │ FK        │ → ai_entities                                │
│ role            │ enum      │ 'executor'|'supervisor'|'reviewer'|'none'    │
│ entity_type     │ enum      │ 'ai'|'agent' (derived from entity)           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ai_comments                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ id              │ uuid      │ PK                                           │
│ discussion_id   │ FK        │ → ai_discussions                             │
│ entity_id       │ FK        │ → ai_entities                                │
│ content         │ text      │ Nội dung                                     │
│ phase           │ enum      │ 'phase1'|'phase2'                            │
│ round           │ integer   │ Vòng (1-3)                                   │
│ type            │ enum      │ 'draft_prompt'|'prompt_feedback'|            │
│                 │           │ 'prompt_response'|'final_prompt'|            │
│                 │           │ 'execution_report'|'agent_review'|           │
│                 │           │ 'ai_supervision'|'revision_request'|         │
│                 │           │ 'completion_decision'                        │
│ feedback_status │ enum      │ 'agree'|'partial'|'disagree'|null            │
│ parent_id       │ FK        │ → ai_comments (reply to)                     │
│ created_at      │ timestamp │                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ user_preferences                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ id              │ uuid      │ PK                                           │
│ user_id         │ string    │ User identifier                              │
│ entity_id       │ FK        │ → ai_entities                                │
│ default_role    │ enum      │ 'executor'|'supervisor'|'reviewer'|'none'    │
│ updated_at      │ timestamp │                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ system_alerts                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ id              │ uuid      │ PK                                           │
│ discussion_id   │ FK        │ → ai_discussions                             │
│ alert_type      │ enum      │ 'timeout'|'stalled'|'error'                  │
│ message         │ text      │ Chi tiết                                     │
│ resolved        │ boolean   │ Đã xử lý chưa                                │
│ resolved_by     │ string    │ AI/User đã xử lý                             │
│ created_at      │ timestamp │                                              │
│ resolved_at     │ timestamp │                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. TECHNICAL SUPPLEMENTS (GEMINI FEEDBACK)

### SUPPLEMENT S1: REAL 5-MINUTE TIMER IMPLEMENTATION (Cloud Function + Scheduler)

#### Vấn đề:
Directus Flow không có lệnh "delay" hay "sleep". Logic 5 phút hiện tại chạy ngay lập tức, không đợi đúng 300 giây.

#### Giải pháp kỹ thuật:

**Kiến trúc:**
```
User submit → Directus Flow → Ghi record với:
                             - pending_review_at = $now
                             - status = "pending_human"
                             ↓
Cloud Scheduler (mỗi 1 phút) → Cloud Function "check_auto_approval"
                             ↓
                    Query: WHERE status = "pending_human" 
                           AND pending_review_at < NOW() - 300 seconds
                             ↓
                    Nếu tìm thấy → Update status = "auto_approved"
                                 → Trigger next phase
```

**Implementation:**
1. **Cloud Function:** `check_auto_approval`
   - Runtime: Python 3.11 hoặc Node.js 18
   - Trigger: Cloud Scheduler (cron: `* * * * *` - mỗi phút)
   - Logic: Query Directus API → Find expired pending items → Update status

2. **Directus Schema cần thêm:**
   - Field `pending_review_at` (datetime) trong `ai_discussions`
   - Field `auto_approval_deadline` (datetime, computed: pending_review_at + 300s)

3. **Terraform resources:**
   - google_cloudfunctions2_function "check_auto_approval"
   - google_cloud_scheduler_job "auto_approval_checker"

### Tuân thủ GC-LAW:
- Function deploy tại asia-southeast1
- Sử dụng chatgpt-deployer SA
- Secret: Directus Admin Token từ GSM

---

### SUPPLEMENT S2: DRAFTER AUTO-ACTIVATION

#### Vấn đề:
Khi User tạo Discussion và chọn AI, hệ thống chưa tự động "gọi" AI đó bắt đầu soạn thảo. Hiện phải chat tay nhắc việc.

#### Giải pháp:

**Directus Flow: "E1: AI Drafter Activation"**
- Trigger: Event Hook on `ai_discussions` CREATE
- Conditions: status = "draft" AND executor_ai_id IS NOT NULL

**Flow Operations:**
1. **Read Item** - Lấy discussion vừa tạo
2. **Request URL** - POST webhook đến AI Gateway:
   ```json
   POST /api/ai-gateway/trigger
   {
     "action": "start_draft",
     "discussion_id": "{{$trigger.key}}",
     "executor_ai_id": "{{$trigger.payload.executor_ai_id}}",
     "topic": "{{$trigger.payload.topic}}",
     "context": "{{$trigger.payload.description}}"
   }
   ```
3. **Update Item** - Set status = "drafting", drafter_triggered_at = $now

**AI Gateway endpoint cần xây:**
- Route: POST /api/ai-gateway/trigger
- Logic: Validate AI ID → Format prompt → Call AI API → Store response as comment

#### Fallback nếu AI không response trong 2 phút:
- Cloud Scheduler check → Retry 1 lần
- Nếu vẫn fail → Create tech_request với type = "ai_activation_fail"

---

### SUPPLEMENT S3: "AI ĐANG CẦM BÓNG" INDICATOR

#### Vấn đề:
User không biết hệ thống đang đợi ai (AI hay User) và có bị stall không.

#### UI Component cần thêm vào Super Session (DetailPanel.vue):

**Section: Current Ownership Display**
```vue
<template>
  <div class="ownership-indicator" :class="healthClass">
    <span class="waiting-label">Đang đợi:</span>
    <span class="owner-name">{{ currentOwner }}</span>
    <span class="health-badge" :title="healthTooltip">
      {{ healthIcon }}
    </span>
    <span class="time-elapsed">{{ elapsedTime }}</span>
  </div>
</template>
```

**Logic xác định Owner:**
```javascript
function getCurrentOwner(discussion) {
  if (discussion.status === 'pending_human') {
    return { name: 'User (Bạn)', type: 'human' };
  }
  if (discussion.status === 'drafting') {
    return { name: discussion.executor_ai_name, type: 'ai' };
  }
  if (discussion.status === 'reviewing') {
    return { name: 'AI Giám sát', type: 'ai_group' };
  }
  return { name: 'Hệ thống', type: 'system' };
}
```

**Health Status (theo Progress Monitor của Opus):**
| Status | Condition | Icon | Color |
|--------|-----------|------|-------|
| 🟢 Green | Elapsed < 2 phút | ✅ | green |
| 🟡 Yellow | 2 phút < Elapsed < 5 phút | ⚠️ | yellow |
| 🔴 Red | Elapsed > 5 phút (STALL) | 🚨 | red |

**Tooltip khi hover:**
- 🟢: "Hoạt động bình thường"
- 🟡: "Đang xử lý lâu hơn bình thường"
- 🔴: "Có thể bị nghẽn - Kiểm tra lại"

---

### SUPPLEMENT S4: INSTANT ACTIVATION BUTTON

#### Mục đích:
Cho phép User bỏ qua thời gian chờ 5 phút khi đã sẵn sàng.

#### UI Component (DetailPanel.vue):
```vue
<button 
  v-if="discussion.status === 'pending_human'" 
  @click="activateNow"
  class="btn-instant-activate"
>
  ⚡ Kích hoạt AI ngay
</button>
```

#### API Endpoint:
```
POST /api/discussions/{id}/activate-now
Authorization: Bearer {USER_TOKEN}

Response: { success: true, new_status: "executing" }
```

#### Logic Backend (Directus Flow hoặc API Route):
1. Validate User có quyền Supreme Authority
2. Cancel Cloud Scheduler job cho discussion này (nếu đang pending)
3. Update status: "pending_human" → "executing" hoặc "reviewing"
4. Set `activated_by` = "user_manual"
5. Trigger Drafter Activation (S2) ngay lập tức

#### Ghi chú:
- Nút CHỈ hiển thị khi status = "pending_human"
- Ghi log: "User bypassed 5-min timer at {timestamp}"

---

### SUPPLEMENT S5: TOTAL AI FAILURE FALLBACK

#### Mục đích:
Xử lý khi TẤT CẢ AI tham gia đều không phản hồi sau timeout.

#### Trigger Condition:
- Sau 5 phút từ `pending_review_at`
- VÀ count(ai_comments WHERE discussion_id = X AND round = current) = 0
- VÀ executor_ai đã được trigger nhưng không response

#### Status mới cần thêm vào schema:
```
ai_discussions.status enum += 'stalled_error'
```

#### Logic trong Cloud Function "check_auto_approval":
```python
def check_discussion(discussion):
    elapsed = now() - discussion.pending_review_at
    
    if elapsed > 300:  # 5 phút
        comments = get_comments(discussion.id, round=discussion.current_round)
        
        if len(comments) == 0:
            # TOTAL FAILURE - Không AI nào response
            update_status(discussion.id, 'stalled_error')
            send_alert_to_user(
                level='critical',
                message=f'🔴 CẢNH BÁO: Discussion "{discussion.topic}" bị nghẽn - Tất cả AI không phản hồi',
                discussion_id=discussion.id
            )
            create_tech_request(
                type='ai_total_failure',
                description=f'All assigned AIs failed to respond for discussion {discussion.id}'
            )
            return
        
        # Normal flow - có ít nhất 1 AI response
        proceed_to_next_phase(discussion)
```

#### UI Indicator:
```vue
<div v-if="discussion.status === 'stalled_error'" class="alert-critical">
  🔴 HỆ THỐNG BỊ NGHẼN
  <p>Tất cả AI không phản hồi. Vui lòng:</p>
  <ul>
    <li>Kiểm tra kết nối các AI service</li>
    <li>Thử lại bằng nút "⚡ Kích hoạt lại"</li>
    <li>Hoặc chuyển sang AI khác</li>
  </ul>
  <button @click="retryActivation">🔄 Thử lại</button>
  <button @click="reassignAI">🔀 Đổi AI</button>
</div>
```

---

### SUPPLEMENT S6: PROMPT VERSIONING & DIFF VIEW

#### Mục đích:
Cho phép User xem AI đã sửa Prompt như thế nào qua mỗi vòng phản biện.

#### Schema bổ sung cho ai_comments:
```
ai_comments {
  ...existing fields...
  + prompt_version: integer (1, 2, 3...)
  + prompt_content: text (full prompt tại thời điểm này)
  + changes_summary: text (AI tự mô tả đã sửa gì)
}
```

#### Logic lưu version:
Mỗi khi AI Điều hành cập nhật prompt sau khi nhận feedback:
1. Tăng prompt_version += 1
2. Lưu prompt_content mới
3. AI tự generate changes_summary: "Đã bổ sung X, sửa Y theo góp ý của Gemini"

#### UI Component - ThreadList.vue (Tầng 2):
```vue
<div class="round-header">
  <span>Vòng {{ round.number }}</span>
  <button 
    v-if="round.number > 1" 
    @click="showDiff(round)"
    class="btn-compare"
  >
    📊 So sánh với vòng trước
  </button>
</div>

<!-- Modal Diff View -->
<modal v-if="showingDiff">
  <h3>So sánh Prompt: Vòng {{ diffRound - 1 }} → Vòng {{ diffRound }}</h3>
  <div class="diff-view">
    <div class="diff-old">
      <h4>Phiên bản cũ</h4>
      <pre>{{ oldPrompt }}</pre>
    </div>
    <div class="diff-new">
      <h4>Phiên bản mới</h4>
      <pre>{{ newPrompt }}</pre>
    </div>
    <div class="diff-highlight">
      <h4>Thay đổi</h4>
      <diff-component :old="oldPrompt" :new="newPrompt" />
    </div>
  </div>
  <div class="changes-summary">
    <strong>AI mô tả:</strong> {{ changesSummary }}
  </div>
</modal>
```

#### Library đề xuất cho Diff:
- `diff` (npm) - Lightweight text diff
- Hoặc custom highlight với CSS classes cho added/removed lines

#### Ghi chú:
- Giới hạn lưu tối đa 3 versions (theo 3 vòng max)
- Sau khi Discussion hoàn thành, versions vẫn giữ để audit

---

## 📋 CHECKLIST XÁC NHẬN FINAL

| # | Điểm | Status |
|---|------|--------|
| 1 | **Entities:** 3 AI (Claude, ChatGPT, Gemini) + 4 Agents | ⬜ |
| 2 | **Gemini ecosystem:** Tất cả chạy Google One AI Premium $20/mo | ⬜ |
| 3 | **Timeout 5 phút** thay vì Wait-for-All | ⬜ |
| 4 | **Fallback:** Hệ thống không bao giờ dừng vì 1 thành phần lỗi | ⬜ |
| 5 | **2 Giai đoạn:** Phase 1 (AI Prompt) → Phase 2 (Agent Execute) | ⬜ |
| 6 | **Tối đa 3 vòng** cho mỗi giai đoạn | ⬜ |
| 7 | **Progress Monitor:** Kiểm tra thông minh mỗi 5 phút | ⬜ |
| 8 | **Health Status:** ok/warning/error + màu 🟢🟡🔴 | ⬜ |
| 9 | **Email alert** khi có lỗi nghiêm trọng | ⬜ |
| 10 | **Super Session:** Cập nhật event-driven + polling 30s | ⬜ |
| 11 | **Option "Không tham gia"** cho tất cả entities | ⬜ |
| 12 | **Role preferences** nhớ từ lần cuối | ⬜ |
| 13 | **Delete:** Checkbox + nút Delete giống Outlook | ⬜ |
| 14 | **DOT:** Tất cả operations đều qua DOT commands | ⬜ |
| 15 | **Chỉ AI Điều hành** được đánh dấu COMPLETED | ⬜ |

---

Huyen, đây là bản logic FINAL. Xin hãy review và xác nhận từng điểm. Khi tất cả đã OK, tôi sẽ viết Prompt điều hành chi tiết cho Claude Code.
