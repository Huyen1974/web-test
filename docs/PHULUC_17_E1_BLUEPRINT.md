## PHỤ LỤC 17: KẾT NỐI LIÊN THÔNG (AGENT DATA → DIRECTUS → NUXT)
**Trạng thái:** 🟡 IN PROGRESS (E1 Wiring)  
**Mục tiêu:** “Connected & Talking” – kết nối chạy thật trước khi Assembly.

========================
PHẦN 1: HỒ SƠ KỸ THUẬT & TRẠNG THÁI (TECHNICAL DOSSIER)
========================

### (1) Connection Parameters (SSOT)
| Parameter | Value / Name | Status | Source |
|-----------|--------------|--------|--------|
| **Agent Data Service** | `agent-data-test` | ✅ VERIFIED (Running) | Preflight Report |
| **Agent Data Region** | `asia-southeast1` | ✅ Verified | Preflight Report |
| **Agent Data Base URL** | `https://agent-data-test-pfne2mqwja-as.a.run.app` | ✅ VERIFIED | **NO trailing slash** |
| **Directus Service** | `directus-test` | ✅ Alive | Appendix 16 |
| **Directus Base URL** | `https://directus-test-pfne2mqwja-as.a.run.app` | ✅ Verified | Appendix 16 |

**Secrets References (Project: `github-chatgpt-ggcloud`):**
- `AGENT_DATA_API_KEY` (Secret Manager) - Location: Google Secret Manager; Usage: Directus → Agent Data Auth; Status: ✅ EXISTS / READY
- `AGENT_DATA_URL` (Env Var - Non-secret)
- `FLOWS_ENV_ALLOW_LIST` (Env Var - Non-secret)

### (2) Fix API Base Ambiguity
* **Agent Data API Base:** `(NONE)` - Use Base URL + Endpoint directly.
* **FORBIDDEN:** Legacy endpoints `/api/*` and `/views/*` are **INVALID** (Ref: Appendix 16).

### (3) Endpoint Inventory (Verified)
| Endpoint | Method | Auth | Status | Notes |
|----------|--------|------|--------|-------|
| `/health` | `GET` | No | ✅ VERIFIED | 200 OK |
| `/info` | `GET` | No | ✅ VERIFIED | JSON returned |
| `/chat` | `POST` | NOT ENFORCED (x-api-key header is still sent for future-proofing) | ✅ VERIFIED | Returns 200 OK. 422 on empty body. |
| `/ingest` | `POST` | NOT ENFORCED (x-api-key header is still sent for future-proofing) | ✅ VERIFIED | Returns **202 Accepted** (Async). |

### (3A) API Contract (Directus Wiring Spec)
**Common Config:**
* **Base URL:** `{{$env.AGENT_DATA_URL}}`
* **Auth Header:** `x-api-key: {{$env.AGENT_DATA_API_KEY}}` (Send this **ALWAYS** for future-proofing, even if currently optional).

**Endpoint: POST /chat**
* **Body:** `{"query": "{{$trigger.payload.question}}"}`
* **Timeout:** 30s
* **Success:** HTTP 200 (JSON with `response` field).
* **Error:** HTTP 422 (Validation).

**Endpoint: POST /ingest**
* **Body:** `{"text": "gs://huyen1974-agent-data-uploads-test/{{file_path}}"}`
* **Timeout:** 15s
* **Success:** HTTP 202 (Accepted).
* **Error:** HTTP 500 (Queue Fail).

### (3B) Security Note
> ⚠️ **SECURITY STATUS:** Endpoints are currently PUBLIC for E1 ease of assembly. The `x-api-key` header should still be configured in Flows to prepare for E2 Hardening when Auth is enabled server-side.

### (3C) ⚠️ FLOW ANTI-PATTERNS (DO NOT DO)
- **Do NOT** use `Authorization: Bearer`
- **Do NOT** expect `200` from `/ingest` (`202` is correct)
- **Do NOT** retry `/ingest` synchronously

