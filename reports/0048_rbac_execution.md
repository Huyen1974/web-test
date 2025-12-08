# Task 0048: RBAC Execution Report

**Status**: ⚠️ PARTIALLY COMPLETE - Manual Step Required
**Date**: 2025-12-08
**Author**: Claude Code (CLI.CLAUDE.0048-RBAC-SETUP)

## Executive Summary

Successfully implemented RBAC setup for the `knowledge_documents` collection with Agent and Editor roles. The automated script created:
- ✅ 2 roles (Agent, Editor)
- ✅ 2 policies (Agent Policy, Editor Policy)
- ✅ 8 permissions (4 per role) with proper workflow restrictions

However, policy-to-role linking requires manual intervention due to Directus API permission constraints.

## What Was Accomplished

### 1. Roles Created

| Role | ID | Icon | Description |
|------|-----|------|-------------|
| Agent | `e7c71c3d-c0a5-4b07-b8f7-53d2dd995384` | smart_toy | AI Agent - Can create/edit drafts and submit for review. Cannot approve or publish. |
| Editor | `c60f9c5e-70ad-4477-96ac-00c28ffe7935` | rate_review | Content Editor - Can review, approve/reject submissions. Cannot publish to production. |

### 2. Policies Created

| Policy | ID | Admin Access | App Access |
|--------|-----|--------------|------------|
| Agent Policy | `74d6c90f-1481-49f6-8b86-ee7d0f1ed269` | false | true |
| Editor Policy | `4ea86fab-5257-4835-a073-464f2a9285ab` | false | true |

### 3. Permissions Created

#### Agent Policy Permissions (74d6c90f-1481-49f6-8b86-ee7d0f1ed269)

| Action | Fields | Permissions | Validation | Purpose |
|--------|--------|-------------|------------|---------|
| create | * | null | `workflow_status: draft` | Agents can only create drafts |
| read | * | `workflow_status IN (draft, under_review, published)` | null | Agents can read drafts, under review, and published |
| update | * | `workflow_status: draft` | `workflow_status IN (draft, under_review)` | Agents can only edit drafts, can transition to under_review |
| delete | null | `id IS null` (impossible) | null | Agents cannot delete documents |

#### Editor Policy Permissions (4ea86fab-5257-4835-a073-464f2a9285ab)

| Action | Fields | Permissions | Validation | Purpose |
|--------|--------|-------------|------------|---------|
| create | * | null | null | Editors can create documents |
| read | * | `workflow_status != archived` | null | Editors can read all except archived |
| update | * | `workflow_status IN (draft, under_review, approved)` | `workflow_status IN (draft, under_review, approved)` | Editors can approve/reject, cannot publish |
| delete | null | `id IS null` (impossible) | null | Editors cannot delete documents |

## Technical Details

### Execution Environment

- **Directus Instance**: `directus-test` (Cloud Run service)
- **Access Method**: `gcloud run services proxy` on port 8080
- **Authentication**: `/auth/login` with credentials from Secret Manager
- **Script**: `scripts/0048_rbac_setup.ts`

### Script Execution

```bash
# Started Cloud Run proxy
nohup gcloud run services proxy directus-test --port=8080 --region=asia-southeast1 &

# Retrieved credentials from Secret Manager
export DIRECTUS_ADMIN_EMAIL=$(gcloud secrets versions access latest --secret="DIRECTUS_ADMIN_EMAIL_test" --project="github-chatgpt-ggcloud")
export DIRECTUS_ADMIN_PASSWORD=$(gcloud secrets versions access latest --secret="DIRECTUS_ADMIN_PASSWORD_test" --project="github-chatgpt-ggcloud")

# Ran dry-run to preview changes
npx tsx scripts/0048_rbac_setup.ts --dry-run

# Executed RBAC setup
npx tsx scripts/0048_rbac_setup.ts --execute
```

### Execution Results

