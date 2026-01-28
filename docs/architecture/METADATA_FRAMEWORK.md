# METADATA FRAMEWORK - 3 LỚP NGỮ CẢNH
## "Mỗi tương tác đều mang theo DNA đầy đủ"

---

## TỔNG QUAN KIẾN TRÚC

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    METADATA LAYERS (DNA của mọi tương tác)              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 1: ENTITY METADATA (Ai/Cái gì)                           │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │   │
│  │  │   ACTOR      │ │   DOCUMENT   │ │   RESOURCE   │             │   │
│  │  │  (User/Agent)│ │  (Docs/KB)   │ │ (File/Asset) │             │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 2: CONTEXT METADATA (Bối cảnh)                           │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │   │
│  │  │   SESSION    │ │   HISTORY    │ │  RELATIONS   │             │   │
│  │  │  (Phiên HT)  │ │ (Lịch sử)    │ │ (Liên quan)  │             │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 3: OPERATIONAL METADATA (Vận hành)                       │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │   │
│  │  │   WORKFLOW   │ │   METRICS    │ │    AUDIT     │             │   │
│  │  │  (Quy trình) │ │  (Chỉ số)    │ │  (Vết tích)  │             │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## LAYER 1: ENTITY METADATA

### 1.1 ACTOR METADATA (Người/Agent tham gia)

```json
{
  "actor": {
    "id": "uuid-v4",
    "type": "human | agent | system",
    "identity": {
      "name": "Nguyễn Văn A",
      "email": "a@company.com",
      "external_ids": {
        "chatwoot_id": "contact_12345",
        "lark_uid": "ou_xxxxx",
        "directus_user_id": "user_abc"
      }
    },
    "classification": {
      "tier": "vip | standard | trial",
      "segment": "enterprise | smb | individual",
      "tags": ["early_adopter", "high_value"]
    },
    "permissions": {
      "roles": ["customer", "editor"],
      "access_level": "public | internal | confidential"
    },
    "preferences": {
      "language": "vi",
      "timezone": "Asia/Ho_Chi_Minh",
      "notification_channels": ["email", "zalo"]
    }
  }
}
```

### 1.2 DOCUMENT METADATA

```json
{
  "document": {
    "id": "uuid-v4",
    "doc_code": "PLAN-MKT-2025-Q2",
    "type": "plan | report | policy | process | contract | template",
    "version": {
      "current": "1.2.0",
      "format": "major.minor.patch",
      "is_latest": true
    },
    "state": {
      "status": "draft | reviewing | approved | published | archived",
      "is_locked": false,
      "locked_by": null,
      "locked_at": null
    },
    "classification": {
      "zone": "core | migration | growth",
      "access_level": "public | internal | confidential",
      "retention_policy": "permanent | 7years | 3years"
    },
    "content_info": {
      "title": "Kế hoạch Marketing Q2 2025",
      "summary": "...",
      "word_count": 2500,
      "language": "vi",
      "has_attachments": true
    }
  }
}
```

### 1.3 RESOURCE METADATA (Files/Assets)

```json
{
  "resource": {
    "id": "uuid-v4",
    "filename": "report-q2.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 2048576,
    "storage": {
      "provider": "gcs | directus_files",
      "bucket": "huyen1974-docs-production",
      "path": "reports/2025/q2/"
    },
    "processing": {
      "indexed": true,
      "indexed_at": "2025-01-27T10:00:00Z",
      "chunk_count": 15,
      "embedding_model": "text-embedding-3-small"
    }
  }
}
```

---

## LAYER 2: CONTEXT METADATA

### 2.1 SESSION CONTEXT (Phiên hiện tại)

```json
{
  "session": {
    "id": "session_uuid",
    "started_at": "2025-01-27T10:30:00Z",
    "channel": {
      "source": "chatwoot | web | email | api",
      "device": "mobile | desktop",
      "browser": "Chrome 120",
      "ip_country": "VN"
    },
    "navigation": {
      "entry_page": "/products/abc",
      "current_page": "/support",
      "page_sequence": ["/", "/products", "/products/abc", "/support"],
      "time_on_site_seconds": 340
    },
    "intent": {
      "detected": "order_inquiry",
      "confidence": 0.87,
      "keywords": ["đơn hàng", "giao hàng"]
    },
    "sentiment": {
      "current": "neutral",
      "trend": "stable",
      "urgency_score": 0.3
    }
  }
}
```