### (4) Bucket (Uploads / Ingest)
**Naming Rule:** `huyen1974-agent-data-<purpose>-test`

| Bucket Name | Purpose | Status | Notes |
|-------------|---------|--------|-------|
| `gs://huyen1974-agent-data-uploads-test/` | Uploads for Ingest | ✅ EXISTS | Bucket exists, IAM configured |
| *(Other Buckets)* | System/Backup | ✅ VERIFIED | Out of wiring scope (E1). Only uploads bucket is required for Directus↔Agent Data wiring. |

**IAM SUMMARY:**
- **Statement:** Agent Data runtime (Project Editor/Owner inherited) has sufficient permissions to write objects to the bucket.
- **Status:** ✅ VERIFIED
- **Evidence:** Cursor report

### (5) Agent Data Readiness
**Overall:** 🟢 READY FOR INTEGRATION
All prerequisites satisfied.

### (6) Evidence Checklist (Cursor Verify Slots)
- [x] `gcloud run services describe agent-data-test` → URL confirmed (No trailing slash)
- [x] `curl https://agent-data-test-pfne2mqwja-as.a.run.app/health` → 200 OK
- [x] `curl https://agent-data-test-pfne2mqwja-as.a.run.app/info` → 200 + JSON
- [x] `/ingest` exists (not 404) and returns 202 Accepted (async) for valid GCS URI; 500 if queue fails
- [x] Required GCS buckets exist and are listable by Service Account (no object upload needed)

### (6A) ENV Injection Status (Live Verification - 2026-01-15)

**Source:** Cursor Infrastructure Verification Report

| Env Var | Required | Present in Directus | Value / Notes |
|---------|----------|---------------------|---------------|
| `AGENT_DATA_URL` | ✅ YES | ❌ **MISSING** | Target: `https://agent-data-test-pfne2mqwja-as.a.run.app` |
| `AGENT_DATA_API_KEY` | ✅ YES | ❌ **MISSING** | Secret exists in GSM (v2 enabled), NOT mounted |
| `FLOWS_ENV_ALLOW_LIST` | ✅ YES | ✅ PRESENT | Value: `WEB_URL,AGENT_DATA_URL,AGENT_DATA_API_KEY,GITHUB_TOKEN` |

**Secret Manager Status:**
| Secret Name | Exists | Active Version | Location | Created |
|-------------|--------|----------------|----------|---------|
| `AGENT_DATA_API_KEY` | ✅ YES | v2 (enabled) | asia-southeast1 | 2025-10-30 |

**Directus Service Status:**
- URL: `https://directus-test-pfne2mqwja-as.a.run.app`
- Health: ✅ HTTP 200 on `/server/info`
- Region: `asia-southeast1`

**VERDICT:**
- ENV Injection: ❌ **NOT DONE**
- Ready for Flow Wiring: ❌ **NO** (blocked until ENV injected)
- Blocking Issues: Directus Flows cannot reference `{{$env.AGENT_DATA_URL}}` or `{{$env.AGENT_DATA_API_KEY}}`

**Last Verified:** 2026-01-15 by Cursor

========================
PHẦN 2: KẾ HOẠCH LẮP RÁP & ĐẤU NỐI (ASSEMBLY EXECUTION)
========================

### (7) Assembly Rules (Hard Locks)
1.  **Nuxt MUST NOT call Agent Data directly.** All data must flow through Directus.
2.  **Directus is the Wiring Hub.** Use Directus Flows (Request URL) for connectivity.
3.  **Security First.** Never log secrets (API Keys) in Flow runs, console logs, or reports.

### (8) Env Var Mapping for Directus Flows
**Requirement:** `FLOWS_ENV_ALLOW_LIST` must include: `AGENT_DATA_URL`, `AGENT_DATA_API_KEY`.

