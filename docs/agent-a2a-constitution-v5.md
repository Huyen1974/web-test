### Hiến pháp Giao tiếp và Cộng tác Giữa các Agent (v5.0 - Final Freeze)

Phần giới thiệu này được tinh chỉnh để phản ánh các tiêu chuẩn mới nhất, nhấn mạnh hơn nữa về khả năng mở rộng, và tích hợp các cập nhật mới nhất từ năm 2025 như merger ACP-A2A dưới LF AI, nhằm tận dụng tối đa mã nguồn hiện có từ các framework như MCP/Anthropic, A2A/Google, ACP/IBM, và OAS/HuggingFace để giảm thiểu viết mã mới.)*

#### Phần I: Các Nguyên tắc Nền tảng (The Constitution)

1. **Nguyên tắc Tương thích Mở (Interoperability First):** (Tinh chỉnh từ v3.0) Hệ thống ưu tiên áp dụng các giao thức mở được cộng đồng công nhận (ví dụ: MCP của Anthropic với cập nhật security và structured output Jun 18 2025, A2A/Google với toolkit secure enterprise Jul 31 2025, ACP/IBM merger với A2A dưới LF AI Aug 29 2025, OAS/HuggingFace cho open collab MMORPG AI NPC) và theo dõi các xu hướng hợp nhất tiêu chuẩn (ví dụ: sự hợp nhất của A2A/Google và ACP/IBM dưới LF AI) để đảm bảo khả năng tương tác rộng rãi, tận dụng adapter hiện có như Langroid MCP adapter v0.53.0 (Apr 2025) và LangChain MCP streamable HTTP (May 8 2025).

2. **Nguyên tắc Chuẩn hóa Giao thức (Standardized Protocol):** (Giữ nguyên từ v3.0) Mọi giao tiếp trực tiếp giữa các Agent phải tuân thủ một giao thức chung, có cấu trúc.

3. **Nguyên tắc Chuyên môn hóa (Specialization):** (Giữ nguyên từ v3.0) Mỗi Agent được thiết kế để giải quyết một nhóm vấn đề cụ thể và chỉ làm tốt nhất việc đó.

4. **Nguyên tắc Bất đồng bộ (Asynchronous-First):** (Giữ nguyên từ v3.0) Giao tiếp qua hàng đợi tin nhắn (Message Queue) như Pub/Sub là phương thức được ưu tiên.

5. **Nguyên tắc Idempotency:** (Giữ nguyên từ v3.0) Mọi hành động làm thay đổi trạng thái phải được thiết kế để có thể thực thi lại nhiều lần mà không gây ra kết quả ngoài ý muốn.

6. **Nguyên tắc Xác minh Độc lập (Independent Verification):** (Giữ nguyên từ v3.0) Một Agent không được coi là hoàn thành nhiệm vụ chỉ dựa trên lời xác nhận của Agent khác; nó phải tự mình xác minh kết quả cuối cùng.

7. **Nguyên tắc Mở rộng và Bền bỉ (Scalability & Resilience):** (Tinh chỉnh từ v3.0) Hệ thống phải được thiết kế để xử lý hàng trăm Agent và quy trình đồng thời, với cơ chế tự phục hồi (retry, DLQ) và phân tải, đồng thời tận dụng mã nguồn hiện có từ các framework như LangChain CrewAI (multi-agent teams, MCP streamable May 8 2025) hoặc Langroid MAP (delegation Sep 2025) để giảm thiểu viết mã mới.

#### Phần II: Giao thức Giao tiếp Chuẩn v5.0 (The Law for Basic Communication)

* (Tinh chỉnh giới thiệu để bổ sung schema & SDK sinh tự động, transport profiles, artifact policy siết mạnh, và timeout & ETA chuẩn hoá; các thay đổi nhằm tăng cường reuse dịch vụ managed và giảm mã mới, hợp lý vì khớp với mục tiêu tận dụng tối đa mã có sẵn như JSON Schema và API Gateway.)*

