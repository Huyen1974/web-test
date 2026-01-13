# Release v1.2.0-content-engine

- Commit: b9a43e6c51e75a649a4528d005e2c3b4007c24d9
- Date: 2025-12-08 18:12:57 +07

## Summary (Phase E – Content Engine)
- **0047C – Schema versioning & workflow fields**
  - Added 14 workflow/version fields to `knowledge_documents` (workflow_status, version_group_id, version_number, is_current_version, previous_version_id, reviewed_by/at, approved_by/at, publisher_id, rejection_reason, purge_after, parent_document_id, child_order).
  - Migration scripts for Directus TEST, including login via Secret Manager tokens.
- **0047F – Nuxt integration**
  - View-models and composables include workflow fields and `is_current_version` filters (published/public/language) for list/detail.
  - UI badges show workflow status and version numbers (read-only).
- **0048 – RBAC (Agent/Editor)**
  - Roles, policies, and 8 permissions per Role Matrix (no publish/delete for Agent/Editor).
  - MySQL linking via `directus_access` using `scripts/0048_link_policies_mysql.sql` (idempotent).
- **0049 – Diff UI**
  - Version history & visual diff (summary/content) on knowledge detail page.
  - History fetch filters to published/public/current language; diff is client-side/read-only.

## Known limitations / next steps
- Advanced search and admin dashboards are future scope.
- History is limited to 50 versions; suitable for current scale.
- Ensure environment-specific policy linking uses correct IDs when deploying to other environments.