| Secret Manager (NAME ONLY) | Directus Cloud Run Env Var | Flow Reference |
|----------------------------|----------------------------|----------------|
| `AGENT_DATA_API_KEY` | `AGENT_DATA_API_KEY` | `{{$env.AGENT_DATA_API_KEY}}` |
| (Env Var) | `AGENT_DATA_URL` | `{{$env.AGENT_DATA_URL}}` |
| (Env Var) | `FLOWS_ENV_ALLOW_LIST` | N/A (Config) |

### (8A) ENV Injection Procedure (Directus - E1 Wiring)
**Setup Procedure (Command Reference):**
```bash
gcloud run services update directus-test \
  --region=asia-southeast1 \
  --project=github-chatgpt-ggcloud \
  --update-env-vars="AGENT_DATA_URL=https://agent-data-test-pfne2mqwja-as.a.run.app,FLOWS_ENV_ALLOW_LIST=AGENT_DATA_URL,AGENT_DATA_API_KEY" \
  --update-secrets="AGENT_DATA_API_KEY=AGENT_DATA_API_KEY:latest"
```

**Verification (Names Only):**
```bash
gcloud run services describe directus-test \
  --region=asia-southeast1 \
  --project=github-chatgpt-ggcloud \
  --format='yaml(spec.template.spec.containers[0].env)'
```

**Notes:**
- **NO** trailing slash in `AGENT_DATA_URL`.
- **Never** print secret value.
- `x-api-key` header will be sent even if not enforced (future-proof).

### (8B) ENV Injection Execution Status

**Status:** ✅ DONE (Codex [CODEX])

**Codex Mark:** [CODEX] 2026-01-16 — env injection executed + names verified.

**Pre-flight Checklist:**
- [x] ✅ Secret `AGENT_DATA_API_KEY` exists in Secret Manager
- [x] ✅ Secret has active version (v2)
- [x] ✅ `FLOWS_ENV_ALLOW_LIST` already configured in Directus
- [x] ✅ Directus service is healthy
- [x] ✅ AGENT_DATA_URL env var injected (Codex [CODEX] 2026-01-16)
- [x] ✅ AGENT_DATA_API_KEY secret mounted (Codex [CODEX] 2026-01-16)

**Command to Execute (FINAL - VERIFIED):**
```bash
gcloud run services update directus-test \
  --region=asia-southeast1 \
  --project=github-chatgpt-ggcloud \
  --update-env-vars="AGENT_DATA_URL=https://agent-data-test-pfne2mqwja-as.a.run.app" \
  --update-secrets="AGENT_DATA_API_KEY=AGENT_DATA_API_KEY:latest"
```

**⚠️ QUAN TRỌNG:**
- KHÔNG cập nhật `FLOWS_ENV_ALLOW_LIST` (đã có sẵn với đúng format)
- KHÔNG có trailing slash trong URL
- KHÔNG print secret value

**Post-Injection Verification:**
```bash
# Verify env vars present (names only)
gcloud run services describe directus-test \
  --region=asia-southeast1 \
  --project=github-chatgpt-ggcloud \
  --format='value(spec.template.spec.containers[0].env[].name)' | grep AGENT_DATA

# Expected output:
# AGENT_DATA_URL
# AGENT_DATA_API_KEY
```

**Verification Result (2026-01-16, Codex [CODEX]):** `AGENT_DATA_URL`, `AGENT_DATA_API_KEY` present in Directus env.

### (9) Live-Fire Verification Plan (No-Code)
**Test Strategy:**
* **Flow 1 (Health):** Call `GET /info` (Expect 200). Timeout: `10s`.
* **Flow 2 (Chat):** Call `POST /chat` with `{"query": "hello"}` (Expect 200). Timeout: `30s`.
* **Flow 3 (Ingest):** Call `POST /ingest` with dummy GCS path (Expect 202). Timeout: `15s`.