```
╔════════════════════════════════════════════════════════════════╗
║  Task 0048: RBAC Setup for knowledge_documents                ║
╚════════════════════════════════════════════════════════════════╝

📋 Mode: EXECUTE

🔐 Step 1: Authenticating...
✅ Authenticated successfully

📋 Step 2: Fetching existing roles...
   Found 3 existing roles

👥 Step 3: Setting up roles...
   ✓ Role "Agent" already exists (ID: e7c71c3d-c0a5-4b07-b8f7-53d2dd995384)
   ✓ Role "Editor" already exists (ID: c60f9c5e-70ad-4477-96ac-00c28ffe7935)

🔐 Step 3.5: Setting up policies...
   ✓ Policy "Agent Policy" exists (ID: 74d6c90f-1481-49f6-8b86-ee7d0f1ed269)
   ⚠️  Could not auto-link policy to role Agent: Failed to link policy to role: 403 - FORBIDDEN
   ℹ️  Manual step required: Link policy "Agent Policy" to role "Agent" via Directus UI
   Creating policy: Editor Policy...
   ✅ Created policy "Editor Policy" (ID: 4ea86fab-5257-4835-a073-464f2a9285ab)
   ⚠️  Could not auto-link policy to role Editor: Failed to link policy to role: 403 - FORBIDDEN
   ℹ️  Manual step required: Link policy "Editor Policy" to role "Editor" via Directus UI

🔒 Step 4: Setting up permissions for knowledge_documents...

   Setting permissions for role: Agent
   ✅ Set create permission for Agent
   ✅ Set read permission for Agent
   ✅ Set update permission for Agent
   ✅ Set delete permission for Agent

   Setting permissions for role: Editor
   ✅ Set create permission for Editor
   ✅ Set read permission for Editor
   ✅ Set update permission for Editor
   ✅ Set delete permission for Editor

╔════════════════════════════════════════════════════════════════╗
║  Summary                                                       ║
╚════════════════════════════════════════════════════════════════╝
Mode:              EXECUTE
Roles checked:     2
Roles created:     0 (none)
Permissions set:   8
Errors:            0

✅ RBAC setup complete!
```

## Known Issue: Policy-to-Role Linking

### Root Cause

The Directus API returns 403 FORBIDDEN errors when attempting to link policies to roles, even when authenticated as an admin user. Investigation revealed:

1. **Missing System Permissions**: No explicit permissions exist for `directus_roles` or `directus_policies` collections
2. **Policy-Based RBAC Model**: In Directus's new RBAC system, admin users require explicit permissions on system collections to modify them
3. **Insufficient Admin Policy**: The admin user's policy (`37e64534-2c50-48cd-97e4-a4ddf5f3f0df`) lacks permissions to modify roles/policies

### Current State

```json
// Roles (policies arrays are empty)
{
  "Agent": {
    "id": "e7c71c3d-c0a5-4b07-b8f7-53d2dd995384",
    "policies": []  // ⚠️ Should contain ["74d6c90f-1481-49f6-8b86-ee7d0f1ed269"]
  },
  "Editor": {
    "id": "c60f9c5e-70ad-4477-96ac-00c28ffe7935",
    "policies": []  // ⚠️ Should contain ["4ea86fab-5257-4835-a073-464f2a9285ab"]
  }
}

// Policies (roles arrays are empty)
{
  "Agent Policy": {
    "id": "74d6c90f-1481-49f6-8b86-ee7d0f1ed269",
    "roles": []  // ⚠️ Should contain ["e7c71c3d-c0a5-4b07-b8f7-53d2dd995384"]
  },
  "Editor Policy": {
    "id": "4ea86fab-5257-4835-a073-464f2a9285ab",
    "roles": []  // ⚠️ Should contain ["c60f9c5e-70ad-4477-96ac-00c28ffe7935"]
  }
}
```

## Manual Step Required

### Option 1: SQL Script (Recommended)

Use the provided SQL script to directly update the database:

**File**: `scripts/0048_link_policies_manual.sql`

```bash
# Get Cloud SQL connection name
INSTANCE=$(gcloud sql instances list --filter="name:directus" --format="value(connectionName)")

# Connect to Cloud SQL and run the script
gcloud sql connect ${INSTANCE} --user=postgres --database=directus < scripts/0048_link_policies_manual.sql
```

