# MCP Contract v2.4 — Aligned with Agent Society Constitution v1.1, A2A Protocol Law v5.0, APP‑LAW v3.0

> **Status:** **Final Freeze** superseding v2.3. Uses **RFC2119** terms (MUST/SHOULD/MAY). **Backward‑compatibility maintained indefinitely** for legacy role aliases (see §3). All clauses agreed in v2.2/v2.3 are preserved unless explicitly updated below.

---

## 0) Scope & Normative References

**Scope.** Giao tiếp Client (Cursor/Codex/Apps) ↔ **Agent Data** cho quản trị tri thức dạng cây (CRUD/move/query) và điều phối tác vụ liên quan; đóng vai trò cầu nối lớp **Web App/PWA** theo App Plan.

**Normative references.**

* **A2A Protocol Law v5.0** (Message Envelope v2.2, transport profiles, artifact policy, error taxonomy).
* **Agent Society Constitution v1.1** (Guilds, SLO, reuse‑first, serverless‑first).
* **APP‑LAW v3.0 & App Service Plan v6.0** (API contract, error envelope, RBAC, SLOs, PWA concerns).
* **TF/GC/QD‑LAWs** (naming, UBLA, Signed URL policies) — áp dụng cho `artifact_uri`.

---

## Disposition of Grok Feedback — Round 3 (Chốt cuối)

**A. Đồng ý & đã bổ sung**

1. **Legacy roles alias (indefinite).** Hỗ trợ **vô thời hạn** mapping `cursor→agent`, `codex→editor` (không EOL). Phát sự kiện `*.deprecation` **hàng quý** để cảnh báo.
2. **Error‑budget example.** Bổ sung ví dụ **cách tính & cảnh báo error budget** trong §11, cạnh các SLI MQL/PromQL đã có.

**B. Giữ nguyên như v2.3 (đã đồng thuận)**

* **Langroid reuse (MUST).** Khi agent thực thi bằng Langroid, **MUST wrap** `payload.args` vào **Langroid ToolMessage** (maximize reuse, B1).
* **SLO profile‑based.** ACK P95 ≤ **1s** (A2A‑Basic/internal), ≤ **2s** (A2A‑External).
* **Optimistic‑lock details.** `409 CONFLICT` + `details={expected_revision, actual}`.
* **`/mcp/capabilities.max_concurrent`**, **artifact/Signed URL/UBLA**, **error 422**, **`routing.noop_qdrant` test‑mode only** (không tính PASS E2E RAG thật).

---

## 1) Transport Profiles (MUST)

**HTTP‑Sync via API Gateway/ESPv2**
Auth: IAM JWT (internal) hoặc **JWS Ed25519** (external).
Headers: `Idempotency‑Key`, `X‑RateLimit‑Limit`, `X‑RateLimit‑Remaining`, `Retry‑After`.

**Pub/Sub‑Async**
Flow control theo tenant; DLQ + redrive; `ack‑deadline` & retry backoff+jitter.

---

## 2) Message Envelope v2.2 (MUST)

Mọi request/response **MUST** gói trong Envelope sau. `payload.args` theo JSON‑Schema của từng action.

```json
{
  "envelope_version": "2.2",
  "request_id": "uuid",
  "correlation_id": "uuid",
  "trace_id": "traceparent",
  "tenant_id": "acme",
  "principal": {"sub": "svc:agent-cskh", "roles": ["agent", "editor"]},
  "timestamp": "2025-09-17T02:00:00Z",
  "ttl_sec": 300,
  "idempotency_key": "acme:subject-123:create_document:v1",
  "seq": 1,
  "action": "knowledge.create_document",
  "action_version": "1.0.0",
  "context_id": "thread-or-ui-context",
  "resource_links": [],
  "payload": { "schema_version": "1.0", "args": { /* action arguments */ } }
}
```

**Rules.** Idempotency scope = `(tenant_id, action, subject)`; cache ≥24h. Unsupported `action_version` ⇒ `INVALID_ARGUMENT` + gợi ý version. Out‑of‑order (`seq` giảm) ⇒ **ignore**.

---

## 3) Security Profiles (MUST)

