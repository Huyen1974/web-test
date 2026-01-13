# CLI.CODEX.RECOVER-DOCS-V2 – Backlog restore & update (0034, 0035)

- Restored `docs/Web_List_to_do_01.md` from `.cursor/memory_log/web list to do.md` (authoritative backup).
- Updated Task 0034 to DONE: Nuxt ↔ Agent Data + Directus search/log with 3-case graceful degradation (Agent Data off → Directus list; on + empty q → Directus list; on + q → Agent Data IDs → Directus fetch published/public). Directus = SSOT; Nuxt read-only. Evidence: PR #89; reports/0034_nuxt_agentdata_api_integration.md, 0034c_fix_blocker.md, 0034d_final_merge.md, 0034f_merge_template_refine.md, 0034e_doc_update_web_list_to_do.md.
- Updated Task 0035 to DONE: Read-only approval/status badges on Knowledge & Blueprints from Directus metadata (draft/published/archived), no approve/reject actions, Directus = SSOT, Nuxt display-only. Evidence: PR #90; reports/0035a_approval_ui_implementation.md, 0035c_scope_fix.md, 0035d_final_merge.md.
- No other tasks or LAW text modified.
- Checklist: [x] Backlog restored; [x] 0034 DONE; [x] 0035 DONE; [x] No LAW changes.