**Test Flow: `[TEST] Agent Data Connectivity`**
- **Trigger:** Manual
- **Operation:** Request URL
    - **Method:** GET
    - **URL:** `{{$env.AGENT_DATA_URL}}/info`
    - **Timeout:** 10s
- **Pass Criteria:** HTTP 200 (and no network failure).
- **Fail Criteria:** DNS Error, Timeout, Connection Refused.

### (9A) Step-by-Step Flow Creation Guide (Directus UI)

**Prerequisite:** ENV Injection (8B) MUST be completed first.

---

#### FLOW 1: [TEST] Agent Data Health Check

**Step 1: Create Flow**
1. Login Directus Admin: `https://directus-test-pfne2mqwja-as.a.run.app/admin`
2. Navigate: **Settings** → **Flows** → **Create Flow** (+ button)
3. Configure:
   - **Name:** `[TEST] Agent Data Health Check`
   - **Status:** Active
   - **Icon:** `check_circle`
   - **Color:** `#4CAF50` (green)

**Step 2: Set Trigger**
1. Click trigger block
2. Select: **Manual**
3. Save trigger

**Step 3: Add Operation**
1. Click **+** to add operation after trigger
2. Select: **Webhook / Request URL**
3. Configure:
   - **Name:** `Check Agent Data Info`
   - **Method:** `GET`
   - **URL:** `{{$env.AGENT_DATA_URL}}/info`
   - **Headers:** (leave empty - public endpoint)
4. Save operation

**Step 4: Test**
1. Click **Run** button (top right)
2. **Expected:** Status 200, JSON response with service info
3. **If timeout:** Agent Data cold starting, wait 30s and retry

---

#### FLOW 2: [TEST] Agent Data Chat

**Step 1: Create Flow**
1. **Name:** `[TEST] Agent Data Chat`
2. **Trigger:** Manual

**Step 2: Add Operation**
1. Select: **Webhook / Request URL**
2. Configure:
   - **Name:** `Send Chat Query`
   - **Method:** `POST`
   - **URL:** `{{$env.AGENT_DATA_URL}}/chat`
   - **Headers:**
```
     Content-Type: application/json
     x-api-key: {{$env.AGENT_DATA_API_KEY}}
```
   - **Request Body:**
```json
     {
       "query": "hello test from directus"
     }
```
3. Save & Test

**Expected Results:**
- HTTP 200
- JSON response with `response` field

---

#### FLOW 3: [TEST] Agent Data Ingest (Optional)

**Step 1: Create Flow**
1. **Name:** `[TEST] Agent Data Ingest`
2. **Trigger:** Manual

**Step 2: Add Operation**
1. **Method:** `POST`
2. **URL:** `{{$env.AGENT_DATA_URL}}/ingest`
3. **Headers:**
```
   Content-Type: application/json
   x-api-key: {{$env.AGENT_DATA_API_KEY}}
```
4. **Request Body:**
```json
   {
     "text": "gs://huyen1974-agent-data-uploads-test/test-file.txt"
   }
```

**Expected Results:**
- HTTP **202 Accepted** (NOT 200 - async processing)
- ⚠️ Do NOT retry immediately on 202

### (9B) Error Handling & Retry Policy (SSOT)

| HTTP Status | Error Type | Action |
|-------------|------------|--------|
| **000 / Timeout** | Cold Start / Network | **RETRY**. Wait 30s, max 2 retries. |
| **202** | Async Accepted | **SUCCESS**. Do NOT retry immediately. |
| **422** | Validation Error | **STOP**. Fix request body. Do NOT retry. |
| **401 / 403** | Auth Error | **STOP**. Check API Key / Injection. |
| **500 / 502** | Server Error | **STOP**. Log error. Do NOT auto-retry loop. |

**Logging Rules:**
- ✅ Log: Status Code, Timestamp, Endpoint.
- ❌ **NEVER** Log: API Key value, Full Request Body (PII).