1. **Tiêu chuẩn Áp dụng:** (Tinh chỉnh từ v3.0) Nền tảng là **OpenAI Function Calling**, được thực thi thông qua một **Message Envelope** chuẩn hóa, hybrid với MCP structured output (Jun 18 2025) để hỗ trợ tool results/resource links.

*(Bổ sung từ góp ý GPT5 về Schema & SDK sinh tự động để giảm mã mới, hợp lý vì tận dụng codegen từ OpenAPI/JSON-Schema, tránh hand-rolled code.)*

payload.schema_version MUST map tới một JSON Schema trong repo schemas/…; CI BLOCK nếu payload không validate. SDK TS/Python MUST be generated từ OpenAPI/JSON-Schema; không merge nếu SDK không đồng bộ.

2. **Cấu trúc Phong bì Tin nhắn (Message Envelope v2.2 - BẮT BUỘC):** (Bổ sung resource_links, context_id, và quy định encryption cho payload sensitive.)

JSON

{

  "version": "1.0",

  "request_id": "<uuid>",

  "correlation_id": "<uuid>",

  "causation_id": "<uuid>", // ID của tin nhắn gây ra hành động này

  "trace_id": "<w3c-trace-id>",

  "tenant_id": "<string>",

  "data_locality": "<string>", // Ví dụ: "asia-southeast1"

  "principal": {"sub": "service-account-id", "roles": ["agent-role"]},

  "timestamp": "<RFC3339>",

  "ttl_sec": 300,

  "idempotency_key": "<uuid-or-hash>",

  "seq": 1,

  "action": "agent_data.update_document",

  "action_version": "1.0.0", // Phiên bản của hành động (semver, deprecation ≥30 ngày cho thay đổi phá vỡ)

  "context_id": "<uuid>", // MCP elicitation request info (Jun 18 2025)

  "resource_links": [], // MCP structured output (tool results/resource links, Jun 18 2025)

  "payload": {

    "schema_version": "1.0", // Phiên bản của payload

    "..." : "..." // arguments của function call, encrypt JWT nếu sensitive (A2A secure Jul 31 2025)

  }

}

Ghi chú Vận hành:
•	idempotency_key được scope theo tenant_id + action + subject (nếu có) và được cache tối thiểu 24 giờ.
•	seq tăng đơn điệu theo subject; sẽ được reset khi subject thay đổi hoặc khi action_version có thay đổi LỚN (MAJOR). Các yêu cầu thiếu seq sẽ bị từ chối với lỗi INVALID_ARGUMENT.

3. **Máy trạng thái & Quy tắc Phản hồi (State Machine & Response - Tinh chỉnh):** (Bổ sung các trạng thái và quy tắc hủy tác vụ đầy đủ.)

4. **Máy trạng thái:** Một tác vụ sẽ đi qua các trạng thái: ACKED → RUNNING → (SUCCEEDED | FAILED) → (COMPENSATED? | CANCELLED?).

5. **Phản hồi:**

6. **Đồng bộ (<2s):** Trả về SUCCEEDED hoặc FAILED.

7. **Bất đồng bộ:** Trả về ACKED, sau đó phát các sự kiện *.running, *.done.

8. **Hủy tác vụ:** Một Agent có thể gửi một hành động *.cancel. Nếu tác vụ đang ở trạng thái RUNNING, nó sẽ chuyển sang CANCELLED và kích hoạt hành động bù trừ (compensation) nếu cần; semantics at-least-once, đích MUST dedupe theo idempotency_key và bỏ qua out-of-order nếu seq < last_seq_seen.

9. **Phân loại Lỗi & TTL (Error Taxonomy & TTL):** (Bổ sung mã lỗi EXPIRED và RATE_LIMIT_EXCEEDED.)

10. (Giữ nguyên từ v3.0) Mã lỗi chuẩn: UNAUTHORIZED (401), FORBIDDEN (403), NOT_FOUND (404)...

