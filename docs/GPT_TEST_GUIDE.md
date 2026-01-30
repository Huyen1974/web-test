# Hướng dẫn Test ChatGPT với Business OS

## Bước 1: Tạo Custom GPT

1. Truy cập: https://chat.openai.com/gpts/editor
2. Click "Create a GPT"
3. Trong tab "Configure":
   - **Name:** Agency OS Assistant
   - **Description:** Tìm kiếm và tương tác với hệ thống tri thức doanh nghiệp

## Bước 2: Import OpenAPI

1. Trong section "Actions", click "Create new action"
2. Click "Import from URL"
3. Nhập URL:
   ```
   https://ai.incomexsaigoncorp.vn/agent_data_openapi.yaml
   ```
4. Click "Import"

## Bước 3: Cấu hình Authentication

1. Trong "Authentication", chọn "API Key"
2. Auth Type: **Bearer**
3. Header: **Authorization**
4. API Key: Lấy từ Admin (AI_GATEWAY_TOKEN trong Secret Manager)

## Bước 4: Thêm System Instructions

Paste vào phần Instructions:

```
Bạn là trợ lý AI cho Incomex Saigon Corp. Khả năng của bạn:

1. TÌM KIẾM TRI THỨC: Dùng /api/ai/search để tìm tài liệu liên quan.
   Luôn search trước khi trả lời câu hỏi chuyên môn.

2. GỬI PHẢN HỒI: Dùng /items/feedbacks để gửi:
   - Đề xuất cải thiện nội dung
   - Báo lỗi khi thông tin lỗi thời
   - Yêu cầu hành động khi cần người review

3. ĐỌC TÀI LIỆU: Dùng /items/agent_views để đọc nội dung đầy đủ.

Nguyên tắc QUAN TRỌNG:
- Trích dẫn nguồn khi có linked_entity_ref
- Dùng feedback_type="action_request" cho việc cần người xử lý
- Luôn ghi source_model="gpt-4" trong feedback
- Ngôn ngữ chính: Tiếng Việt

⚠️ QUY TẮC BẮT BUỘC VỀ FEEDBACK:
- Khi bạn gửi một feedback, trạng thái mặc định là "pending"
- Bạn KHÔNG ĐƯỢC tự ý chuyển trạng thái sang "resolved"
- Việc phê duyệt và đóng feedback thuộc về quy trình kiểm soát của con người
- Nếu muốn cập nhật feedback, chỉ được thêm comment, KHÔNG thay đổi status
```

## Bước 5: Test Prompts

### Test 1: Search
```
"Tìm kiếm tài liệu về quy trình quản lý kho"
```

### Test 2: Read specific doc
```
"Đọc nội dung đầy đủ của tài liệu có ID 1"
```

### Test 3: Submit feedback
```
"Tôi muốn báo lỗi: Thông tin về số lượng tồn kho trong tài liệu XYZ đã lỗi thời"
```

### Test 4: Action request
```
"Gửi yêu cầu cho team review lại phần hướng dẫn sử dụng trong tài liệu ABC"
```

## Kết quả mong đợi

| Test | Expected Result |
|------|-----------------|
| Search | Trả về danh sách documents với relevance score |
| Read | Trả về nội dung đầy đủ của document |
| Feedback | Tạo được feedback mới với status="pending" |
| Action Request | Tạo feedback với feedback_type="action_request" |

## Troubleshooting

### 401 Unauthorized
- **Nguyên nhân:** API Key sai hoặc thiếu
- **Khắc phục:** Kiểm tra lại API Key trong Authentication settings

### 503 Service Unavailable
- **Nguyên nhân:** Service đang cold start
- **Khắc phục:** Đợi 30 giây rồi thử lại

### Không có kết quả tìm kiếm
- **Nguyên nhân:** Query không match với nội dung
- **Khắc phục:** Thử từ khóa khác, dùng tiếng Việt không dấu

### 403 Forbidden trên feedback
- **Nguyên nhân:** Thiếu quyền hoặc Bearer Token không đúng
- **Khắc phục:** Kiểm tra token có quyền write feedbacks

---

## API Endpoints Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/ai/search` | POST | Bearer | Vector search |
| `/api/ai/info` | GET | None | System status |
| `/items/agent_views` | GET | None | Read documents |
| `/items/feedbacks` | POST | Bearer | Submit feedback |

## Liên hệ hỗ trợ

- Check service status: https://ai.incomexsaigoncorp.vn/api/ai/info
- Documentation: https://ai.incomexsaigoncorp.vn/llms.txt
