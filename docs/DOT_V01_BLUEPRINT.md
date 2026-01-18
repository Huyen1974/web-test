# DOT (Directus Operations Toolkit) v0.1 BLUEPRINT

## 0) Mục tiêu và phạm vi

### Mục tiêu dài hạn
*   **Directus UI = READ/INSPECT ONLY**
*   Mọi thao tác WRITE (Flows, Operations, Env wiring, verify) đều phải đi qua DOT (Directus Operations Toolkit) để:
    *   **deterministic** (lặp lại giống nhau)
    *   **có log + report**
    *   **có version control** (git/PR)
    *   **có rollback**
    *   **AI chạy được**, không phụ thuộc UI

### Phạm vi DOT v0.1 (MVP)
DOT v0.1 chỉ giải quyết đúng bài toán hiện tại (Phase B):
1.  Tạo/Upsert 2 Flow test cho wiring Directus ↔ Agent Data
2.  Trigger test và verify kết quả
3.  Sinh report + cập nhật DoD trong `PHULUC_17_E1_BLUEPRINT.md`
4.  Tạo PR (main protected)

### Không làm v0.1:
*   Schema migrations
*   Permissions/roles phức tạp
*   Multi-environment promotion (sẽ làm v0.2)

---

## 1) Các nguyên tắc “Luật DOT”

1.  **No-UI-Write:** UI chỉ để xem; mọi thay đổi phải qua DOT.
2.  **No-Secret-Print:** DOT không được in secret value ra stdout/log/report.
3.  **Evidence-First:** Mọi “DONE” phải có bằng chứng (HTTP code, IDs, timestamps).
4.  **Idempotent:** Chạy lại DOT không tạo rác; nếu Flow đã tồn tại thì update chứ không duplicate.
5.  **Rollback-Ready:** Mọi resource tạo ra phải có cách remove.
6.  **PR-First:** Mọi cập nhật docs/report đều qua branch + PR.

---

## 2) Kiến trúc DOT v0.1

### 2.1 Thư mục đề xuất
```
dot/
  specs/
    directus_flows.v0.1.json
  bin/
    dot-auth
    dot-apply
    dot-verify
    dot-report
    dot-rollback
  reports/
    DOT_APPLY_REPORT.md
    DOT_VERIFY_REPORT.md
    DOT_RUN_SUMMARY.md
  README.md
```

### 2.2 Runtime requirements
*   `bash`, `curl`, `jq`
*   `gh` (GitHub CLI)
*   **Không dùng Python v0.1** (giảm rủi ro môi trường)
### 2.3 dot/.gitignore (Mandatory)
Include:
```
.token
.env
reports/*.log
reports/*.tmp
```
**Safety Rule:** DOT must not print tokens; temporary token files are discouraged, but gitignore is required as a safety net.
---

## 3) Contract: directus_flows.v0.1.json (DECISION RECORD)

### Decision Record (v0.1)
*   **Problem:** Runtime requirements list only `bash`/`curl`/`jq`; YAML parsing in bash is fragile without `yq`.
*   **Decision:** For DOT v0.1, use **JSON spec file** (`dot/specs/directus_flows.v0.1.json`).
*   **Note:** The YAML below is for documentation/readability; the actual runnable spec is JSON.

### 3.1 Mục tiêu contract
*   Agent đọc YAML là biết phải tạo gì.
*   DOT reads JSON spec: `dot/specs/directus_flows.v0.1.json` (YAML is documentation-only).

### 3.2.1 Env Var Syntax Note
*   **CRITICAL:** DOT must send `{{$env.VAR}}` strings **AS-IS**.
*   Do **NOT** resolve environment variables before sending payload to Directus. Directus itself resolves them at runtime.