11. **(Bổ sung)** Nếu một tin nhắn bị xử lý sau khi ttl_sec đã hết hạn, Agent phải từ chối và trả về lỗi EXPIRED. Nếu vượt quota, trả lỗi RATE_LIMIT_EXCEEDED.

12. **Quy tắc Vận chuyển & Tải lớn (Transport & Large Payloads):** (Tinh chỉnh chính sách Signed URL siết chặt.)

Fairness & Backpressure: Các subscriber trên Pub/Sub phải thiết lập max_outstanding_bytes/messages và giới hạn xử lý đồng thời cho mỗi tenant (per-tenant concurrency cap) để đảm bảo sự công bằng. Khi nhận được lỗi RATE_LIMIT_EXCEEDED, client phải thực hiện backoff theo header Retry-After.

13. (Giữ nguyên từ v3.0) Hỗ trợ 2 kênh: HTTP và Pub/Sub.

*(THÊM MỚI: Bổ sung từ góp ý GPT5 về Transport profiles để reuse dịch vụ managed như API Gateway/ESPv2 và Pub/Sub flow control, hợp lý vì giảm viết mã mới bằng cách dùng dịch vụ sẵn có.)*

“HTTP-sync qua API Gateway/ESPv2 (JWT, X-RateLimit-*, Retry-After). Pub/Sub-async bật flow control + ack-deadline + DLQ; quota theo principal/tenant_id; vượt quota ⇒ RATE_LIMIT_EXCEEDED (event).”

14. **(Tinh chỉnh)** Nếu payload quá lớn, artifact_uri bắt buộc phải là một GCS Signed URL **chỉ cho phép đọc (GET-only)**, có **TTL ≤ 15 phút**, đi kèm với artifact_hash (SHA-256), MIME whitelist, fixed bucket, no-list.

*(THÊM MỚI: Bổ sung chi tiết từ góp ý GPT5 về Artifact policy siết mạnh với UBLA + CMEK, hợp lý vì tăng bảo mật mà không cần viết mã mới, tận dụng GCS features.)*

artifact_uri ⇒ GCS (UBLA + CMEK); Signed URL GET-only, TTL ≤ 15’, MIME whitelist, fixed bucket, no-list; kèm artifact_hash (SHA-256).

*(THÊM MỚI: Bổ sung từ góp ý GPT5 về Timeout & ETA để tránh treo, hợp lý vì tăng resilience mà không phức tạp.)*

ACK ≤ 1s; mỗi bước timeout 5’ (override bằng eta_sec); quá ttl_sec trả EXPIRED.

#### Phần III: Khung Điều phối Quy trình Phức hợp (The "Process Factory" Framework)

*(GIỮ NGUYÊN từ V4 toàn bộ phần này.)*

1. **Mô hình Kiến trúc:** (Tinh chỉnh) Áp dụng mẫu thiết kế **Saga**, được hiện thực hóa bằng **Google Cloud Workflows** hoặc các framework điều phối đa-agent như **LangChain CrewAI** (multi-agent teams, MCP streamable May 8 2025) hoặc Langroid MAP (delegation Sep 2025).

2. **Hệ thống Agent Chuyên biệt:** (Giữ nguyên từ v3.0) Process Agent, Data Agent, Verifier Agent, Notifier Agent.

3. **Hợp đồng Bằng chứng Xác minh (Verifier Artifact Contract):** (Giữ nguyên từ v3.0) Verifier Agent khi tạo bằng chứng phải trả về đối tượng có cấu trúc: { "artifact_uri", "artifact_hash", "content_type", "evidence_ts", "source_kind" }.

#### Phần IV: Bảo mật & Khả năng Mở rộng (Security & Scalability)

*(Bổ sung integrity cho external agents và security profiles, hợp lý vì tăng bảo mật cho hệ sinh thái multi-agent, tận dụng JWS sẵn có.)*

