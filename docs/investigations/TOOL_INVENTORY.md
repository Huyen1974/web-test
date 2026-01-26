# DOT Tools Inventory

> Auto-generated: 2026-01-26 14:46:17
> Purpose: Kiểm kê tất cả DOT tools, xác định gap, đảm bảo "UI chỉ là view tool"

---

## 1. Tool List

| Tool | Description | Size |
|------|-------------|------|
| `dot-apply` |  | 5.5K |
| `dot-auth` |  | 2.0K |
| `dot-backup` |  | 9.2K |
| `dot-clean-data` |  | 11K |
| `dot-content-approve` | Usage: ./dot/bin/dot-content-approve <item_id> [collection] [new_status] | 6.5K |
| `dot-content-list` | Usage: ./dot/bin/dot-content-list [status] [collection] | 4.8K |
| `dot-cost-audit` |  | 1.6K |
| `dot-fix-gap3` |  | 200B |
| `dot-fix-knowledge-permissions` | This script adds public read permissions for: | 7.6K |
| `dot-fix-permissions` |  | 9.4K |
| `dot-health-check` |  | 10K |
| `dot-local-down` | DOT-LOCAL-DOWN: Stop local development environment | 756B |
| `dot-local-logs` | DOT-LOCAL-LOGS: View logs from local development containers | 2.1K |
| `dot-local-restart` | DOT-LOCAL-RESTART: Restart local development services | 2.4K |
| `dot-local-status` | DOT-LOCAL-STATUS: Check status of local development containers | 3.1K |
| `dot-local-up` | DOT-LOCAL-UP: Start local development environment | 3.1K |
| `dot-rollback` | Purpose: Delete all flows created by DOT (prefix "[DOT]") | 2.0K |
| `dot-schema-blog-ensure` |  | 12K |
| `dot-schema-ensure` |  | 6.8K |
| `dot-schema-knowledge-ensure` |  | 11K |
| `dot-schema-navigation-ensure` |  | 13K |
| `dot-schema-redirects-ensure` |  | 11K |
| `dot-seed-agency-os` |  | 25K |
| `dot-seed-knowledge-test` | Usage: ./dot/bin/dot-seed-knowledge-test [--local|--cloud] | 10K |
| `dot-spider` |  | 16K |
| `dot-sync-check` | dot-sync-check: Verify sync status between Local and Cloud Directus | 7.0K |
| `dot-test-login` |  | 334B |
| `dot-token` | dot-token: Get Directus access token (shell-agnostic) | 5.1K |
| `dot-verify` |  | 4.7K |

**Total tools:** 29

---

## 2. Tool Categories

### Infrastructure & Deployment
- `dot-backup`
- `dot-cost-audit`
- `dot-health-check`
- `dot-sync-check`

### Schema & Permissions
- `dot-fix-gap3`
- `dot-fix-knowledge-permissions`
- `dot-fix-permissions`
- `dot-schema-blog-ensure`
- `dot-schema-ensure`
- `dot-schema-knowledge-ensure`
- `dot-schema-navigation-ensure`
- `dot-schema-redirects-ensure`
- `dot-seed-agency-os`
- `dot-seed-knowledge-test`

### Content & CRUD Operations
- `dot-content-approve`
- `dot-content-list`

### Verification & Testing
- `dot-cost-audit`
- `dot-health-check`
- `dot-seed-knowledge-test`
- `dot-sync-check`
- `dot-test-login`
- `dot-verify`

### Authentication & Session
- `dot-auth`
- `dot-test-login`
- `dot-token`

### Utility & Other
- `dot-apply`
- `dot-clean-data`
- `dot-local-down`
- `dot-local-logs`
- `dot-local-restart`
- `dot-local-status`
- `dot-local-up`
- `dot-rollback`
- `dot-spider`

---

## 3. Directus SDK Usage (Nuxt Codebase)

### CRUD Operations Count

| Operation | Count | Files |
|-----------|-------|-------|
| CREATE (createItem) | 347 | - |
| READ (getItems) | 408 | - |
| UPDATE (updateItem) | 135 | - |
| DELETE (deleteItem) | 41 | - |

### Key Composables

- `useAgentData.ts`
- `useBlueprints.ts`
- `useContentRequests.ts`
- `useKnowledge.ts`
- `useKnowledgeHistory.ts`
- `useKnowledgeTree.ts`
- `useTaxonomyTree.ts`

---

## 4. Gap Analysis (UPDATED: 2026-01-26)

### Required Operations for Agent Workflow

| Operation | DOT Tool | Status |
|-----------|----------|--------|
| Create document | `dot-content-create` | ✅ Available |
| List documents | `dot-content-list` | ✅ Available |
| Update document | `dot-content-update` | ✅ Available |
| Approve document | `dot-content-approve` | ✅ Available |
| Delete document | `dot-content-delete` | ✅ Available |
| Seed test data | `dot-seed-agency-os` | ✅ Available |
| Sync to Cloud | `dot-sync-check` | ✅ Available |
| Backup data | `dot-backup` | ✅ Available |
| Health check | `dot-health-check` | ✅ Available |
| Fix permissions | `dot-fix-knowledge-permissions` | ✅ Available |
| Authentication | `dot-auth` | ✅ Available |
| Apply schema | `dot-apply` | ✅ Available |

---

## 5. Recommendations

### Coverage Assessment

**Current State:**
- ✅ Infrastructure tools: Comprehensive (backup, deploy, cost audit)
- ✅ Schema/Permissions: Available (dot-apply, dot-fix-knowledge-permissions)
- ✅ Content workflow: **COMPLETE** (create, list, update, approve, delete)
- ✅ Verification: Good (dot-health-check, dot-sync-check)

### New Content CRUD Tools (Added 2026-01-26)

| Tool | Purpose | Features |
|------|---------|----------|
| `dot-content-create` | Create document via CLI | Auto-slug, idempotency check, UUID generation |
| `dot-content-update` | Update document via CLI | Partial update, validation |
| `dot-content-delete` | Delete document via CLI | Soft delete (archive) or hard delete |

### Content Security Verified

| Check | Result |
|-------|--------|
| Draft documents visible to anonymous | ❌ Hidden (correct) |
| Published documents visible to anonymous | ✅ Visible (correct) |
| Archived documents visible to anonymous | ❌ Hidden (correct) |
| All documents visible with auth | ✅ Visible (correct) |

### Verdict

**🟢 TOOLING COMPLETE** - 12/12 operations covered. Full CRUD via CLI tools.

---

## 6. Next Steps

1. **For content creation:** `./dot/bin/dot-content-create <collection> --title "Title"`
2. **For content updates:** `./dot/bin/dot-content-update <collection> <id> --field value`
3. **For content deletion:** `./dot/bin/dot-content-delete <collection> <id> [--soft|--force]`
4. **For monitoring:** `./dot/bin/dot-sync-check`
5. **For Admin UI:** http://localhost:8055

---

*Generated by Task D.2: DOT Tooling Audit*
*Updated: 2026-01-26 (Task E: Content CRUD Tools)*
