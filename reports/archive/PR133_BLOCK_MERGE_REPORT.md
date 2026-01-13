# PR133 merge block report (CLI.CODEX.BLOCK-MERGE-PR133-UNTIL-NO-INTERNAL-API.v1.0)

## Findings (current branch: feat/pr133-client-datafix)
- Remaining internal /api dependencies (rg "/api/" web):
  - web/lib/agentDataClient.ts: uses `/api/search`, `/api/log/page-view`, `/api/log/search` against baseUrl → breaks on Firebase SPA (rewrites to index.html).
  - web/layers/portal/server/api/portal/search.get.ts: still present server API route (requires Nitro server; Firebase SPA cannot serve it).
- No `/api/proxy` references (see reports/PR133_no_api_proxy_grep_proof.txt), but above `/api` usages remain.
- docs/E1_Plan.md already contains Appendix F (from PR134) and is on main; not touched in PR133.

## Checklist status
- Audit: done; hits listed above.
- Fixes: NOT addressed yet for agentData and portal search; server API remains.
- Config: NUXT_PUBLIC_SITE_URL default updated in PR133; agentData still points to env but relies on /api endpoints.
- CI: not re-run post-findings; should stay open until fixes applied.

## Recommendation
- Block merge of PR #133. Request changes: remove/replace all `/api/*` calls and server API routes for SPA hosting (use Directus SDK or external Agent Data endpoints). Re-run CI and smoke tests once addressed.
