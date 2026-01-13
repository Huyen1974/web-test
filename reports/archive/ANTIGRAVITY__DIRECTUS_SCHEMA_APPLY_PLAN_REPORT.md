# ANTIGRAVITY Directus Schema Apply Plan Report

## 1. Executive Summary
- **Status**: **READY TO APPLY**.
- **Analysis**: Compared `reports/CLAUDE__FRONTEND_AUTOPSY_SCHEMA_SPEC_REPORT.md` with Live Directus.
- **Findings**:
  - **Live Collections**: 29 (System Only).
  - **Missing Collections**: **30** (All Core + Blocks).
- **Plan**: Created a dependency-safe execution plan.
- **Branch**: [`chore/schema-apply-plan`](https://github.com/Huyen1974/web-test/tree/chore/schema-apply-plan) (Contains Plan JSON & Scripts).

## 2. Missing Schema Summary
The following collections are completely missing and need to be created:

### Core Content
- `pages`
- `navigation`, `navigation_items`
- `forms`
- `posts`, `categories`
- `testimonials`, `team`
- `seo`

### Singletons
- `globals`
- `pages_blog`
- `pages_projects`

### Page Builder (Blocks)
- `pages_blocks` (Junction)
- 15 Block Types: `block_hero`, `block_faqs`, `block_richtext`, `block_cta`, `block_form`, etc.
- 2 Supporting: `block_button_groups`, `block_buttons`

## 3. Apply Plan (Execution Phases)
This plan is designed to handle Many-to-Any (M2A) dependencies correctly.

### Phase 1: Block Dependencies
*Create these first so M2A relations can link to them.*
1. `block_hero`
2. `block_faqs`
3. `block_richtext`
4. ... (all 15 blocks)
5. `block_button_groups`, `block_buttons`

### Phase 2: Core Collections & Junctions
*Create these second, linking to Phase 1 collections.*
1. `pages`
2. `pages_blocks` (M2A Junction linking Pages -> Blocks)
3. `navigation` + `navigation_items`
4. `globals`
5. `seo`, `forms`, etc.

## 4. Next Step: Execution Command
To apply this schema, run the following command (which will use the generated `scripts/directus/schema_plan.json` logic):

```bash
# PREREQUISITE: Ensure DIRECTUS_ADMIN_EMAIL_test and DIRECTUS_ADMIN_PASSWORD_test secrets are accessible
python3 scripts/directus/schema_apply.py
```
*(Note: `scripts/directus/schema_apply.py` needs to be implemented in the next task to consume the plan JSON and execute the API calls.)*
