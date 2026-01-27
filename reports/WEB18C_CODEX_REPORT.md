# WEB-18C: Directus Flow Configuration Fix

**Agent:** Codex  
**Date:** 2026-01-27T22:51:50Z

## 1. FLOW CONFIGURATION CHANGES
- Flow name: [TEST] Agent Data Health Check
- Old URL: {{$env.AGENT_DATA_URL}}/info (already set)
- New URL: {{$env.AGENT_DATA_URL}}/info (no change)
- Method: GET

## 2. PERMISSION FIX (nếu có)
- Issue: /flows/trigger/<id> returned 403 when manual-trigger payload was missing required fields.
- Solution: Trigger with JSON body containing `collection` and `keys` (manual trigger requirements). Example: `{"collection":"directus_users","keys":["6abdec55-d911-44df-af96-3cf60b9654af"]}`.

## 3. END-TO-END TEST
| Test | Result | Evidence |
|------|--------|----------|
| Manual Flow Trigger | ✅ | POST /flows/trigger/bcbc7c99... → 200 with required payload |
| Flow → Agent Data | ✅ | Agent Data /info returned 200 (Cloud Run logs) |
| Response content | ✅ | `{"name":"agent-data-langroid","version":"0.1.0",...}` |

## 4. SELF-CHECK
| Tiêu chí | Result |
|----------|--------|
| Flow gọi đúng endpoint | ✅ |
| Flow chạy 200 | ✅ |
| Permission OK | ✅ (with required payload) |

## 5. VERDICT
- [x] ✅ E1 ASSEMBLY READY
- [ ] ⚠️ PARTIAL -
- [ ] ❌ BLOCKED -

## 6. NEXT STEPS (nếu có)
- Optional: remove investigation-only policies/permissions if not needed (created while debugging 403).