### 3.2 Schema (v0.1)
```yaml
directus:
  base_url: "https://directus-test-pfne2mqwja-as.a.run.app"
  auth:
    mode: "password_login"   # v0.1
    email_secret_name: "DIRECTUS_ADMIN_EMAIL_test"   # future (v0.2)
    password_secret_name: "DIRECTUS_ADMIN_PASSWORD_test" # future (v0.2)

env:
  agent_data_url: "{{$env.AGENT_DATA_URL}}"   # must be present in Cloud Run
  agent_data_api_key: "{{$env.AGENT_DATA_API_KEY}}"

flows:
  - name: "[DOT] Agent Data Health Check"
    status: "active"
    trigger: "webhook"
    options: {}
    operations:
      - name: "Check Info Endpoint"
        key: "check_info"
        type: "request"
        position_x: 10
        position_y: 10
        options:
          method: "GET"
          url: "{{$env.AGENT_DATA_URL}}/info"
          headers: []
          body: ""

  - name: "[DOT] Agent Data Chat Test"
    status: "active"
    trigger: "webhook"
    options: {}
    operations:
      - name: "Send Chat Query"
        key: "send_chat"
        type: "request"
        position_x: 10
        position_y: 10
        options:
          method: "POST"
          url: "{{$env.AGENT_DATA_URL}}/chat"
          headers:
            - header: "Content-Type"
              value: "application/json"
            - header: "x-api-key"
              value: "{{$env.AGENT_DATA_API_KEY}}"
          body: "{\"query\": \"hello from dot v0.1\"}"
```

### 3.2.2 JSON Spec Example (SSOT for dot/specs/directus_flows.v0.1.json)
```json
{
  "directus": {
    "base_url": "...",
    "auth": { ... }
  },
  "env": {
    "agent_data_url": "{{$env.AGENT_DATA_URL}}",
    "agent_data_api_key": "{{$env.AGENT_DATA_API_KEY}}"
  },
  "flows": [
    {
      "name": "[DOT] Agent Data Health Check",
      "status": "active",
      "trigger": "webhook",
      "options": {},
      "operations": [
        {
          "name": "Check Info Endpoint",
          "key": "check_info",
          "type": "request",
          "position_x": 10,
          "position_y": 10,
          "options": {
            "method": "GET",
            "url": "{{$env.AGENT_DATA_URL}}/info",
            "headers": [],
            "body": ""
          }
        }
      ]
    }
  ]
}
```

### Ghi chú quan trọng:
*   v0.1 dùng trigger webhook để test deterministically (không cần UI context).
*   Header `x-api-key` gửi luôn (future-proof) dù Agent Data hiện public.
*   Directus uses `key` as the stable identifier; DOT must upsert operations by key, not by display name.

### 3.3 Trigger Type Decision (v0.1)
*   **Decision:** DOT v0.1 uses **WEBHOOK** trigger (not Manual) for AI-triggerable flows.
*   **Sync Requirement:** This requires syncing `PHULUC_17_E1_BLUEPRINT.md` (Manual → Webhook).

---

## 4) Directus API contract DOT cần dùng (v0.1)

### 4.X Directus API Reality (Verified SSOT)
**Source:** `reports/DIRECTUS_API_INVESTIGATION.md` (Probe Result)

*   **Verified Facts:**
    1.  `/server/info` returns: `project_name="Agency OS"`, `version=null` (version unknown).
    2.  Existing flows count = 0; operations count = 0.
    3.  Minimal flow creation works with payload: `{"name":"[DOT-TEST] Minimal Flow","status":"inactive","trigger":"manual"}` (trigger optional).
    4.  `POST /flows/trigger/{id}` exists but returns **403 Forbidden** (even with Bearer token) in current config.

*   **Implications for DOT:**
    *   **Do NOT** branch logic on Directus version number (it is null).
    *   `dot-verify` must treat 403 as “misconfigured trigger/permissions” and **fail-fast** with clear report.
    *   DOT must create flows with `status="active"` and `trigger="webhook"` for verification attempts.

### 4.Y Verified Facts (Updated from Probe Results)

| Item | Status | Evidence |
|------|--------|----------|
| Operation type name | ✅ VERIFIED: `"request"` | Probe created operation successfully |
| Operation options schema | ✅ VERIFIED | See Section 4.Y.1 |
| Position fields required | ✅ VERIFIED: `position_x`, `position_y` mandatory | 400 error without them |
| Auto-linking behavior | ✅ VERIFIED: Via `flow` field | Operations array auto-populated |
| Trigger 403 issue | ⚠️ CONFIRMED BLOCKER | All attempts return 403 Forbidden |

