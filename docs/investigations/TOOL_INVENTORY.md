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

## 4. Gap Analysis

### Required Operations for Agent Workflow

| Operation | DOT Tool | Status |
|-----------|----------|--------|
| Create document | - | ❌ Missing |
| List documents | `dot-content-list` | ✅ Available |
| Update document | - | ❌ Missing |
| Approve document | `dot-content-approve` | ✅ Available |
| Delete document | - | ❌ Missing |
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
- ✅ Content workflow: Partial (list, approve available; create/update/delete via API)
- ✅ Verification: Good (dot-health-check, dot-sync-check)

### Missing Tools (Low Priority)

| Tool | Purpose | Workaround |
|------|---------|------------|
| `dot-content-create` | Create document via CLI | Use Directus API directly |
| `dot-content-update` | Update document via CLI | Use Directus API directly |
| `dot-content-delete` | Delete document via CLI | Use Directus API directly |

### Why Tools May Not Be Needed

1. **"UI chỉ là view tool"** - Directus Admin UI IS the content management interface
2. **Agent workflow** - Agents can use Directus REST API directly (more flexible)
3. **CLI tools** - Best for automation/CI, not manual content creation

### Verdict

**🟡 TOOLING ADEQUATE** - 9/12 operations covered. Missing tools can use Directus API.

---

## 6. Next Steps

1. **For content creation/editing:** Use Directus Admin UI (http://localhost:8055)
2. **For automation:** Use Directus REST API directly in scripts
3. **For monitoring:** Run `dot-sync-check` periodically

---

*Generated by Task D.2: DOT Tooling Audit*
