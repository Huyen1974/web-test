# MCP Contract v2.0

## 1. Mục tiêu
Tài liệu này xác định hợp đồng giao tiếp giữa Client (Cursor/Codex) và dịch vụ Agent Data. Mục tiêu là đảm bảo cả hai phía thống nhất về cấu trúc payload, quy tắc xác thực và hành vi khi thực thi các hành động điều phối kiến thức (MCP – Marvelous Collaboration Protocol) phiên bản 2.0.

## 2. Định nghĩa Actions
Mỗi action được gửi dưới dạng JSON object với các trường chung:

```json
{
  "action": "<action_name>",
  "request_id": "uuid-v4",
  "principal": {
    "sub": "service-account@example.com",
    "roles": ["cursor", "codex"],
    "tenant_id": "tenant-asia-01"
  },
  "payload": { /* action-specific */ }
}
```

### 2.1 Action: `create_document`
Tạo một tài liệu mới trong kho kiến thức.

**Payload**
```json
{
  "document_id": "uuid-v4",
  "parent_id": "root", 
  "content": {
    "mime_type": "text/markdown",
    "body": "# Introduction\nNội dung văn bản..."
  },
  "metadata": {
    "title": "Lộ trình Onboarding",
    "tags": ["onboarding", "ops"],
    "source": "cursor"
  },
  "is_human_readable": true,
  "created_at": "2025-09-16T03:00:00Z"
}
```

**Ràng buộc**
- `document_id` phải duy nhất trong tenant.
- `parent_id` trỏ tới một nút hợp lệ (dùng `root` cho tầng cao nhất).
- `content.body` bắt buộc; hỗ trợ `text/markdown`, `text/plain`, `application/json`.

### 2.2 Action: `update_document`
Cập nhật nội dung, metadata hoặc cờ hiển thị của tài liệu.

**Payload**
```json
{
  "document_id": "uuid-v4",
  "patch": {
    "content": {
      "mime_type": "text/markdown",
      "body": "# Introduction\nĐã cập nhật nội dung." 
    },
    "metadata": {
      "title": "Lộ trình Onboarding (v2)",
      "tags": ["onboarding", "ops", "v2"],
      "last_editor": "codex-bot"
    },
    "is_human_readable": false
  },
  "update_mask": ["content", "metadata", "is_human_readable"],
  "last_known_revision": 12
}
```

**Ràng buộc**
- `update_mask` liệt kê các trường được áp dụng; nếu vắng mặt thì cập nhật toàn bộ.
- `last_known_revision` dùng cho optimistic locking; nếu lệch, hệ thống trả về lỗi `409 CONFLICT`.

### 2.3 Action: `delete_document`
Thực hiện soft delete – tài liệu bị ẩn khỏi truy vấn nhưng vẫn giữ để audit/khôi phục.

**Payload**
```json
{
  "document_id": "uuid-v4",
  "reason": "retired",
  "deleted_by": "cursor-agent",
  "delete_at": "2025-09-16T04:00:00Z"
}
```

**Ràng buộc**
- `delete_at` mặc định là thời điểm nhận yêu cầu nếu không cung cấp.
- Hệ thống gán cờ `deleted=true` và lưu audit log; không được xóa cứng.

### 2.4 Action: `move_document`
Thay đổi vị trí của tài liệu trong cây phân cấp.

**Payload**
```json
{
  "document_id": "uuid-v4",
  "new_parent_id": "collection-strategy",
  "position": {
    "ordering": 3,
    "before": "doc-legacy-002"
  }
}
```

**Ràng buộc**
- Không cho phép tạo vòng lặp (cycle) – server phải tự kiểm tra.
- Trường `position` tùy chọn, dùng để tinh chỉnh thứ tự trong danh sách con; nếu không có, hệ thống append cuối.

### 2.5 Action: `query_knowledge`
Truy vấn kiến thức từ Qdrant + LLM pipeline.

**Payload**
```json
{
  "query": "Các bước khởi tạo hạ tầng PF?",
  "filters": {
    "tags": ["pf", "phase-11"],
    "tenant_id": "tenant-asia-01"
  },
  "top_k": 8,
  "context_hints": {
    "preferred_format": "markdown",
    "language": "vi-VN"
  },
  "routing": {
    "allow_external_search": false,
    "max_latency_ms": 4000
  }
}
```

**Phản hồi**
```json
{
  "response": "...",
  "context": [
    {
      "document_id": "doc-pf-032",
      "snippet": "Bước 1: Active PF envelope...",
      "score": 0.87
    }
  ],
  "usage": {
    "qdrant_hits": 12,
    "llm_tokens_prompt": 1300,
    "llm_tokens_completion": 215
  }
}
```

**Ràng buộc**
- `query` là bắt buộc, tối đa 2.048 ký tự.
- `top_k` mặc định 5, tối đa 20.
- Nếu không có kết quả phù hợp, trả về `response` rỗng và `context=[]`.

---

Tài liệu này là bản nháp v2.0. Các thay đổi tiếp theo phải duy trì tính tương thích ngược hoặc bump phiên bản nếu phá vỡ hợp đồng.