### 4.Y.1 Verified Payload Structures (SSOT from Probe)

#### Flow Creation (Webhook Type)
```json
{
  "name": "[DOT] Flow Name Here",
  "status": "active",
  "trigger": "webhook",
  "options": {}
}
```

#### Operation Creation (HTTP Request Type)
```json
{
  "name": "Operation Display Name",
  "key": "unique_operation_key",
  "type": "request",
  "flow": "{{FLOW_ID}}",
  "position_x": 10,
  "position_y": 10,
  "options": {
    "method": "POST",
    "url": "{{$env.AGENT_DATA_URL}}/chat",
    "headers": [
      {
        "header": "Content-Type",
        "value": "application/json"
      },
      {
        "header": "x-api-key",
        "value": "{{$env.AGENT_DATA_API_KEY}}"
      }
    ],
    "body": "{\"query\": \"{{$trigger.payload.question}}\"}"
  }
}
```

- Directus variables `{{$env.VAR}}` phải gửi AS-IS, không resolve trước

### 4.2.1 Minimum Payload Fields (v0.1 Probe-Verified)
*   **Flow POST/PATCH:**
    *   Required: `name`, `status` ("active"), `trigger` ("webhook"), `options` ({}).
    *   Optional: `icon`, `color`, `description`.
    *   Note: `track_activity` is optional / not verified (do not call vital).
*   **Operation POST/PATCH:**
    *   Required: `name`, `key`, `type` ("request"), `flow`, `position_x`, `position_y`.
    *   Required Options: `method`, `url`.
    *   Optional Options: `headers` (array of objects), `body` (string).
*   **Compatibility Notes:**
    *   Flow payload must include `trigger` (webhook) and trigger options if required by API.
    *   Operation `type` naming may differ by Directus version (e.g., `request` vs `request_url`). DOT must fail-fast with clear error if type invalid.

### 4.Z Implementation Readiness

> ✅ **PROBE COMPLETE:** Flow và Operation creation payloads đã verified.
>
> ⚠️ **TRIGGER BLOCKER:** `POST /flows/trigger/{id}` trả 403 Forbidden.
>
> **Decision Required:** Chọn 1 trong 2 hướng:
> - **Option A:** Điều tra thêm để fix trigger permissions
> - **Option B:** Implement DOT với alternative verification method (manual UI trigger hoặc event-based)

### 4.1 Auth (Credential Management)
*   **Priority Order:**
    1.  Env vars: `DIRECTUS_ADMIN_EMAIL`, `DIRECTUS_ADMIN_PASSWORD` (Runtime/CI)
    2.  GSM secrets: `DIRECTUS_ADMIN_EMAIL_test`, `DIRECTUS_ADMIN_PASSWORD_test` (Project: `github-chatgpt-ggcloud`)
    3.  Interactive prompt (Local Dev fallback)
*   **Policy:** Token in-memory only; **never** print; auto re-auth on 401.

### 4.1.1 Secret Inventory – DOT v0.1 (SSOT)

### Required Secrets for DOT v0.1

| Secret Name | Purpose | Used By | Scope | Status |
|---|---|---|---|---|
| `AGENT_DATA_API_KEY` | API key for calling Agent Data service from Directus Flow | Directus Flow, DOT | Phase B | ✅ Verified |
| `DIRECTUS_ADMIN_EMAIL_test` | Admin email for Directus API authentication | DOT (`dot-auth`) | DOT v0.1 | ✅ Verified |
| `DIRECTUS_ADMIN_PASSWORD_test` | Admin password for Directus API authentication | DOT (`dot-auth`) | DOT v0.1 | ✅ Verified |

### Notes (CRITICAL)

- All secrets are stored in **Google Secret Manager**
- Secret values are **never committed** to Git or DOT specs
- DOT retrieves secrets at runtime via:
  1. Environment variables (preferred)
  2. Google Secret Manager (fallback)
