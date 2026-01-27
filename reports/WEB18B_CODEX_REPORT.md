# WEB-18B: Directus ENV Injection & Connection Fix

**Agent:** Codex  
**Date:** 2026-01-27T15:50:30Z  
**Duration:** ~50m

## 1. CHẨN ĐOÁN STARTUP PROBE
- Nguyên nhân: Revision mới fail vì thiếu `DB_CLIENT` → Directus exit.
- Giải pháp áp dụng: Inject lại DB_* vars (DB_CLIENT/DB_HOST/DB_PORT/DB_SOCKET_PATH/DB_DATABASE/DB_USER) + PUBLIC_URL + DIRECTUS_ADMIN_EMAIL. Revision `directus-test-00051-gpv` READY.
- Evidence:
  - `[15:01:44.771] ERROR: "DB_CLIENT" Environment Variable is missing.`

## 2. ENV INJECTION VERIFICATION
| Variable | Value | Status |
|----------|-------|--------|
| AGENT_DATA_URL | https://agent-data-test-pfne2mqwja-as.a.run.app | ✅ |
| WEB_URL | https://ai.incomexsaigoncorp.vn | ✅ |
| FLOWS_ENV_ALLOW_LIST | WEB_URL,AGENT_DATA_URL,AGENT_DATA_API_KEY,GITHUB_TOKEN | ✅ |

Directus flow `[TEST] Agent Data Health Check` operation uses `{{$env.AGENT_DATA_URL}}/info` (verified via `/operations`).

## 3. CONNECTION TEST
- Agent Data /health: 200 (0.178s)
- Agent Data /info: 200 (0.179s)
- CORS preflight: `access-control-allow-origin: https://directus-test-pfne2mqwja-as.a.run.app`
- Directus → Agent Data:
  - Event flow `E1: Content Request → Agent Trigger` reached Agent Data `/webhook` but returned 404.
  - Manual/webhook trigger endpoint `/flows/trigger/<id>` returns 403 (permission denied).

## 4. PR #275 STATUS
- CI Status: GREEN
- Merge: MERGED
- Commit SHA: e740a82a9a06c4213394f419470124a79315110c

## 5. SELF-CHECK RESULTS
| Tiêu chí | Result |
|----------|--------|
| Directus revision READY | ✅ |
| ENV có hiệu lực | ✅ |
| Kết nối hoạt động | ❌ (Directus → Agent Data not 200) |
| PR merged | ✅ |

## 6. VERDICT
- [ ] ✅ E1 ASSEMBLY READY - Tất cả tiêu chí đạt
- [x] ⚠️ PARTIAL - Directus → Agent Data chưa trả 200 (webhook 404, trigger 403)
- [ ] ❌ BLOCKED - [nguyên nhân và đề xuất]

## 7. NEXT STEPS (nếu có)
- Fix Agent Data `/webhook` (return 200) OR update flow to use `/info` for connectivity check.
- Investigate why `/flows/trigger/<id>` returns 403 (permission/config) to enable manual flow tests.