* **A2A‑Basic (internal):** IAM/OIDC; optional mTLS.
* **A2A‑External:** **JWS Ed25519** (`kid`, `exp`, `iat`, `nonce`), key‑rotation ≤90d; reject weak/`alg=none`.
* **RBAC canonical:** `owner | editor | viewer | agent`.
* **Legacy aliases (indefinite support):** `cursor→agent`, `codex→editor` **được hỗ trợ vô thời hạn**; phát `*.deprecation` **hàng quý** (chỉ cảnh báo), **không đặt EOL**.

---

## 4) Responses & Error Taxonomy (MUST)

**Success**

```json
{ "ok": true, "data": { /* action-specific */ }, "usage": { "latency_ms": 0, "qdrant_hits": 0 } }
```

**Error**

```json
{ "ok": false, "error": { "code": "CONFLICT", "message": "...", "details": {"hint": "...", "trace_id": "..."} } }
```

**Codes:** `INVALID_ARGUMENT(400)`, `UNAUTHORIZED(401)`, `FORBIDDEN(403)`, `NOT_FOUND(404)`, `UNPROCESSABLE_ENTITY(422)`, `CONFLICT(409)`, `RATE_LIMIT_EXCEEDED(429)`, `EXPIRED(440)`, `UNAVAILABLE(503)`, `INTERNAL(500)`.

---

## 5) Artifact Policy & Large Payloads (MUST)

`artifact_uri` = **GCS Signed URL (GET‑only, TTL ≤ 15’) + `artifact_hash`(sha256)**. UBLA bật; MIME whitelist; bucket naming chuẩn; (tùy chọn) CMEK.

---

## 6) RBAC & Data Model Alignment (MUST)

* Roles: `owner` (tất cả), `editor` (CRUD), `viewer` (query), `agent` (read + limited create).
* Firestore Security Rules **MUST** enforce RBAC.
* **Optimistic lock:** mismatch `last_known_revision` ⇒ `409 CONFLICT` + `details={expected_revision, actual}`.
* `is_human_readable=true` kích hoạt web‑render path ở lớp app.

---

## 7) Capability Registry & Heartbeat

* **/mcp/capabilities** trả: `envelope_versions`, `actions[action, action_version, max_payload_bytes, max_concurrent]`, `transports`.
* **Heartbeat** mỗi 5’ (`healthy|degraded`) → registry `last_seen_at` + `revision`.

---

## 8) Actions — JSON‑Schema & Semantics (normative)

> **Conventions:**
> • Tất cả **request payloads** xác thực theo JSON‑Schema dưới `schemas/mcp/<action>.json`. **Responses** dùng §4.
> • **Langroid execution (MUST):** Khi agent thực thi bằng Langroid, **MUST wrap** `payload.args` vào **Langroid ToolMessage** (reuse‑first, B1).
> • **Test‑mode only:** `routing.noop_qdrant=true` cho phép bỏ qua RAG (usage.qdrant\_hits=0). Không dùng ở production; CI đánh dấu **không PASS** cho E2E yêu cầu RAG thật.

### 8.1 `knowledge.create_document` (v1.0.0)

**Args Schema**

```json
{
  "type": "object",
  "required": ["document_id", "parent_id", "content", "metadata"],
  "properties": {
    "document_id": {"type": "string", "format": "uuid"},
    "parent_id": {"type": "string"},
    "content": {
      "type": "object",
      "required": ["mime_type", "body"],
      "properties": {
        "mime_type": {"enum": ["text/markdown","text/plain","application/json"]},
        "body": {"type": "string"}
      }
    },
    "metadata": {
      "type": "object",
      "required": ["title"],
      "properties": {
        "title": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
        "source": {"type": "string"}
      }
    },
    "is_human_readable": {"type": "boolean", "default": true},
    "created_at": {"type": "string", "format": "date-time"}
  }
}
```

**Semantics.** `document_id` unique per tenant; `parent_id` MUST tồn tại (`root` cho top‑level). Success: `{ id, revision, web_uri? }`.

### 8.2 `knowledge.update_document` (v1.0.0)

**Args**