- DOT assumes all secrets listed here **exist and are enabled**
- If a secret name changes, this section MUST be updated before running DOT

### Traceability

- Secret existence verified via infrastructure audit
- This section is the **authoritative SSOT** for DOT v0.1 secret requirements
- Downstream documents (e.g. Phụ lục 17) must sync from this list

### 4.2 Flow upsert (mục tiêu idempotent)
*   `GET /flows?filter[name][_eq]=...` (tìm flow theo name)
    *   Nếu có → `PATCH /flows/{id}`
    *   Nếu chưa → `POST /flows`
*   Operation:
    *   `GET /operations?filter[flow][_eq]={flow_id}` + filter by name/key
    *   PATCH nếu tồn tại, POST nếu chưa

### 4.2.1 Minimum Payload Fields (v0.1)
*   **Flow POST/PATCH:**
    *   `name`, `status` ("active"), `icon`, `color`.
    *   `options`: `{"track_activity": true}` (vital for debugging).
*   **Operation POST/PATCH:**
    *   `name`, `key` (deterministic ID).
    *   `type` ("request"), `position_x`, `position_y`.
    *   `flow` (parent ID).
    *   `options`: `method`, `url`, `body`, `headers`.
*   **Compatibility Notes:**
    *   Flow payload must include `trigger` (webhook) and trigger options if required by API.
    *   Operation `type` naming may differ by Directus version (e.g., `request` vs `request_url`). DOT must fail-fast with clear error if type invalid.

### 4.2.2 Error Parsing SSOT (dot-verify)
*   **403 Format:** `.errors[0].message` and `.errors[0].extensions.code`
*   **Validation Format:** `.message` with `.extensions.field` etc.
*   **dot-verify Parsing Priority:**
    1.  `.errors[0].message`
    2.  `.message` (legacy)
    3.  Raw first 200 chars (fallback)

### 4.3 Trigger webhook
Trigger endpoint: tùy Directus version, DOT phải hỗ trợ 2 khả năng:
*   **Option 1:** `/flows/trigger/{flow_id}` (nếu instance hỗ trợ)
*   **Option 2:** webhook URL riêng do Directus trả (nếu có)
*   => v0.1: DOT verify phải “detect” endpoint hợp lệ và report rõ.
    *   Try `GET` or `POST` to `/flows/trigger/{flow_id}` first.
    *   If 404/401, query flow details to locate webhook/trigger endpoint.
        *   After 404/401 on `/flows/trigger/{id}`, call authorized `GET /flows/{id}` to inspect trigger config.
    *   If no usable trigger endpoint is present, mark as UNSUPPORTED and stop with clear error.

### 4.3.1 Trigger Discovery (Safe Version)
*   **Primary Endpoint (v0.1):** `POST /flows/trigger/{flow_id}`
    *   Auth: Bearer Token
    *   Fail-fast if 404/401.
*   **Version Detection (Reporting Only):**
    *   Call `GET /server/info` → record version in `DOT_VERIFY_REPORT.md`.
    *   Do **not** assume specific internal fields like `.data.options.webhook_url` exist.

---

## 5) DOT commands (v0.1)

### 5.0 Shell Safety Defaults
*   Scripts must use: `set -euo pipefail`.
*   Avoid xtrace (`set +x`) around sensitive blocks; **never** print tokens/secrets.

### 5.1 dot-auth
*   Login → export token vào env var nội bộ process (`DOT_TOKEN`)
*   Fail-fast nếu login fail
*   **Prerequisites:**
    *   Fail-fast if any required secret (4.1.1) is missing or has no ENABLED version.
*   **Security Rules:**
    *   Credentials must come from env vars or secure prompt (`read -s`).
    *   Never echo credentials (set `set +x` before auth logic).
    *   Never write token to disk (keep in memory/env only).
*   **Token Handoff:**
    *   `dot-auth` exports `DOT_TOKEN` in current shell.
    *   `dot-apply` / `dot-verify` read `DOT_TOKEN` from env; fail-fast if missing ("Run dot-auth first").
    *   (Optional: allow `DOT_OUTPUT_TOKEN=1` locally for debugging, default OFF).

