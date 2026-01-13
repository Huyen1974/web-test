# CLI.CODEX.0047B – Versioning Design Review & LAW Alignment (CODEX)

- Date: 2025-12-03
- Branch: main @ a8e1a75039a2b1ed312f9ff0a03ca262725c5b29 (before this report)
- Working tree start: clean; main == origin/main
- Scope: review of 0047 content versioning design vs Constitution + Law_of_data_and_connection. No implementation changes.

## Executive Summary
**Decision: REJECT / REQUIRE REDESIGN** – The expected design artifact `reports/0047a_versioning_design.md` is missing from main. PR #103 referenced as the design instead contains unrelated agent_data server code. Without the design document, LAW compliance, state machine, retention rules, and schema/index proposals cannot be validated. Do not proceed to implementation (0047C+) until a proper design doc is authored and approved.

## LAW & Governance Alignment (blocked)
- Constitution HP-02 (Documentation & auditability) and HP-CI-03 (artifact retention) cannot be satisfied because no design artifact exists in the repo.
- Law_of_data_and_connection: Core/Growth segregation, Directus as SSOT, and retention rule (max 10 revisions / 7 days) cannot be validated without the missing workflow/schema details.
- Web_List_to_do_01 (Task 0047) expects a design deliverable; absence violates task acceptance criteria.

## Findings
- ISSUE-001: **Missing design doc** – `reports/0047a_versioning_design.md` (or equivalent) is not present on main; cannot review state machine, roles, fields, or indexes.
- ISSUE-002: **PR #103 mismatch** – `git log --grep "#103"` shows commit `cddac9b` modifying `agent_data/server.py`, not a versioning design report; scope diverges from planned deliverable.
- ISSUE-003: **Compliance unverifiable** – Without the defined 5-state workflow, role matrix, and purge rules, we cannot ensure agents lack publish rights or that retention (10 revisions/7 days) can be enforced safely in Directus.

## Change Requests
- CHANGE-REQUEST-1: Add the missing design report (e.g., `reports/0047a_versioning_design.md`) covering: 5-state workflow (Draft → Under Review → Approved → Published → Archived), role permissions (Agent/Editor/Admin) with explicit allowed transitions, and rejection/rollback paths.
- CHANGE-REQUEST-2: Specify data model: 11 proposed fields with types, constraints, and indexes that support (a) fetch current published version by taxonomy, (b) list history per version_group, (c) purge selection while protecting Published/Archived/is_current_version=TRUE.
- CHANGE-REQUEST-3: Document retention/purge policy implementation detail (Directus Flow / SQL job) ensuring “max 10 revisions OR 7 days for unpublished versions,” never purging Published/Archived, and respecting Core vs Growth zones (agents never write Core).
- CHANGE-REQUEST-4: Align Nuxt read-path with 0036/0037: published filter = `workflow_status='published' AND is_current_version=TRUE`, no additional joins beyond indexed fields.

## Risk Assessment
- High risk of governance breach (agents publishing, Core writes) without a documented workflow/RBAC matrix.
- High risk of data-loss or retention violations if purge rules are not designed and tested (HP-CI-03).
- Delivery risk for 0047C+ due to absent schema/index plan and migration approach.

## Decision & Next Steps
- **Decision:** REJECT / REQUIRE REDESIGN. No implementation tasks should start.
- **Required next actions:**
  1) Author and commit the full versioning design report per change requests above.
  2) Re-run a senior LAW review (new PR) before any Directus/DB changes.
  3) Keep lint baseline untouched (current: 0 errors, 95 warnings – recorded as debt for a future LINT-LEGACY task).

## Evidence of PR states
- #103 feat/0047-versioning-design → present in main but is a code change (`cddac9b`), not a design doc.
- #104 feat/lint-base-cleanup-0047 → merged (main commit `7d70ac5`).
- #105 feat/lint-help-cleanup-0047 → merged (main commit `8809d41`), plus follow-up report commit `a8e1a75`.

## Local checks (this CLI)
- `npm run lint` (main): PASS – 0 errors, **95 warnings** (unchanged baseline; no fixes attempted).
- `npm run build` (main): PASS – expected known warnings (Directus 403 redirects/globals, nuxt-site-config localhost, SVG data URI). No new errors.