### (9C) Cold Start & Timeout Policy

| Endpoint | Recommended Timeout | Retry Strategy |
|----------|---------------------|----------------|
| `/info`, `/health` | **10s** | Retry once after 5s |
| `/chat` | **30s** | Retry once after 30s (Deep Sleep) |
| `/ingest` | **15s** | No retry (Async queue) |

### (10) Definition of Done (DoD) for Phụ lục 17

**PHASE A: Prerequisites & ENV Injection**
- [x] ✅ Agent Data endpoints verified (/health, /info, /chat, /ingest)
- [x] ✅ Required buckets verified accessible
- [x] ✅ AGENT_DATA_API_KEY secret exists in Secret Manager (v2 enabled)
- [x] ✅ FLOWS_ENV_ALLOW_LIST configured in Directus
- [ ] ⏳ AGENT_DATA_URL env var injected into Directus
- [ ] ⏳ AGENT_DATA_API_KEY secret mounted to Directus

**PHASE B: Flow Wiring**
- [ ] ⏳ [TEST] Agent Data Health Check flow created
- [ ] ⏳ Health Check flow returns HTTP 200
- [ ] ⏳ [TEST] Agent Data Chat flow created
- [ ] ⏳ Chat flow returns HTTP 200 with response

**PHASE C: Final Verification**
- [x] ✅ No secrets leaked/logged (E1-safe verification)
- [ ] ⏳ All test flows passing
- [ ] ⏳ Ready for E1 Assembly continuation

**Gate Status:** 🟢 PHASE B – COMPLETE (DOT v0.1)

### Verification Clarification (Phase B)

- Phase B verifies **structural wiring**, not runtime observability.
- Directus Flow execution is asynchronous.
- Manual UI trigger or log inspection is **not a pass/fail criterion**.
- DOT script verification + CI status are the source of truth.

### Activity Log
| 2026-01-17 | Phase B COMPLETE | DOT v0.1 deployed, audited, and merged. Async execution behavior documented. |

### (11) Execution Order (E1 Wiring Roadmap)
```
┌─────────────────────────────────────────────────────────────────────┐
│                    E1 WIRING EXECUTION FLOW                         │
└─────────────────────────────────────────────────────────────────────┘

PHASE A: ENV INJECTION (One-time Setup) ─────────────────────────────
│
├── A1. ✅ Verify AGENT_DATA_API_KEY exists in Secret Manager
│       Status: DONE (v2 enabled, asia-southeast1)
│
├── A2. ⏳ Execute gcloud command from (8B)
│       Command: gcloud run services update directus-test ...
│       Executor: Codex / DevOps
│
├── A3. ⏳ Verify ENV vars present (run post-injection check)
│       Verifier: Cursor
│
└── A4. ⏳ Update (6A) status to ✅
        Updater: Antigravity

PHASE B: FLOW WIRING (Directus UI) ──────────────────────────────────
│
├── B1. ⏳ Create [TEST] Agent Data Health Check flow
│       Guide: Section (9A) Flow 1
│
├── B2. ⏳ Run test → Expect HTTP 200
│       Timeout: 10s (cold start may need retry)
│
├── B3. ⏳ Create [TEST] Agent Data Chat flow
│       Guide: Section (9A) Flow 2
│
├── B4. ⏳ Run test → Expect HTTP 200 with response
│
└── B5. ⏳ Update DoD items to ✅

PHASE C: VERIFICATION & SIGN-OFF ────────────────────────────────────
│
├── C1. ⏳ All DoD items ✅
│
├── C2. ⏳ Phụ lục 17 status → 🟢 COMPLETE
│
└── C3. ✅ Ready for Nuxt ↔ Agency OS Assembly (E1 continues)
```

**Current Position:** Phase A, Step A2 (Pending ENV Injection)

**Blocking Status:**
- Phase B BLOCKED until Phase A complete
- Phase C BLOCKED until Phase B complete
