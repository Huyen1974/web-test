# WEB-19F: SA Compliance & Full Fix

**Agent:** Codex  
**Date:** 2026-01-28T04:52:15Z

## 1. SERVICE ACCOUNT CHANGE

### Before
- SA: 812872501910-compute@developer.gserviceaccount.com (DEFAULT - Non-compliant)

### After
- SA: chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com (COMPLIANT)

### Verification
```bash
gcloud run services describe agent-data-test \
  --region=asia-southeast1 \
  --project=github-chatgpt-ggcloud \
  --format='value(spec.template.spec.serviceAccountName)'
```
Result:
```
chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com
```

## 2. SECRETS & ENV MAPPING

| Variable | Secret/Value | Status |
|----------|--------------|--------|
| OPENAI_API_KEY | OPENAI_API_KEY:latest | ✅ |
| QDRANT_URL | QDRANT_URL:latest | ✅ |
| QDRANT_API_URL | QDRANT_URL:latest | ✅ |
| QDRANT_API_KEY | Qdrant_agent_data_N1D8R2vC0_5:latest | ✅ |
| QDRANT_COLLECTION | test_documents | ✅ |

### Qdrant ENV Name Investigation
- Code expects: `QDRANT_URL` or `QDRANT_API_URL`, plus `QDRANT_API_KEY`, and `QDRANT_COLLECTION`.
- Evidence: `agent_data/vector_store.py:39-43`

## 3. SERVICE STATUS

### Revision
- Name: agent-data-test-00012-r2n
- Status: READY
- SA: chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com

### Health Check
- /health: 200
- /info: 200 (no explicit Qdrant status reported)

## 4. LOGS CHECK

### Firestore 403
- Before fix: ❌ 403 errors present (historical ingest-processor logs)
- After fix: ✅ latest ingest shows `ingest_done` without `firestore_error`

### VecDB Status
- Before: "VecDB not set: cannot ingest docs"
- After: still logged on agent-data-test startup

## 5. INGESTION TEST

### GCS Upload
- File: test-sa-fix.txt
- Bucket: huyen1974-agent-data-uploads-test
- Status: ✅

### Ingest API
- Request: POST /ingest with `text=gs://huyen1974-agent-data-uploads-test/test-sa-fix.txt`
- Response code: 202
- Body: Accepted ingest request (MessageId returned)

### Processing Logs
```
2026-01-28T04:50:39.194580Z ingest_done
```

## 6. SEARCH VERIFICATION

### Query
- Query: "lorem ipsum dolor"
- qdrant_hits: 0
- context items: 0

### Result
- Search functional: ❌

## 7. SELF-CHECK
| Tiêu chí | Result |
|----------|--------|
| SA compliant (chatgpt-deployer) | ✅ |
| Revision READY | ✅ |
| No 403 errors | ✅ (new ingest) |
| Qdrant connected | ❌ (no positive signal; VecDB still not set) |
| Ingestion works | ✅ (ingest_done logged) |
| Search returns results | ❌ |

## 8. VERDICT
- [ ] ✅ E1 KNOWLEDGE HUB FULLY OPERATIONAL
- [ ] ⚠️ PARTIAL - [issues]
- [x] ❌ BLOCKED - `/chat` always reports qdrant_hits=0 because `agent_config.vecdb = None` in `agent_data/server.py:244`

## 9. HIẾN PHÁP COMPLIANCE
- [x] ✅ Tuân thủ Điều II - SA duy nhất
- [x] ✅ Tuân thủ GC-LAW §1.3