```json
{
  "type":"object",
  "required":["document_id","patch","update_mask"],
  "properties":{
    "document_id":{"type":"string","format":"uuid"},
    "patch":{
      "type":"object",
      "properties":{
        "content":{"$ref":"#/definitions/content"},
        "metadata":{"$ref":"#/definitions/metadata"},
        "is_human_readable":{"type":"boolean"}
      }
    },
    "update_mask":{"type":"array","items":{"type":"string"}},
    "last_known_revision":{"type":"integer","minimum":0}
  },
  "definitions":{
    "content":{"type":"object","properties":{"mime_type":{"type":"string"},"body":{"type":"string"}}},
    "metadata":{"type":"object","properties":{"title":{"type":"string"},"tags":{"type":"array","items":{"type":"string"}},"last_editor":{"type":"string"}}}
  }
}
```

**Semantics.** JSON Merge Patch; mismatch revision ⇒ `409 CONFLICT` + `details={expected_revision, actual}`. Success: trả `revision` mới.

### 8.3 `knowledge.delete_document` (v1.0.0)

**Args**

```json
{ "type":"object", "required":["document_id"], "properties":{
  "document_id": {"type":"string","format":"uuid"},
  "reason": {"type":"string"},
  "delete_at": {"type":"string","format":"date-time"}
}}
```

**Semantics.** Soft‑delete (`deleted=true`, lưu audit); auto‑purge **SHOULD** sau 90 ngày.

### 8.4 `knowledge.move_document` (v1.0.0)

**Args**

```json
{ "type":"object", "required":["document_id","new_parent_id"], "properties":{
  "document_id": {"type":"string","format":"uuid"},
  "new_parent_id": {"type":"string"},
  "position": {"type":"object","properties": {"ordering":{"type":"integer"},"before":{"type":"string"}}}
}}
```

**Semantics.** Cấm tạo chu kỳ; nếu có `before` thì reorder siblings, ngược lại append.

### 8.5 `knowledge.query_knowledge` (v1.0.0)

**Args**

```json
{
  "type":"object",
  "required":["query"],
  "properties":{
    "query": {"type":"string", "maxLength": 2048},
    "filters": {"type":"object", "properties": {"tags":{"type":"array","items":{"type":"string"}}, "tenant_id":{"type":"string"}}},
    "top_k": {"type":"integer","minimum":1,"maximum":20, "default":5},
    "context_hints": {"type":"object","properties": {"preferred_format":{"enum":["markdown","plain"]},"language":{"type":"string"}}},
    "routing": {"type":"object","properties": {"allow_external_search":{"type":"boolean","default":false},"max_latency_ms":{"type":"integer","minimum":1000,"maximum":10000,"default":4000},"noop_qdrant":{"type":"boolean","default":false}}}
  }
}
```

**Semantics.** Qdrant + LLM; test‑mode `noop_qdrant=true` ⇒ trả `context=[]`, `usage.qdrant_hits=0`. Empty results: `response:""`, `context:[]`.

---

## 9) Idempotency, TTL & Ordering (MUST)

* **ACK P95:** ≤ **1s** (A2A‑Basic), ≤ **2s** (A2A‑External).
* Replays cùng `idempotency_key` ⇒ trả kết quả trước.
* `seq` nhỏ hơn lần thấy gần nhất ⇒ **ignore**.

---

## 10) Versioning & Deprecation (MUST)

* `action_version` dùng SemVer. Breaking change ⇒ MAJOR bump + phát sự kiện `*.deprecation` ≥ 30 ngày.
* **Legacy aliases:** hỗ trợ **vô thời hạn**; chỉ phát `*.deprecation` **hàng quý** (không EOL).

---

## 11) Observability, SLOs & **SLI Examples** (MUST)

