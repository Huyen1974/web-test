# Hướng dẫn Test Google Gemini với Business OS

## Bước 1: Truy cập Gemini Extensions

1. Truy cập: https://gemini.google.com/extensions
2. Đăng nhập với tài khoản Google Workspace
3. Click "Add extension" hoặc tương đương

## Bước 2: Cấu hình Extension

1. Chọn "Custom API" hoặc "OpenAPI Extension"
2. Nhập URL OpenAPI specification:
   ```
   https://ai.incomexsaigoncorp.vn/agent_data_openapi.yaml
   ```
3. Đặt tên extension: **Agency OS Knowledge**

## Bước 3: Cấu hình Authentication

1. Chọn authentication type: **Bearer Token**
2. Token: Lấy từ Admin (AI_GATEWAY_TOKEN trong Secret Manager)
3. Header name: **Authorization**
4. Format: `Bearer <token>`

## Bước 4: System Prompt (nếu hỗ trợ)

Nếu Gemini cho phép custom instructions, thêm:

```
Bạn là trợ lý AI cho Incomex Saigon Corp. Khả năng của bạn:

1. TÌM KIẾM TRI THỨC: Dùng /api/ai/search để tìm tài liệu liên quan.
   Luôn search trước khi trả lời câu hỏi chuyên môn.

2. GỬI PHẢN HỒI: Dùng /items/feedbacks để gửi:
   - Đề xuất cải thiện nội dung (feedback_type: "suggestion")
   - Báo lỗi khi thông tin lỗi thời (feedback_type: "correction")
   - Yêu cầu hành động (feedback_type: "action_request")

3. ĐỌC TÀI LIỆU: Dùng /items/agent_views để đọc nội dung đầy đủ.

Nguyên tắc QUAN TRỌNG:
- Trích dẫn nguồn khi có linked_entity_ref
- Luôn ghi source_model="gemini-2.0" trong feedback
- Ngôn ngữ chính: Tiếng Việt

⚠️ QUY TẮC BẮT BUỘC VỀ FEEDBACK:
- Khi bạn gửi một feedback, trạng thái mặc định là "pending"
- Bạn KHÔNG ĐƯỢC tự ý chuyển trạng thái sang "resolved"
- Việc phê duyệt và đóng feedback thuộc về quy trình kiểm soát của con người
- Nếu muốn cập nhật feedback, chỉ được thêm comment, KHÔNG thay đổi status
```

## Bước 5: Test Prompts

### Test 1: Search cơ bản
```
"Tìm tài liệu liên quan đến quy trình nhân sự"
```

### Test 2: Search và tổng hợp
```
"Tổng hợp những quy định về nghỉ phép trong hệ thống"
```

### Test 3: Đọc document cụ thể
```
"Đọc nội dung chi tiết của tài liệu số 1"
```

### Test 4: Gửi feedback
```
"Gửi góp ý: Tài liệu về quy trình tuyển dụng cần bổ sung thêm phần đánh giá ứng viên"
```

### Test 5: Action request
```
"Yêu cầu team HR review lại nội dung về chính sách lương thưởng"
```

## Kết quả mong đợi

| Test | Expected Result |
|------|-----------------|
| Search cơ bản | Trả về 3-5 documents liên quan với score |
| Search tổng hợp | Gemini tổng hợp từ nhiều nguồn, có trích dẫn |
| Đọc document | Nội dung đầy đủ của document được chỉ định |
| Gửi feedback | Tạo feedback với status="pending" |
| Action request | Tạo feedback với feedback_type="action_request" |

## Troubleshooting

### Extension không kết nối được
- **Nguyên nhân:** CORS hoặc network issue
- **Khắc phục:** Thử reload extension, check network

### 401 Unauthorized
- **Nguyên nhân:** Token không hợp lệ
- **Khắc phục:** Kiểm tra lại Bearer Token

### 503 Service Unavailable
- **Nguyên nhân:** Service cold start (Google Cloud Run)
- **Khắc phục:** Thử lại sau 30 giây

### Timeout
- **Nguyên nhân:** Query quá phức tạp hoặc service chậm
- **Khắc phục:** Đơn giản hóa query, thử lại

### Không thấy extension trong danh sách
- **Nguyên nhân:** Gemini Extensions có thể bị hạn chế theo region/account
- **Khắc phục:** Kiểm tra Google Workspace settings

---

## API Endpoints Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/ai/search` | POST | Bearer | Semantic vector search |
| `/api/ai/info` | GET | None | Health check & metadata |
| `/items/agent_views` | GET | None | Read knowledge documents |
| `/items/feedbacks` | POST | Bearer | Submit user feedback |
| `/llms.txt` | GET | None | AI-readable site index |

## Request Examples

### Search Request
```json
{
  "query": "quy trình nhân sự",
  "limit": 5
}
```

### Feedback Request
```json
{
  "linked_entity_ref": "agent_views/1",
  "feedback_type": "suggestion",
  "content": "Cần bổ sung thêm ví dụ minh họa",
  "source_model": "gemini-2.0",
  "status": "pending"
}
```

## Hạn chế của Gemini Extensions

1. **Không có native support cho OpenAPI** - Có thể cần workaround
2. **Rate limits** - Google có giới hạn số request
3. **Region restrictions** - Một số tính năng chỉ có ở US
4. **Workspace requirement** - Có thể cần Google Workspace account

## Liên hệ hỗ trợ

- Service status: https://ai.incomexsaigoncorp.vn/api/ai/info
- OpenAPI spec: https://ai.incomexsaigoncorp.vn/agent_data_openapi.yaml
- AI index: https://ai.incomexsaigoncorp.vn/llms.txt