### 5.2 dot-apply
*   Parse JSON spec: `dot/specs/directus_flows.v0.1.json`
*   Output:
    *   Flow IDs
    *   Operation IDs
    *   Created/Updated status
*   Report: `dot/reports/DOT_APPLY_REPORT.md`
*   **v0.1 Decision:** Operations are upserted by **`key`** (preferred). DOT must check for existing operation by key and PATCH, or POST if missing.

### 5.2.1 Operation Linking (Success Path)
*   **Rule (v0.1):** Operations execute in order of `position_y` (or spec order) AND `dot-apply` must ensure the chain continues.
*   If Directus requires explicit next-operation links (`resolve`, `reject` paths), DOT must set the success path so Op1 -> Op2.
*   **Note:** For v0.1 with single operation per flow, linking is trivial, but the code path must design for multi-op chaining (v0.2 ready).

### 5.3 dot-verify
*   Trigger Flow 1 → expect 200
*   Trigger Flow 2 → expect 200 + JSON contains "response"
    *   **Pass Condition:** HTTP 200 AND (`.response` exists OR `.data.response` exists).
    *   **Logging:** First 200 chars only (no secrets).
    *   **Cold Start Policy:**
        *   **Max Retries:** 2
        *   **Delay:** 30s
        *   **Max Time:** 60s total
    *   **Pass Conditions:**
        *   Health: HTTP 200
        *   Chat: HTTP 200 **AND** (`response` field exists at top-level OR `.data.response`).
*   **Trigger Mapping (v0.1 Probe-Verified):**
    *   DOT trigger endpoint is **always**: `POST /flows/trigger/{flow_id}`
    *   Both flows use **POST** trigger (empty JSON `{}` is acceptable payload).
    *   Operation logic is inside the flow (GET vs POST to Agent Data is handled by the Operation type).
    *   Record HTTP code + first 200 chars + parsed error message.

### 5.3.1 Trigger Workaround (v0.1 Limitation)

**Problem:** Directus `/flows/trigger/{id}` returns 403 Forbidden even with valid Bearer token.

**Workaround Options for DOT v0.1:**

**Workaround Options for DOT v0.1:**

1. **Option A - Manual Trigger (Recommended for v0.1):**
   - `dot-verify` outputs Flow IDs + the trigger endpoint pattern `/flows/trigger/{id}`
   - Manual verification must use that endpoint (until 403 permission fixed) OR use Directus UI logs inspection.
   - `dot-verify --check-logs` reads execution logs to verify

2. **Option B - Event-Based Trigger:**
   - Create a test record in a collection that triggers the flow
   - Flow uses `event` trigger instead of `webhook`
   - Requires schema change (out of scope v0.1)

3. **Option C - Direct Operation Test:**
   - Skip flow triggering
   - Test Agent Data endpoints directly via curl
   - Verify Directus can reach Agent Data (network connectivity)

**v0.1 Decision:** Implement Option A (Manual Trigger) với clear instructions.
*   Report: `dot/reports/DOT_VERIFY_REPORT.md` must record:
    *   Which trigger method was used.
    *   HTTP codes.
    *   First 200 chars of response (no secrets).

### 5.4 dot-report
*   Tóm tắt: pass/fail, evidence, next step
*   Gợi ý cập nhật DoD Phase B trong `PHULUC_17_E1_BLUEPRINT.md`
*   **Output Contract:**
    *   Must output a 4-line payload:
        ```text
        Flow Health: HTTP code = ...
        Flow Chat: HTTP code = ...
        Flow Chat JSON has "response" field: YES/NO
        (if error) short message = ...
        VERDICT: PASS/FAIL
        ```
    *   Start deterministic DoD updates based on this verdict.

### 5.5 dot-rollback
*   Remove flows created by DOT (by name prefix `[TEST]`)
*   Fail-safe: chỉ xóa flows trong allowlist names.
*   **Safety Marker:**
    *   `dot-apply` should set a DOT marker on managed flows if a suitable field exists (e.g., description = `dot_managed=true`).
    *   `dot-rollback` should delete only flows with this marker; fallback to allowlist names if marker unsupported.