1. **Xác thực Agent-to-Agent (A2A):** (Tinh chỉnh) principal trong Message Envelope phải được xác thực qua Google Cloud IAM hoặc JWT. Các client bên ngoài phải tuân thủ các tiêu chuẩn bảo mật nâng cao như **OAuth 2.0 Resource Indicators (RFC 8707)** (MCP Jun 18 2025 chống malicious).

*( Bổ sung Integrity cho External Agents, hợp lý vì giảm rủi ro khi mở rộng với Cursor/Codex.)*

Thông điệp từ external agents BẮT BUỘC phải kèm chữ ký JWS (thuật toán Ed25519/EdDSA); header phải có kid (key ID) và chính sách luân chuyển khóa là 90 ngày. Các yêu cầu có thuật toán không nằm trong danh sách cho phép sẽ bị từ chối..

*(Bổ sung từ góp ý GPT5 về Security profiles như nice-to-have, hợp lý vì phân biệt nội bộ/external, tăng reuse.)*

Security profiles: A2A-Basic (nội bộ) & A2A-External (yêu cầu JWS, throttle chặt hơn).

2. **Giới hạn Tần suất (Rate Limiting):** (Tinh chỉnh) Ngoài các header X-RateLimit-*, các Agent xử lý qua Pub/Sub cũng phải có cơ chế enforce quota dựa trên principal và tenant_id; đồng bộ trả X-RateLimit-Limit / X-RateLimit-Remaining / Retry-After; bất đồng bộ trả event lỗi nếu vượt.

3. **Hàng đợi & DLQ:** (Giữ nguyên từ v3.0) Bắt buộc có DLQ, retry 6 lần với exponential backoff + jitter; DLQ redrive thủ công với audit (dùng tool TD-APP-02).

4. **Giám sát & Truy vết (Trace & Observability):** (Bổ sung metric retry.)

5. (Giữ nguyên từ v3.0) trace_id phải được truyền suốt.

6. **(Bổ sung)** Metrics bắt buộc: a2a_requests_total, a2a_latency_ms, a2a_dlq_total, a2a_retries_total (với nhãn: action, tenant, principal, status, error.code); monitor quota points MCP advanced (Jun 18 2025).

7. SLOs tối thiểu: ACK P95 ≤ 1s, Job-done P95 ≤ ETA + 60s, DLQ/ngày ≤ 0.1%.

#### Phần V: Hướng dẫn Triển khai & Kiểm thử Hợp chuẩn (Implementation & Conformance)

*Capability Registry và reference impl., hợp lý vì tăng auto-discover và reuse repo examples.)*
*Heartbeat: Mỗi agent BẮT BUỘC phải gửi một tin nhắn heartbeat đến Registry theo chu kỳ (ví dụ: 5 phút/lần). Registry sẽ lưu lại last_seen_at và có thể đánh dấu agent là degraded nếu không nhận được heartbeat, cho phép các Process Agent có thể chủ động giảm tải hoặc định tuyến lại các tác vụ. *

1. **Các Service Chuẩn hóa:** (Bổ sung action_version.)

2. (Giữ nguyên từ v3.0) /healthz, /readyz, /evidence/{job_id}.

3. **(Tinh chỉnh)** /mcp/capabilities: Công bố envelope_versions, danh sách actions (kèm action_version và max_payload_bytes), và transports; thêm /acp/capabilities cho merger ACP-A2A.

*(THÊM MỚI: Bổ sung từ góp ý GPT5 về Capability Registry, hợp lý vì làm nguồn sự thật trung tâm, CI so khớp.)*

Agent Data duy trì registry liệt kê actions, action_version, transports, max_payload_bytes của từng agent; /mcp/capabilities MUST khớp registry (CI so khớp).

*(THÊM MỚI: Bổ sung từ góp ý GPT5 về Deprecation policy mở rộng, hợp lý vì vận hành thực chiến.)*

