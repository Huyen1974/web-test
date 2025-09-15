"""
Auto-generated PF requirement markers.
This module exists to host marker comments for PF specs so that tooling
can locate them in the codebase.
"""
# @req:PF-ENV-001 - Tiêu chuẩn Áp dụng - Nền tảng OpenAI Function Calling hybrid MCP structured output (Jun 18 2025) hỗ trợ tool results/resource links
# @req:PF-ENV-002 - payload.schema_version MUST map tới JSON Schema in repo schemas/; CI BLOCK nếu payload không validate
# @req:PF-ENV-003 - SDK TS/Python MUST be generated từ OpenAPI/JSON-Schema; không merge nếu SDK không đồng bộ
# @req:PF-ENV-004 - Envelope v2.2 - BẮT BUỘC đủ trường (version to payload), bổ sung resource_links/context_id; NOTE: Encryption sensitive payload trỏ SG-ENC-001 (JWE/AES-GCM, cấm cleartext)
# @req:PF-ENV-005 - version: "1.0"
# @req:PF-ENV-006 - request_id: <uuid>
# @req:PF-ENV-007 - correlation_id: <uuid>
# @req:PF-ENV-008 - causation_id: <uuid> // ID của tin nhắn gây ra hành động này; invariant causation_id == request_id của message trước
# @req:PF-CAUS-001 - Causation chain invariant - causation_id MUST == request_id của message gây ra hành động trước
# @req:PF-CORR-001 - correlation_id scope theo saga/job - Tất cả events thuộc cùng job MUST giữ nguyên correlation_id
# @req:PF-ENV-009 - trace_id: <w3c-trace-id>
# @req:PF-ENV-010 - tenant_id: <string>
# @req:PF-LOC-001 - data_locality ràng buộc - SHOULD khớp ^[a-z]+(-[a-z0-9]+)+[0-9]$ (vd. asia-southeast1); linter cảnh báo nếu lệch
# @req:PF-ENV-011 - data_locality: <string> // Ví dụ: "asia-southeast1"
# @req:PF-ENV-012 - principal: {"sub": "service-account-id