---

## 6) Quy trình vận hành (SOP v0.1)

**SOP: Phase B (Flow Wiring) bằng DOT**

1.  `dot-auth`
2.  `dot-apply specs/directus_flows.v0.1.json`
3.  `dot-verify`
4.  `dot-report`
5.  Update `PHULUC_17_E1_BLUEPRINT.md` (Phase B DoD → ✅)
6.  Commit + PR

**Definition of Done (Phase B)**
*   DOT verify: Flow Health = 200
*   DOT verify: Flow Chat = 200 và có field "response"
*   Docs updated + PR created

---

## 7) Rủi ro & kiểm soát

*   **Token leakage:** DOT không in token.
*   **API endpoint mismatch theo version:** `dot-verify` có detect + report.
*   **Duplicate flows:** Upsert theo name + tag metadata `dot_managed=true` (nếu Directus hỗ trợ field notes/metadata).

### 6.1 Documentation Update Mapping (Manual v0.1)
*   **Target File:** `docs/PHULUC_17_E1_BLUEPRINT.md`
*   **Action:** After DOT verify passes, manually update Sections (10) and (11).
*   **Updates:**
    *   **DoD Phase B:** Mark `[x]` for "Health Check flow created", "Health Check returns 200", "Chat flow created", "Chat flow returns 200".
    *   **Gate Status:** Change to "🟢 PHASE B COMPLETE".
    *   **Current Position:** Change to "Phase C (Verification)".

---

## 9) Sync Note with Appendix 17 (Design Change)
*   **Change:** Use **WEBHOOK** trigger instead of Manual for test flows.
*   **Reason:** Required for AI-first automation (DOT execution).
*   **Action:** `PHULUC_17_E1_BLUEPRINT.md` Section (9A) guides must be interpreted as Webhook triggers by humans using UI, until formally updated.

---

## 7.1 Trigger 403 Investigation Summary

### Observed Behavior
- Endpoint: `POST /flows/trigger/{flow_id}`
- Auth: Bearer token (valid, 321 chars)
- Flow status: `active`
- Flow trigger: `webhook`
- Response: **403 Forbidden** consistently

### Possible Root Causes (Unverified)
1. **Permission Configuration:** Directus may require explicit permission grant for trigger endpoint
2. **Role Restriction:** Admin role may not include trigger permission by default
3. **Flow Configuration:** May need additional `accountability` or `options` fields
4. **Directus Version:** Behavior may differ across versions (current version: null/unknown)

### Recommended Next Steps
1. Check Directus documentation for trigger endpoint permissions
2. Inspect Directus logs during trigger attempt
3. Test with different user roles
4. Consider using Directus SDK instead of raw API

### Impact on DOT v0.1
- **Flow Creation:** ✅ Not affected
- **Operation Creation:** ✅ Not affected
- **Automated Verification:** ❌ Blocked - requires workaround

## 8) Deliverables DOT v0.1

1.  `dot/specs/directus_flows.v0.1.json` (YAML is documentation-only)
2.  `bin/dot-auth`
3.  `bin/dot-apply`
4.  `bin/dot-verify`
5.  `bin/dot-report`
6.  `bin/dot-rollback`
7.  `dot/reports/*.md`
8.  PR “DOT v0.1 MVP + Phase B automation baseline”

## DESIGN NOTE – EXECUTION OBSERVABILITY (DOT v0.1)

Directus Flow webhook execution is **asynchronous by design**.

- Webhook trigger responses confirm request receipt only.
- Operation execution results are **not returned** in trigger responses.
- Directus UI logs expose execution metadata, **not operation payloads**.

### Verification Rule (v0.1)
DOT v0.1 correctness is determined by:
- Deterministic flow creation via API
- Correct operation wiring (`request` type)
- Correct URL usage (`{{$env.AGENT_DATA_URL}}`)
- No hardcoded secrets
- CI + script verification passing

Manual UI trigger/log inspection is **OPTIONAL & NON-BINDING**.

> Runtime response observability is **explicitly deferred to DOT v0.2**.
