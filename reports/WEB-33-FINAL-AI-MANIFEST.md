═══════════════════════════════════════════════════════════════
          AI GATEWAY INTEGRATION MANIFEST
═══════════════════════════════════════════════════════════════

🔐 Tokens retrieved from Secret Manager

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 FOR GPT ACTIONS / GEMINI EXTENSIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. OpenAPI Spec URL (import this):
   https://ai.incomexsaigoncorp.vn/agent_data_openapi.yaml

2. Authentication Type: Bearer Token

3. AI Gateway Token (for /api/ai/* endpoints):
   Vbk7kBWGTvapZX6DOE9POXD9H6toSgxuupowSIGQGkkKdUWqJQ7GEwdxVwmv+4Hg

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 FOR DIRECT DIRECTUS ACCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Base URL:
   https://directus-test-pfne2mqwja-as.a.run.app

2. Directus AI Agent Token (for /items/* endpoints):
   0c02170d67abe046613e7557d60fad98a10a1316851ca790cb4a851aa4545eba

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 INSTRUCTION SNIPPET (Paste into GPT/Gemini system prompt)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are an AI Agent for Incomex Saigon Corp. Your capabilities:

1. KNOWLEDGE SEARCH: Use /api/ai/search to find relevant documents
   from the company knowledge base. Always search before answering
   domain-specific questions.

2. FEEDBACK SUBMISSION: Use /items/feedbacks to submit:
   - Suggestions for improving content
   - Error reports when information is outdated
   - Action requests when human review is needed

3. DOCUMENT ACCESS: Use /items/agent_views to read published
   documents directly when you have a specific document ID.

Guidelines:
- Cite sources using linked_entity_ref when available
- Submit feedback_type="action_request" for tasks requiring human action
- Use context_snippet to preserve relevant excerpts (max 2000 chars)
- Include source_model in all feedback submissions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 QUICK TEST COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Test Vector Search (via Nuxt proxy)
curl -X POST https://ai.incomexsaigoncorp.vn/api/ai/search \
  -H "Authorization: Bearer Vbk7kBWGTvapZX6DOE9POXD9H6toSgxuupowSIGQGkkKdUWqJQ7GEwdxVwmv+4Hg" \
  -H "Content-Type: application/json" \
  -d '{"query": "Hien phap he thong la gi?", "top_k": 3}'

# Test Create Feedback (via Directus)
curl -X POST https://directus-test-pfne2mqwja-as.a.run.app/items/feedbacks \
  -H "Authorization: Bearer 0c02170d67abe046613e7557d60fad98a10a1316851ca790cb4a851aa4545eba" \
  -H "Content-Type: application/json" \
  -d '{"linked_entity_ref": "test:001", "feedback_type": "suggestion", "content": "Test from CLI", "source_model": "manual-test", "status": "pending"}'

# Test Read Agent Views
curl https://directus-test-pfne2mqwja-as.a.run.app/items/agent_views \
  -H "Authorization: Bearer 0c02170d67abe046613e7557d60fad98a10a1316851ca790cb4a851aa4545eba"