### 2.2 HISTORY CONTEXT (Lịch sử)

```json
{
  "history": {
    "interactions": {
      "total_contacts": 12,
      "last_30_days": 3,
      "channels_used": ["web", "chatwoot"],
      "avg_resolution_time_hours": 4.5
    },
    "orders": {
      "total_orders": 8,
      "total_value": 15000000,
      "last_order": {
        "id": "ORD-2025-001234",
        "date": "2025-01-20",
        "status": "shipping",
        "items": ["Product A", "Product B"]
      },
      "pending_orders": [
        {"id": "ORD-2025-001234", "status": "shipping", "eta": "2025-01-28"}
      ]
    },
    "support": {
      "open_tickets": 1,
      "resolved_tickets": 5,
      "last_issue": {
        "type": "delivery_delay",
        "resolved_at": "2025-01-15",
        "satisfaction": 4
      },
      "frequent_issues": ["shipping", "payment"]
    },
    "documents_accessed": [
      {"doc_id": "FAQ-SHIPPING", "accessed_at": "2025-01-26", "helpful": true}
    ]
  }
}
```

### 2.3 RELATIONS CONTEXT (Mối quan hệ)

```json
{
  "relations": {
    "related_actors": [
      {"id": "agent_cskh_01", "role": "previous_handler", "last_contact": "2025-01-20"},
      {"id": "manager_sales", "role": "account_manager"}
    ],
    "related_documents": [
      {"id": "doc_policy_return", "relevance": 0.9, "reason": "shipping_inquiry"},
      {"id": "doc_faq_delivery", "relevance": 0.85}
    ],
    "related_orders": ["ORD-2025-001234", "ORD-2024-009876"],
    "related_tickets": ["TKT-2025-0056"]
  }
}
```

---

## LAYER 3: OPERATIONAL METADATA

### 3.1 WORKFLOW METADATA

```json
{
  "workflow": {
    "current": {
      "id": "wf_support_inquiry",
      "step": "agent_assignment",
      "status": "in_progress",
      "started_at": "2025-01-27T10:30:00Z"
    },
    "assignment": {
      "current_assignee": "agent_cskh_02",
      "assigned_at": "2025-01-27T10:31:00Z",
      "queue_position": null,
      "sla_deadline": "2025-01-27T14:30:00Z"
    },
    "approvals": {
      "required": ["manager_review"],
      "completed": [],
      "pending": ["manager_review"]
    },
    "escalation": {
      "level": 0,
      "auto_escalate_at": "2025-01-27T12:30:00Z",
      "escalate_to": "supervisor_01"
    },
    "safety": {
      "budget_limit_usd": 0.50,
      "max_retry_count": 3,
      "timeout_seconds": 300,
      "cost_accumulated_usd": 0.12
    }
  }
}
```

### 3.1b PROCESS REFERENCE METADATA (Quy trình nội bộ)

```json
{
  "process_reference": {
    "applicable_processes": [
      {
        "process_id": "PROC-RETURN-001",
        "process_name": "Quy trình đổi trả hàng",
        "relevance_score": 0.95,
        "matched_by": "process_matcher_agent",
        "matched_at": "2025-01-27T10:30:05Z"
      },
      {
        "process_id": "PROC-REFUND-002",
        "process_name": "Quy trình hoàn tiền",
        "relevance_score": 0.72,
        "matched_by": "process_matcher_agent",
        "matched_at": "2025-01-27T10:30:05Z"
      }
    ],
    "primary_process": "PROC-RETURN-001",
    "process_status": {
      "current_step": "verify_eligibility",
      "steps_completed": ["receive_request", "identify_order"],
      "steps_remaining": ["verify_eligibility", "approve", "process_return"],
      "estimated_completion": "2025-01-28T10:00:00Z"
    },
    "process_context": {
      "requires_documents": ["order_receipt", "product_photos"],
      "documents_received": ["order_receipt"],
      "documents_missing": ["product_photos"],
      "blocking_reason": "Chờ khách gửi ảnh sản phẩm"
    }
  }
}
```

