# 0049 – Diff UI review (CLI.CODEX.0049-REVIEW-AND-MERGE)

- PR: #112 (feat/0049-diff-ui → main)
- Reviewer: Codex (Chief Engineer)
- Date: $(date '+%Y-%m-%d %H:%M:%S %Z')
- Decision: **REJECTED / DO NOT MERGE (YELLOW)**

## What I reviewed
- Design/context: docs/Web_List_to_do_01.md row 0049; reports/0049_diff_ui_implementation.md.
- Code: web/types/view-model-0032.ts, web/composables/useKnowledge.ts, web/composables/useKnowledgeHistory.ts, web/pages/knowledge/[id].vue, web/components/KnowledgeDiff.vue, package.json/package-lock (adds `diff` + types).
- CI: PR #112 status checks are GREEN.

## Findings
- UI/logic: Diff component is client-side only; no write APIs; dependency `diff` is lightweight and scoped.
- Mapping: `mapToCard` now exports and adds `content` (optional); history uses it to render diffs.
- UX: History tab defaults to compare latest vs previous; guards for missing data; graceful messaging when empty.

## Blocking issues (data exposure)
1) `useKnowledgeHistory` query fetches **all statuses except archived** and **no visibility/language filter**:
   ```ts
   readItems('knowledge_documents', {
     filter: {
       version_group_id: { _eq: versionGroupId },
       status: { _neq: 'archived' }, // includes draft/under_review/approved/published
     },
   })
   ```
   - This page is public; if Directus RBAC on the public role is misconfigured or broader than intended, drafts/under_review/approved (non-public) content would be exposed (summary/content shown in the diff).
   - It also ignores `visibility` and `language` filters used elsewhere, so private or other-language versions could leak.
   - Design intent in Phase E is “read-only, published/public”; history should be constrained to publicly viewable versions unless behind an authenticated editor UI (it is not here).

## Required changes before merge
- Update `useKnowledgeHistory` filter to mirror the public read path constraints, e.g.:
  - `status: { _eq: 'published' }`
  - `visibility: { _eq: 'public' }`
  - Optionally `language: { _eq: <current language> }` (at least align with document.language).
  - Keep `version_group_id` filter; consider `is_current_version` only if wanting current snapshots, but for history published versions are fine.
- Re-run CI after the fix.

## Status
- **YELLOW – PR #112 NOT merged**.
- Next step: Antigravity/Claude to adjust `useKnowledgeHistory` filters as above, then resubmit. I will re-review once the data-exposure risk is addressed.