Breaking change ⇒ bump MAJOR + phát *.deprecation ≥30 ngày trước khi gỡ; registry đánh dấu sunset_at.

4. Bộ Kiểm thử Hợp chuẩn (Conformance Test Suite):** (Bổ sung các bài test mới.)

5. Envelope Validation, Idempotency Test, Error Handling Test, Security Test, Large-payload Test, Out-of-order Test, TTL Test, Evidence Test.

6. Version-negotiation Test: Client gửi một action_version không được hỗ trợ và phải nhận về lỗi INVALID_ARGUMENT + gợi ý phiên bản.

7. Cancel/Compensation Test: Gửi yêu cầu hủy khi tác vụ đang chạy và xác nhận nhận được sự kiện *.cancelled hoặc *.compensated.

8. Multi-agent E2E Test: Mô phỏng một quy trình hoàn chỉnh (ví dụ: Codex → Process Agent → Data Agent → Verifier Agent) và đo lường SLOs (P95 ≤1s ACK).

*( Bổ sung từ góp ý GPT5 về Reference impl. như nice-to-have, hợp lý vì cung cấp repo examples dùng Workflows + Pub/Sub.)*

Reference impl.: 1 repo “a2a-examples” dùng Workflows + Pub/Sub + API Gateway, générate SDK & conformance test (E2E multi-agent đã có trong V4).

#### Phần VI: Phụ lục

*(Bổ sung naming conventions, hợp lý vì tăng chuẩn hoá mà không phức tạp.)*

1. **Liên kết đến các Tiêu chuẩn:**

2. Tài liệu về MCP (Anthropic) - Changelog Jun 18 2025: security (OAuth Resource Servers, RFC 8707), structured output (tool results/resource links), elicitation (request info).

3. Tài liệu về A2A/ACP (LF AI) - Merger Aug 29 2025 (IBM contribute BeeAI open-source).

4. Tài liệu về OpenAI Function Calling.

5. Tài liệu về OAS/HuggingFace (MMORPG AI NPC, SmolAgents code-based 2025).

6. **Ví dụ Mã nguồn:**

7. Mã nguồn mẫu cho Langroid ToolMessage triển khai Message Envelope v2.2 (hybrid MCP/A2A, adapter Apr 2025).

```python

from langroid.agent.tool_message import ToolMessage

from pydantic import BaseModel

class A2AEnvelope(BaseModel):  # v2.2 Envelope

    sender_id: str

    receiver_id: str

    principal: str

    idempotency_key: str

    seq: int  # Sequence number

    ttl: int  # Time-to-live in seconds

    artifact_uri: str = None  # For large payload

    context_id: str  # MCP context (Jun 2025)

    resource_links: list = []  # MCP structured output (Jun 2025)

    action_name: str

    arguments: dict

class Response(ToolMessage):

    status: str

    data: dict = None

    error: dict = None

# Process Agent handle

def handle_request(self, envelope: A2AEnvelope):

    if envelope.ttl < 0 or envelope.seq < last_seq:  # Check ttl/seq

        return Response(status="FAILURE", error={"code": "EXPIRED", "message": "TTL/Seq invalid"})

    # Xử lý, return Response

    return Response(status="SUCCESS", data={"result": "updated"})

```

8. Mã nguồn mẫu cho một Saga đơn giản trên Google Cloud Workflows (tích hợp LangChain CrewAI).

*( Bổ sung Naming conventions, hợp lý vì chuẩn hoá naming cho events/topics.)*

Naming conventions: action = {domain}.{verb}_{object}, event = {domain}.{verb}_{object}.{accepted|running|done|cancelled|compensated}, topic a2a.{domain}.{env}, DLQ a2a.{domain}.{env}.dlq.

9. **Bảng thuật ngữ:**

10. (Bổ sung các thuật ngữ mới như A2A, ACP, OAS, MCP, Saga, DLQ, SLOs...)
