# PROCESS REGISTRY (Danh bạ Quy trình)

## Mục đích
File này là SSOT cho tất cả quy trình nội bộ. Process Matcher Agent 
sử dụng file này để xác định quy trình áp dụng cho mỗi task.

## Cấu trúc Quy trình

| Field | Mô tả | Ví dụ |
|-------|-------|-------|
| process_id | ID duy nhất (format: PROC-{DOMAIN}-{NUMBER}) | PROC-RETURN-001 |
| name | Tên quy trình | Quy trình đổi trả hàng |
| domain | Lĩnh vực | SALES, SUPPORT, HR, FINANCE |
| triggers | Từ khóa/điều kiện kích hoạt | ["trả hàng", "đổi hàng", "return"] |
| steps | Các bước thực hiện | [{step_id, name, assignee_type}] |
| sla_hours | Thời gian cam kết | 24 |
| requires_approval | Cần phê duyệt không | true |
| status | active / deprecated | active |

## Danh sách Quy trình

### DOMAIN: SUPPORT (Hỗ trợ khách hàng)

#### PROC-RETURN-001: Quy trình đổi trả hàng
| Field | Value |
|-------|-------|
| triggers | trả hàng, đổi hàng, return, exchange |
| sla_hours | 24 |
| steps | 1. Tiếp nhận → 2. Xác minh → 3. Phê duyệt → 4. Xử lý → 5. Hoàn tất |
| requires_approval | Yes (step 3) |
| related_docs | POLICY-RETURN-2026 |

#### PROC-REFUND-002: Quy trình hoàn tiền
| Field | Value |
|-------|-------|
| triggers | hoàn tiền, refund, trả tiền |
| sla_hours | 48 |
| steps | 1. Tiếp nhận → 2. Kiểm tra thanh toán → 3. Phê duyệt → 4. Chuyển khoản |
| requires_approval | Yes (step 3, amount > 500k) |
| related_docs | POLICY-REFUND-2026 |

#### PROC-COMPLAINT-003: Quy trình xử lý khiếu nại
| Field | Value |
|-------|-------|
| triggers | khiếu nại, complaint, không hài lòng, phàn nàn |
| sla_hours | 12 |
| steps | 1. Ghi nhận → 2. Phân loại → 3. Điều tra → 4. Giải quyết → 5. Follow-up |
| requires_approval | No (auto-escalate if > 24h) |

### DOMAIN: SALES (Bán hàng)

#### PROC-ORDER-001: Quy trình xử lý đơn hàng
| Field | Value |
|-------|-------|
| triggers | đặt hàng, order, mua |
| sla_hours | 4 |
| steps | 1. Xác nhận → 2. Kiểm kho → 3. Đóng gói → 4. Giao vận → 5. Hoàn tất |
| requires_approval | No |

### DOMAIN: CONTENT (Nội dung)

#### PROC-DOC-CREATE-001: Quy trình tạo tài liệu mới
| Field | Value |
|-------|-------|
| triggers | tạo kế hoạch, viết báo cáo, create document |
| sla_hours | 48 |
| steps | 1. Khởi tạo → 2. Soạn thảo → 3. Review → 4. Phê duyệt → 5. Publish |
| requires_approval | Yes (step 4) |

#### PROC-DOC-UPDATE-002: Quy trình cập nhật tài liệu
| Field | Value |
|-------|-------|
| triggers | cập nhật, sửa đổi, update document |
| sla_hours | 24 |
| steps | 1. Lock → 2. Edit → 3. Review → 4. Merge → 5. Unlock |
| requires_approval | Yes if major change |

## Quy tắc Matching

1. **Exact Match:** Nếu trigger khớp chính xác → relevance = 1.0
2. **Partial Match:** Nếu trigger khớp một phần → relevance = 0.5-0.9
3. **Semantic Match:** Nếu ý nghĩa tương tự → relevance = 0.3-0.7
4. **Multiple Match:** Trả về tất cả processes có relevance > 0.5
5. **Primary Selection:** Process có relevance cao nhất = primary_process

## Maintenance

| Action | Frequency | Owner |
|--------|-----------|-------|
| Review & Update | Monthly | Operations Team |
| Add New Process | On demand | Process Owner + Approval |
| Deprecate Process | As needed | Operations Lead |