* Metrics: `a2a_requests_total, a2a_latency_ms, a2a_dlq_total, a2a_retries_total` (labels: action, tenant, principal, status, error.code).
* SLO tối thiểu: Job‑done **P95 ≤ ETA+60s**; DLQ/day **≤0.1%**; error‑budget **1%**.
* **SLI Examples (verifiable):**

  * **GCP MQL (ACK P95 – external, 7d):**

    ```
    fetch a2a_latency_ms
    | filter action == "knowledge.query_knowledge" && principal =~ "svc:.*"
    | align delta(1m)
    | every 1m
    | group_by [action], 95th_percentile(value)
    | within 7d
    ```
  * **PromQL (end‑to‑end latency P95):**

    ```
    histogram_quantile(0.95, sum(rate(a2a_latency_ms_bucket{action="knowledge.query_knowledge"}[5m])) by (le))
    ```
  * **DLQ rate (daily):**

    ```
    sum(increase(a2a_dlq_total[1d])) / sum(increase(a2a_requests_total[1d]))
    ```
  * **Error‑Budget Calculation (7d rolling window):**
    *Definition:* `error_rate = failures / total` với `failures = sum(increase(a2a_requests_total{status!="SUCCESS"}[7d]))`, `total = sum(increase(a2a_requests_total[7d]))`.
    **PromQL alert:**

    ```
    (sum(increase(a2a_requests_total{status!="SUCCESS"}[7d]))
     / sum(increase(a2a_requests_total[7d]))) > 0.01
    ```

    **MQL equivalent (threshold 1% over 7d):**

    ```
    let failures = fetch a2a_requests_total | filter status != "SUCCESS" | align delta(1m) | within 7d | sum(value);
    let total    = fetch a2a_requests_total | align delta(1m) | within 7d | sum(value);
    (failures / total) > 0.01
    ```

    *Action:* **Alert** nếu điều kiện đúng liên tục ≥ N khoảng đánh giá (tùy chính sách), và trừ dần **error budget 1%** theo quý.

---

## 12) Conformance & E2E Mapping (MUST)

* **Conformance tests:** Envelope validation, Idempotency/TTL/Ordering, Error handling, Security (JWS), Large artifact, Version negotiation, Noop routing, RBAC, ToolMessage wrapping.
* **E2E mapping:** E2E‑01 Conflict Drafting; E2E‑02 Layered Inquiry; E2E‑03 Saga; E2E‑04 Protocol; E2E‑05 Artifact; E2E‑06 External Security.

---

## 13) Change Log

* **v2.4**: Indefinite legacy role aliases (no EOL; quarterly deprecation warnings); thêm **Error‑Budget example** (7d, 1%); giữ nguyên mọi điều khoản đã chốt ở v2.3/v2.2.

---

### Appendix A — Minimal Error Code Table

| code                  | http | semantics                             |
| --------------------- | ---- | ------------------------------------- |
| INVALID\_ARGUMENT     | 400  | Envelope/schema invalid               |
| UNAUTHORIZED          | 401  | Missing/invalid auth                  |
| FORBIDDEN             | 403  | RBAC denies action                    |
| NOT\_FOUND            | 404  | Resource missing                      |
| UNPROCESSABLE\_ENTITY | 422  | JSON‑Schema/body invalid at app layer |
| CONFLICT              | 409  | Revision / optimistic lock conflict   |
| RATE\_LIMIT\_EXCEEDED | 429  | Quota exceeded (Retry‑After)          |
| EXPIRED               | 440  | TTL expired                           |
| UNAVAILABLE           | 503  | Upstream/temp unavailable             |
| INTERNAL              | 500  | Unexpected error                      |

### Appendix B — Example Interaction (HTTP)

1. **Request** headers: `Authorization: Bearer …`, `Idempotency‑Key: …`
2. **Body**: Envelope §2 với `action=knowledge.create_document`.
3. **Response**: `{ ok: true, data: { id, revision, web_uri } }` hoặc Error §4.

### Appendix C — Bucket & Signed URL Requirements

* Bucket naming: `<standard-prefix>-agent-data-<purpose>-<env>`; **UBLA** bật.
* Signed URL **GET‑only**; TTL ≤ 15’; disallow list; (tùy chọn) **CMEK**.

### Appendix D — `/mcp/capabilities` Response (example)

```json
{
  "envelope_versions": ["2.2"],
  "actions": [
    {"action": "knowledge.create_document", "action_version": "1.0.0", "max_payload_bytes": 131072, "max_concurrent": 10},
    {"action": "knowledge.update_document", "action_version": "1.0.0", "max_payload_bytes": 131072, "max_concurrent": 10},
    {"action": "knowledge.delete_document", "action_version": "1.0.0", "max_concurrent": 10},
    {"action": "knowledge.move_document", "action_version": "1.0.0", "max_concurrent": 10},
    {"action": "knowledge.query_knowledge", "action_version": "1.0.0", "max_payload_bytes": 65536, "max_concurrent": 10}
  ],
  "transports": ["http-sync","pubsub-async"]
}
```
