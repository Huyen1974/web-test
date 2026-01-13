# CLI.CODEX.0047B-v2 – Versioning Design Review & LAW Alignment (CODEX)

- Date: 2025-12-04
- Branch: feat/0047-versioning-design-doc @ 25d8ce0
- Base main: 330562f (synced before review)

## Executive Summary
The 0047A design delivers a complete Directus-centric content versioning plan (5-state workflow, 11 workflow/versioning fields, retention & purge rules, Nuxt read-path filter). Governance alignment is strong for SSOT, role separation, and retention. However, Parent–Child support for long documents is absent and must be specified before implementation. **Decision: APPROVE WITH CONDITIONS** (do not merge until the conditions are addressed in the design/implementation plan).

## Checklist Mapping
- 1) Scope match Task 0047 (versioning/approval on Directus only): **OK** – stays within Directus/Nuxt, no Lark/externals.
- 2) Workflow & roles (Agent/Editor/Admin) with rejection/rollback: **OK** – Agent cannot approve/publish/archive; rollback path defined.
- 3) Retention/purge (10 revisions OR 7 days; protect current Published/Archived): **OK** – explicit rules and purge job options with safety checks.
- 4) Parent–Child structure for long docs: **NOT OK** – no modeling/flow described; must be added (see CONDITIONS).
- 5) Read-path compatibility with 0036/0037 (published + current only): **OK** – filter `workflow_status='published' AND is_current_version=TRUE`, taxonomy untouched.
- 6) Rollout plan 0047C–0047G feasible & IaC/RBAC aware: **OK** – staged plan with RBAC, migrations, purge job, Nuxt updates.
- 7) PR #106 diff scope (docs only): **OK** – adds `reports/0047a_versioning_design.md` and exec report.
- 8) CI for PR #106: **OK** – Nuxt 3 CI, Pass Gate, Quality Gate, E2E Smoke Test all green.

## LAW & Governance Alignment
- Constitution HP-02 (documentation): **OK** – full design documented.
- Constitution HP-CI-03 (artifact retention): **OK** – retention rules and purge job spelled out.
- Constitution HP-IaC: **OK** – future migrations/RBAC to be codified in 0047C.
- Law of Data & Connection Điều 3 (Agents cannot write Core): **OK** – Agents limited to Draft + Submit; publish/archive admin-only.
- Điều 4 (Directus SSOT): **OK** – Directus remains SSOT; Nuxt read-only; Agent Data is derived.
- Điều 20 (10 revisions or 7 days): **OK** – enforced in retention section; current Published/Archived never purged.
- Điều 2 (Assemble > Build): **OK** – leverages Directus native versioning + Flows.

## Parent–Child Evaluation
- Current design: **No explicit support** for parent/child relationships or section-level versioning. No fields/relations or state rules for children.
- Risks: Long documents cannot be split cleanly; inconsistent states if ad-hoc child records are added later; Nuxt read-path undefined for hierarchical content.
- Proposed options (pick one in 0047C):
  - **Option A (preferred minimal)**: Add `parent_id` (self FK) and `child_order` to `knowledge_documents`; enforce children inherit `version_group_id` and state from parent (no divergent states); Nuxt reads parent + published/current children ordered by `child_order`.
  - **Option B (section collection)**: Separate `knowledge_sections` with FK to parent document + same workflow fields; parent Published only if all required children Published; more complex but clearer separation.

## Risks & Recommendations
- R-001: Parent–Child gap → inconsistent handling of long docs. **Mitigation**: adopt Option A or B above, define rules before 0047C migration.
- R-002: Directus native versioning + custom workflow may conflict on UI behavior. **Mitigation**: validate on staging in 0047C; add guard tests for transitions and is_current_version uniqueness.
- R-003: Purge logic safety. **Mitigation**: keep invariant “never delete is_current_version=TRUE or Published/Archived current”; dry-run purge on staging.
- R-004: Migration mapping from legacy `status`/`version`. **Mitigation**: explicit mapping plan in 0047C; set initial `version_group_id`/`version_number` deterministically.

## Decision & Next Steps
- **Decision: APPROVE WITH CONDITIONS** – do **not** merge PR #106 until Parent–Child support is specified.
- Action items for 0047C design update:
  1) Add chosen Parent–Child model (Option A or B) with field list, constraints, and workflow/state rules for children.
  2) Clarify Nuxt read-path for hierarchical docs (how parents render children; filters still use `published` + `is_current_version=TRUE`).
  3) Confirm migration steps for legacy data with/without parents.
- PR #106 status: CI green; docs-only. **Not auto-merged** per decision above.
- Local checks on branch: `npm run lint` PASS (0 errors, 95 warnings baseline), `npm run build` PASS (expected Directus 403 + site-config/SVG warnings).