### 3.2 METRICS METADATA

```json
{
  "metrics": {
    "response": {
      "first_response_time_seconds": null,
      "target_first_response": 300,
      "total_messages": 1
    },
    "quality": {
      "csat_prediction": 0.75,
      "sentiment_trajectory": "stable",
      "complexity_score": 0.4
    },
    "cost": {
      "tokens_used": 0,
      "api_calls": 0,
      "estimated_cost_usd": 0
    }
  }
}
```

### 3.3 AUDIT METADATA

```json
{
  "audit": {
    "created": {
      "at": "2025-01-27T10:30:00Z",
      "by": "customer_abc",
      "source": "chatwoot_webhook"
    },
    "modified": {
      "at": "2025-01-27T10:31:00Z",
      "by": "router_agent",
      "action": "assign_to_agent"
    },
    "trail": [
      {"at": "2025-01-27T10:30:00Z", "action": "created", "by": "customer"},
      {"at": "2025-01-27T10:30:05Z", "action": "enriched", "by": "context_builder"},
      {"at": "2025-01-27T10:31:00Z", "action": "assigned", "by": "router_agent"}
    ],
    "compliance": {
      "pii_detected": true,
      "pii_fields": ["email", "phone"],
      "consent_status": "granted",
      "data_retention_until": "2028-01-27"
    }
  }
}
```

---

## VÍ DỤ THỰC TẾ: "ĐƠN HÀNG ĐÂU RỒI?" (3 TỪ → 1 TRANG A4)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INPUT: "Đơn hàng đâu rồi?" (3 từ)                                     │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CONTEXT BUILDER (Auto-enrichment trong < 500ms)                        │
│                                                                         │
│  1. Identify Actor → customer_abc (từ Chatwoot session)                │
│  2. Fetch Actor Metadata → VIP tier, 8 orders history                  │
│  3. Fetch Session Context → mobile, từ trang /support                  │
│  4. Fetch History → 1 đơn đang shipping, ETA 28/01                     │
│  5. Fetch Relations → FAQ shipping, policy return                      │
│  6. Calculate Metrics → urgency = 0.3 (thấp, không giận)               │
│  7. Init Workflow → assign to CSKH Agent                               │
│  8. Create Audit Trail                                                  │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  OUTPUT: Context Package (~1 trang A4, ~4000 tokens)                   │
│                                                                         │
│  {                                                                      │
│    "actor": { ... },           // ~500 tokens                          │
│    "document": null,           // không liên quan doc cụ thể           │
│    "session": { ... },         // ~300 tokens                          │
│    "history": { ... },         // ~1000 tokens (quan trọng nhất!)      │
│    "relations": { ... },       // ~500 tokens                          │
│    "workflow": { ... },        // ~300 tokens                          │
│    "metrics": { ... },         // ~200 tokens                          │
│    "audit": { ... }            // ~200 tokens                          │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  AGENT CSKH nhận được:                                                  │
│                                                                         │
│  "Khách hàng VIP Nguyễn Văn A hỏi về đơn hàng.                         │
│   Đơn ORD-2025-001234 đang giao, ETA 28/01.                            │
│   Khách thường hỏi về shipping (3 lần gần đây).                        │
│   Tone bình thường, không cần escalate.                                 │
│   Tài liệu liên quan: FAQ-SHIPPING, POLICY-RETURN."                    │
│                                                                         │
│  → Agent có đủ context để trả lời NGAY, không cần hỏi thêm             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## NGUYÊN TẮC THIẾT KẾ

| # | Nguyên tắc | Mô tả |
|---|------------|-------|
| 1 | **Always Attached** | Metadata đi kèm MỌI tương tác, không bao giờ "trần" |
| 2 | **Progressive Enrichment** | Làm giàu dần qua mỗi bước xử lý |
| 3 | **Token Budget Aware** | Context Builder phải tôn trọng token limit |
| 4 | **Relevance Scoring** | Chỉ đưa vào những gì LIÊN QUAN, không đổ hết |
| 5 | **Audit Everything** | Mọi thay đổi metadata đều được log |
| 6 | **PII Awareness** | Đánh dấu và xử lý đúng dữ liệu nhạy cảm |