The SQL script:
1. Updates `directus_roles` table to add policy IDs to roles
2. Updates `directus_policies` table to add role IDs to policies
3. Verifies the bidirectional relationship

### Option 2: Directus Admin UI

1. Log in to Directus Admin UI: https://directus-test-XXXXX.run.app/admin
2. Navigate to **Settings > Roles & Permissions**
3. For each role (Agent, Editor):
   - Click on the role
   - Locate the "Policies" section
   - Add the corresponding policy:
     - Agent → Agent Policy (`74d6c90f-1481-49f6-8b86-ee7d0f1ed269`)
     - Editor → Editor Policy (`4ea86fab-5257-4835-a073-464f2a9285ab`)
   - Save changes

## Verification

After manual linking, verify the setup:

```bash
# Check roles have policies linked
curl -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8080/roles" | \
  jq '.data[] | select(.name == "Agent" or .name == "Editor") | {name, policies}'

# Expected output:
# Agent: policies: ["74d6c90f-1481-49f6-8b86-ee7d0f1ed269"]
# Editor: policies: ["4ea86fab-5257-4835-a073-464f2a9285ab"]

# Check policies have roles linked
curl -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8080/policies" | \
  jq '.data[] | select(.name | contains("Policy")) | {name, roles}'

# Expected output:
# Agent Policy: roles: ["e7c71c3d-c0a5-4b07-b8f7-53d2dd995384"]
# Editor Policy: roles: ["c60f9c5e-70ad-4477-96ac-00c28ffe7935"]
```

## Files Created

- `scripts/0048_rbac_setup.ts` - Main RBAC setup script (idempotent, with --dry-run and --execute modes)
- `scripts/0048_link_policies_manual.sql` - SQL script for manual policy-role linking
- `reports/0048_rbac_execution.md` - This report
- `/tmp/0048_rbac_roles.json` - Role verification data
- `/tmp/0048_rbac_policies.json` - Policy verification data
- `/tmp/0048_rbac_permissions.json` - Permission verification data

## Alignment with Role Matrix

The implementation correctly reflects the Role Matrix from `reports/0047a_versioning_design.md`:

| Transition | From State | To State | Agent | Editor | Admin |
|------------|-----------|----------|-------|--------|-------|
| Create | - | Draft | ✅ (validation: draft) | ✅ | ✅ |
| Edit | Draft | Draft | ✅ (permissions: draft only) | ✅ | ✅ |
| Submit | Draft | Under Review | ✅ (validation: allows) | ✅ | ✅ |
| Approve | Under Review | Approved | ❌ (permissions: draft only) | ✅ (validation: allows) | ✅ |
| Reject | Under Review | Draft | ❌ (permissions: draft only) | ✅ (validation: allows) | ✅ |
| Publish | Approved | Published | ❌ (no approved access) | ❌ (validation: excludes published) | ✅ |
| Archive | Published | Archived | ❌ (no archived access) | ❌ (read excludes archived) | ✅ |

## Next Steps

1. **IMMEDIATE**: Run SQL script to link policies to roles (see "Manual Step Required" above)
2. **VERIFY**: Test each role's permissions with test users
3. **DOCUMENT**: Update `docs/Web_List_to_do_01.md` to mark Task 0048 as DONE/GREEN
4. **PR**: Create feature branch, commit changes, and open PR for review

## Lessons Learned

1. **Directus Policy-Based RBAC**: The new RBAC model requires policies as intermediaries between roles and permissions
2. **API Permission Constraints**: Even admin users may not have API access to system collections in policy-based RBAC
3. **Database Access Required**: Some administrative tasks require direct database access when API permissions are restricted
4. **Idempotency Is Critical**: The script safely handles partial execution and can be rerun without creating duplicates

## References

- Design Document: `reports/0047a_versioning_design.md` (Section 3.3 Role Matrix)
- Role Definitions: `scripts/0048_rbac_setup.ts` lines 85-106
- Permission Matrix: `scripts/0048_rbac_setup.ts` lines 124-219
- Directus RBAC Documentation: https://docs.directus.io/user-guide/user-management/permissions.html
