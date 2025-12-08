# 0049 – Diff UI review (CLI.CODEX.0049-REVIEW-AND-MERGE)

- PR: #112 (feat/0049-diff-ui → main)
- Reviewer: Codex (Chief Engineer)
- Date: 2025-12-08 18:12:57 +07
- Decision: **APPROVED & MERGED (GREEN)**

## What I reviewed
- Design/context: docs/Web_List_to_do_01.md row 0049; reports/0049_diff_ui_implementation.md.
- Code: web/types/view-model-0032.ts, web/composables/useKnowledge.ts, web/composables/useKnowledgeHistory.ts, web/pages/knowledge/[id].vue, web/components/KnowledgeDiff.vue, package.json/package-lock (adds `diff` + types).
- CI: PR #112 status checks are GREEN.

## Findings
- UI/logic: Diff component is client-side only; no write APIs; dependency `diff` is lightweight and scoped.
- Mapping: `mapToCard` now exports and adds `content` (optional); history uses it to render diffs.
- UX: History tab defaults to compare latest vs previous; guards for missing data; graceful messaging when empty.

## Data-safety checks
- `useKnowledgeHistory` now filters `status='published'`, `visibility='public'`, and `language=locale`, scoped by `version_group_id`; limit=50; read-only via `useDirectus`.
- `useKnowledge` remains read-only with published/public/is_current_version filters.
- `KnowledgeDiff.vue` is pure client diff (no network, no writes); `[id].vue` adds history/diff UI without restore/write actions.

## Risks / notes
- History limited to 50 items; acceptable for current scope.
- Diff operates on summary/content only; RBAC still governs API access.

## CI
- PR #112 checks: GREEN (build, Pass Gate, Quality Gate, E2E).

## Merge
- Merged via `scripts/auto_merge_pr.sh 112`; merge commit on main: `9eed6d3`.
- Task 0049 marked DONE in docs.

## Status
- **GREEN – APPROVED & MERGED**. Diff UI (history + visual diff) is on main with safe filters aligned to published/public/current language.
