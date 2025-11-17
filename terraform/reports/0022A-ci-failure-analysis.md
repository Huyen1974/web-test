# Task 0022A: CI Failure Investigation Report
## Terraform Apply Run 19405125561 - Root Cause Analysis

**Date**: 2025-11-16
**Investigator**: Claude Code (primary engineer)
**Run ID**: 19405125561
**Run URL**: https://github.com/Huyen1974/web-test/actions/runs/19405125561
**Result**: ❌ **FAILED**
**Duration**: 10m 42s
**Exit Code**: 1

---

## Executive Summary

The first Terraform apply via CI (Run 19405125561) **FAILED** with **3 critical errors** after partially creating infrastructure. The deployment attempted to create a complete Directus CMS stack including Cloud Run service, which **violates the MySQL-only scope** established in Tasks 0020/0021.

**Critical Finding**: The Terraform code in main branch is **NOT the MySQL-only skeleton** from Task 0020, but includes:
- ✅ Cloud SQL MySQL (Task 0020 scope)
- ❌ Cloud Run service for Directus (NOT in Task 0020 scope)
- ❌ Secret Manager **versions** (violates HP-05)
- ❌ Artifact Registry (missing from Task 0020 skeleton)

**Infrastructure State**: **PARTIALLY CREATED** with **state inconsistency**.

---

## 1️⃣ PHÂN TÍCH LOG CI (RUN 19405125561)

### 1.1 Job Execution Flow

| Step | Status | Duration | Notes |
|------|--------|----------|-------|
| Checkout code | ✅ SUCCESS | 1s | |
| Authenticate to Google Cloud | ✅ SUCCESS | 19s | WIF authentication successful |
| Set up Cloud SDK | ✅ SUCCESS | 20s | |
| Setup Terraform | ✅ SUCCESS | 1s | Terraform 1.9.0 |
| Terraform Format Check | ✅ SUCCESS | <1s | |
| Terraform Init | ✅ SUCCESS | 4s | Backend: huyen1974-web-test-tfstate |
| Terraform Validate | ✅ SUCCESS | 1s | |
| Terraform Plan | ✅ SUCCESS | 6s | Plan showed changes |
| **Terraform Apply** | ❌ **FAILED** | **10m 8s** | **Multiple errors** |

### 1.2 Key Error Messages (Evidence)

#### Error 1: Cloud Run Service Startup Failure

```
Error: Error waiting to create Service: Error waiting for Creating Service:
Error code 9, message: The user-provided container failed the configured
startup probe checks. Logs for this revision might contain more information.

Logs URL: https://console.cloud.google.com/logs/viewer?project=github-chatgpt-ggcloud&
resource=cloud_run_revision/service_name/directus-test/revision_name/directus-test-00001-9x4

For more troubleshooting guidance, see
https://cloud.google.com/run/docs/troubleshooting#container-failed-to-start

with google_cloud_run_v2_service.directus,
on main.tf line 43, in resource "google_cloud_run_v2_service" "directus":
43: resource "google_cloud_run_v2_service" "directus" {
```

**Context**: Cloud Run service `directus-test` created but container failed startup probe after 2+ minutes.

#### Error 2: Secret IAM Permission Denied (DIRECTUS_KEY_test)

```
Error: Error applying IAM policy for secretmanager secret
"projects/github-chatgpt-ggcloud/secrets/DIRECTUS_KEY_test":
Error setting IAM policy for secretmanager secret
"projects/github-chatgpt-ggcloud/secrets/DIRECTUS_KEY_test":
googleapi: Error 403: Permission 'secretmanager.secrets.setIamPolicy'
denied for resource
'projects/github-chatgpt-ggcloud/secrets/DIRECTUS_KEY_test'
(or it may not exist).
```

#### Error 3: Secret IAM Permission Denied (DIRECTUS_SECRET_test)

```
Error: Error applying IAM policy for secretmanager secret
"projects/github-chatgpt-ggcloud/secrets/DIRECTUS_SECRET_test":
Error setting IAM policy for secretmanager secret
"projects/github-chatgpt-ggcloud/secrets/DIRECTUS_SECRET_test":
googleapi: Error 403: Permission 'secretmanager.secrets.setIamPolicy'
denied for resource
'projects/github-chatgpt-ggcloud/secrets/DIRECTUS_SECRET_test'
(or it may not exist).
```

#### Error 4: Secret IAM Permission Denied (DIRECTUS_DB_PASSWORD_test)

```
Error: Error applying IAM policy for secretmanager secret
"projects/github-chatgpt-ggcloud/secrets/DIRECTUS_DB_PASSWORD_test":
Error setting IAM policy for secretmanager secret
"projects/github-chatgpt-ggcloud/secrets/DIRECTUS_DB_PASSWORD_test":
googleapi: Error 403: Permission 'secretmanager.secrets.setIamPolicy'
denied for resource
'projects/github-chatgpt-ggcloud/secrets/DIRECTUS_DB_PASSWORD_test'
(or it may not exist).
```

### 1.3 Resource Creation Timeline

| Time | Resource | Status | Details |
|------|----------|--------|---------|
| 11:49:27 | google_project_service.sqladmin | ✅ CREATED | API enabled |
| 11:49:27 | google_project_service.secretmanager | ✅ CREATED | API enabled |
| 11:49:27 | google_project_service.artifactregistry | ✅ CREATED | API enabled |
| 11:49:27 | google_project_service.run | ✅ CREATED | API enabled |
| 11:49:31 | google_secret_manager_secret.directus_db_password | ✅ CREATED | Secret metadata |
| 11:49:31 | google_secret_manager_secret.directus_key | ✅ CREATED | Secret metadata |
| 11:49:31 | google_secret_manager_secret.directus_secret | ✅ CREATED | Secret metadata |
| 11:49:32 | google_secret_manager_secret_version.* | ✅ CREATED | **⚠️ VIOLATES HP-05** |
| 11:49:43 | google_artifact_registry_repository.web_test_docker_repo | ✅ CREATED | Docker repo |
| 11:57:11 | module.mysql_directus.google_sql_database_instance.instance | ✅ CREATED | MySQL instance (7m 45s) |
| 11:57:13 | module.mysql_directus.google_sql_database.database | ✅ CREATED | Database: directus |
| 11:57:14 | module.mysql_directus.google_sql_user.user[0] | ✅ CREATED | User: directus |
| 11:57:14 | google_cloud_run_v2_service.directus | ⚠️ CREATED (UNHEALTHY) | Container failed to start |
| 11:59:24 | google_secret_manager_secret_iam_member.* | ❌ **FAILED** | Permission denied |

**Total Duration**: ~10 minutes
**Resources Created**: ~15+ resources
**Resources Failed**: 3 IAM bindings + 1 unhealthy Cloud Run service

---

## 2️⃣ PHÂN LOẠI LỖI & ẢNH HƯỞNG

### 2.1 Root Causes (Ranked by Priority)

#### Root Cause #1: **SCOPE VIOLATION - Not MySQL-Only** (CRITICAL)

**Category**: IaC (Terraform code)
**Severity**: **CRITICAL** ⚠️
**Constitution Violation**: Appendix F Anti-Stupid rule

**Evidence**:
- Task 0020/0021 specified **MySQL-only skeleton** (28 resources planned)
- Current main.tf includes **Cloud Run service deployment** (NOT in scope)
- Current secrets.tf includes **secret versions** (violates HP-05)

**Files Involved**:
- `terraform/main.tf` lines 43-204: Cloud Run service definition
- `terraform/secrets.tf` lines 42-45, 74-77, 106-109: Secret version resources

**Impact**:
- Infrastructure deployed beyond approved scope
- Violates Constitution requirements
- Creates dependency on unready container image

#### Root Cause #2: **Container Image Not Available/Invalid** (HIGH)

**Category**: IaC (Terraform code) + GCP (container registry)
**Severity**: **HIGH**

**Evidence**:
```
variable "directus_image" {
  description = "Docker image for Directus CMS"
  type        = string
  default     = "directus/directus:latest"  # ⚠️ PUBLIC IMAGE
}
```

**Analysis**:
- Cloud Run tried to pull image: `directus/directus:latest` (public Docker Hub)
- Startup probe failed after 2+ minutes (`/server/health` on port 8055)
- Container likely failed to start OR health endpoint incorrect

**Possible Causes**:
1. Public directus/directus image not compatible with configuration
2. Database connection failed (wrong socket path or credentials)
3. Environment variables incorrect
4. Health check endpoint path wrong
5. Container needs more initialization time than 10s initial delay

#### Root Cause #3: **IAM Permission Missing** (MEDIUM)

**Category**: GCP (IAM)
**Severity**: **MEDIUM**

**Evidence**:
Service account `chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com` lacks permission:
- `secretmanager.secrets.setIamPolicy`

**Analysis**:
- Service account can CREATE secrets ✅
- Service account can CREATE secret versions ✅
- Service account CANNOT set IAM policies on secrets ❌

**Required Role**: `roles/secretmanager.admin` OR `roles/secretmanager.secretManager`
**Current Role**: Likely only `roles/secretmanager.secretAccessor` + `roles/secretmanager.secretVersionManager`

### 2.2 Infrastructure State Assessment

#### Resources Successfully Created ✅

1. **APIs Enabled** (4):
   - sqladmin.googleapis.com
   - secretmanager.googleapis.com
   - artifactregistry.googleapis.com
   - run.googleapis.com

2. **Cloud SQL MySQL**:
   - Instance: `mysql-directus-web-test` (RUNNABLE) ✅
   - Database: `directus` ✅
   - User: `directus` ✅

3. **Secret Manager** (3 secrets):
   - `DIRECTUS_KEY_test` (with version 1) ✅
   - `DIRECTUS_SECRET_test` (with version 1) ✅
   - `DIRECTUS_DB_PASSWORD_test` (with version 1) ✅
   - **⚠️ NOTE**: These violate HP-05 (Terraform managing values)

4. **Artifact Registry**:
   - Repository: `web-test` (asia-southeast1, DOCKER format) ✅

5. **Cloud Run**:
   - Service: `directus-test` (CREATED but STATUS=False) ⚠️

#### Resources Partially Created/Failed ❌

1. **Secret IAM Bindings** (3 failed):
   - `google_secret_manager_secret_iam_member.directus_key_accessor` ❌
   - `google_secret_manager_secret_iam_member.directus_secret_accessor` ❌
   - `google_secret_manager_secret_iam_member.directus_db_password_accessor` ❌

2. **Cloud Run Service**:
   - Service exists but unhealthy (STATUS=False) ⚠️
   - No healthy revision
   - Container startup probe failed

#### State Consistency Issues 🚨

**CRITICAL**: Terraform state is **INCONSISTENT**:
- Apply failed mid-execution
- Some resources exist in GCP but NOT in Terraform state
- Secret IAM bindings failed, leaving secrets without proper access control
- Cloud Run service exists but non-functional

**Evidence**:
```bash
$ gcloud run services list --region=asia-southeast1
NAME             STATUS  CREATION_TIMESTAMP
directus-test    False   2025-11-16T11:57:15.908811Z  # ⚠️ EXISTS but UNHEALTHY
```

**State File Status**: UNKNOWN (likely contains partial state with errors)

---

## 3️⃣ LIÊN KẾT VỚI TERRAFORM & HIẾN PHÁP

### 3.1 Files & Resources Involved

| File | Lines | Resource | Issue |
|------|-------|----------|-------|
| `terraform/main.tf` | 43-195 | google_cloud_run_v2_service.directus | Container startup failure |
| `terraform/main.tf` | 198-204 | google_cloud_run_v2_service_iam_member | Depends on failed resource |
| `terraform/secrets.tf` | 42-45 | google_secret_manager_secret_version.directus_key | **VIOLATES HP-05** |
| `terraform/secrets.tf` | 74-77 | google_secret_manager_secret_version.directus_secret | **VIOLATES HP-05** |
| `terraform/secrets.tf` | 106-109 | google_secret_manager_secret_version.directus_db_password | **VIOLATES HP-05** |
| `terraform/secrets.tf` | 119-138 | google_secret_manager_secret_iam_member.* | IAM permission denied |

### 3.2 Constitution Violations

#### ❌ Violation 1: HP-05 (Secret Management)

**Rule**: "Terraform manages metadata ONLY, values from chatgpt-githubnew"

**Violation**:
```hcl
# secrets.tf lines 42-45
resource "google_secret_manager_secret_version" "directus_key" {
  secret      = google_secret_manager_secret.directus_key.id
  secret_data = random_password.directus_key.result  # ❌ VIOLATES HP-05
}
```

**Impact**:
- Terraform now manages secret VALUES
- Violates centralized secret management principle
- Secret values in Terraform state (security risk)

#### ❌ Violation 2: Appendix F Anti-Stupid (Scope Creep)

**Rule**: "Phase 1 = MySQL-only, minimal infrastructure"

**Violation**:
- Task 0020/0021 approved **MySQL-only skeleton** (28 resources)
- Current code deploys **Cloud Run service** (NOT approved)
- Current code creates **Artifact Registry** (not in Task 0020 skeleton)

**Evidence from Task 0021 Report**:
> "Task 0021: `terraform plan` local + self-review:
> - Kết quả: `Plan: 28 to add, 0 to change, 0 to destroy`"

**Current Reality**: Plan would show ~30+ resources (with Cloud Run, Artifact Registry)

#### ⚠️ Partial Violation: HP-SEC-01 (Least Privilege)

**Issue**: Service account lacks `secretmanager.secrets.setIamPolicy` permission

**Analysis**:
- Permission IS needed if Terraform manages IAM bindings
- BUT managing IAM bindings for secrets Terraform created is acceptable
- HOWEVER, the secrets shouldn't exist per HP-05 violation

#### ✅ Compliant: HP-VIII (WIF Authentication)

**Evidence**: WIF authentication successful
```
Successfully authenticated
Successfully set default project
```

### 3.3 Link to Existing Technical Debt

#### TD-TF-001: MySQL tier verification (db-g1-small)

**Status**: ✅ **NOT RELATED** to this failure
**Reason**: MySQL instance created successfully

#### TD-TF-002: Availability type (ZONAL vs REGIONAL)

**Status**: ✅ **NOT RELATED** to this failure
**Reason**: MySQL instance created successfully

#### TD-TF-003: SSL requirement verification

**Status**: ⚠️ **POTENTIALLY RELATED**
**Reason**: Cloud Run ↔ MySQL connection may require SSL settings
**Evidence**: Container startup failed, could be due to DB connection issues

#### TD-TF-004: DATA_READ audit log verification

**Status**: ✅ **NOT RELATED** to this failure
**Reason**: Audit logs don't affect apply success

#### TD-TF-005: Backend configuration

**Status**: ✅ **RESOLVED** (backend working)
**Evidence**: Backend init successful, state stored in GCS

#### TD-TF-006: Deprecated require_ssl argument

**Status**: ⚠️ **WARNING PRESENT** (not failure)
**Evidence**: Plan showed deprecation warning but didn't cause failure

---

## 4️⃣ CẬP NHẬT / ĐỀ XUẤT TECHNICAL DEBT

### 4.1 Updated Technical Debt from 0021

| TD ID | Status | Notes |
|-------|--------|-------|
| TD-TF-001 | ✅ RESOLVED | MySQL tier db-g1-small works |
| TD-TF-002 | ✅ RESOLVED | ZONAL availability works |
| TD-TF-003 | ⚠️ MONITOR | SSL setting may affect Cloud Run connection |
| TD-TF-004 | ⏳ PENDING | Not tested yet |
| TD-TF-005 | ✅ RESOLVED | Backend working correctly |
| TD-TF-006 | ⚠️ ACTIVE | Deprecation warning present |

### 4.2 New Technical Debt Items

#### TD-TF-007: **Scope Misalignment - Cloud Run Not Approved**

**Category**: IaC / Process
**Severity**: **CRITICAL**
**Priority**: **P0 (BLOCKER)**

**Description**:
Terraform code in main branch includes Cloud Run service deployment (`terraform/main.tf` lines 43-204) which was NOT part of the approved MySQL-only skeleton from Tasks 0020/0021. This represents scope creep and violates Appendix F.

**Impact**:
- Infrastructure deployed beyond approved scope
- Apply failures due to unready dependencies (container image)
- Constitution violation

**Recommendation**: Remove Cloud Run resources from Terraform until approved in separate task.

---

#### TD-TF-008: **HP-05 Violation - Secret Versions Managed by Terraform**

**Category**: IaC / Security
**Severity**: **HIGH**
**Priority**: **P0 (BLOCKER)**

**Description**:
Terraform code creates `google_secret_manager_secret_version` resources (`secrets.tf` lines 42-45, 74-77, 106-109), directly managing secret values. This violates HP-05 which mandates "Terraform manages metadata ONLY, values from chatgpt-githubnew".

**Impact**:
- Secret values stored in Terraform state (security risk)
- Violates centralized secret management architecture
- Constitution non-compliance

**Recommendation**: Remove all `google_secret_manager_secret_version` resources; populate values via chatgpt-githubnew instead.

---

#### TD-TF-009: **IAM Permission Insufficient - secretmanager.secrets.setIamPolicy**

**Category**: GCP / IAM
**Severity**: **HIGH**
**Priority**: **P1**

**Description**:
Service account `chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com` lacks `secretmanager.secrets.setIamPolicy` permission, causing IAM binding failures for all 3 Directus secrets.

**Impact**:
- Secrets created but no access control applied
- Cloud Run service cannot access secrets (if it were healthy)
- Security risk: secrets without proper IAM policies

**Recommendation**: Grant `roles/secretmanager.admin` or `roles/secretmanager.secretManager` to service account. However, this may not be needed if TD-TF-008 is resolved (no Terraform-managed secret values).

---

#### TD-TF-010: **Container Image Configuration - Startup Probe Failure**

**Category**: IaC / Container
**Severity**: **HIGH**
**Priority**: **P1**

**Description**:
Cloud Run service `directus-test` created but container failed startup probe checks. Public image `directus/directus:latest` may not be compatible with provided configuration or health check endpoint `/server/health` is incorrect.

**Impact**:
- Cloud Run service exists but non-functional (STATUS=False)
- No healthy revision available
- Resource waste (billing for failed service)

**Recommendation**:
1. Verify Directus health endpoint (may be `/admin` or `/` not `/server/health`)
2. Test container locally with same environment variables
3. Consider building custom image from Artifact Registry
4. Increase `initial_delay_seconds` if container needs more startup time

---

#### TD-TF-011: **State Inconsistency - Partial Apply Failure**

**Category**: Infrastructure / State Management
**Severity**: **CRITICAL**
**Priority**: **P0 (BLOCKER)**

**Description**:
Terraform apply failed mid-execution after creating multiple resources. Current state is inconsistent:
- Resources exist in GCP but may not be fully in Terraform state
- Cloud Run service exists but unhealthy
- Secret IAM bindings failed
- State file may contain errors or be out of sync

**Impact**:
- Next `terraform apply` may fail or cause conflicts
- Manual cleanup may be required
- Risk of orphaned resources

**Recommendation**:
1. Manually inspect Terraform state: `terraform show`
2. Check for tainted resources: `terraform state list`
3. Consider: `terraform refresh` to sync state with reality
4. May need targeted destroys: `terraform destroy -target=google_cloud_run_v2_service.directus`

---

#### TD-TF-012: **Artifact Registry Not in Original Skeleton**

**Category**: IaC / Scope
**Severity**: **MEDIUM**
**Priority**: **P2**

**Description**:
Current `main.tf` creates Artifact Registry repository `web-test`, but this was not part of the Task 0020 MySQL-only skeleton which planned for 28 resources.

**Impact**:
- Scope creep beyond approved infrastructure
- Task 0020 skeleton included different Artifact Registry config (in `artifacts.tf`)

**Recommendation**:
Reconcile with Task 0020 skeleton: verify if Artifact Registry should use config from `terraform/artifacts.tf` (if it exists) or if this is legitimate addition.

---

## 5️⃣ ĐỀ XUẤT HƯỚNG XỬ LÝ CHO TASK 0022B

### 5.1 Immediate Actions (CRITICAL - Before Re-Apply)

#### Action 1: **Clean Up Partial Infrastructure** ⚡ URGENT

**Why**: State inconsistency blocks further applies

**Steps**:
1. **Inspect current Terraform state**:
   ```bash
   cd terraform
   terraform state list
   terraform show | grep -A 5 "google_cloud_run_v2_service.directus"
   ```

2. **Manually destroy failed Cloud Run service**:
   ```bash
   gcloud run services delete directus-test --region=asia-southeast1 --project=github-chatgpt-ggcloud
   # OR via Terraform:
   terraform destroy -target=google_cloud_run_v2_service.directus
   ```

3. **Check and potentially remove orphaned secrets**:
   ```bash
   gcloud secrets list --project=github-chatgpt-ggcloud --filter="name:DIRECTUS"
   # Decide: keep or delete based on HP-05 resolution
   ```

4. **Refresh Terraform state**:
   ```bash
   terraform refresh
   ```

---

#### Action 2: **Resolve Scope Violation - Return to MySQL-Only** ⚡ CRITICAL

**Why**: Constitution compliance + match approved Tasks 0020/0021

**Steps**:
1. **Create new branch** from main:
   ```bash
   git checkout -b fix/0022B-return-to-mysql-only
   ```

2. **Remove Cloud Run resources** from `terraform/main.tf`:
   - Delete lines 11-14: `google_project_service.run`
   - Delete lines 16-34: Artifact Registry (if duplicated from Task 0020)
   - Delete lines 36-204: Cloud Run service + IAM binding
   - Keep ONLY: API enables that MySQL needs

3. **Verify against Task 0020 skeleton**:
   - Compare current files vs. Task 0020 skeleton (10 files)
   - Ensure only MySQL, GCS, Secret metadata (NO versions), Artifact Registry (if in Task 0020)

4. **Run plan locally**:
   ```bash
   terraform plan
   # Should show ~28 resources or similar to Task 0021 report
   ```

---

#### Action 3: **Resolve HP-05 Violation - Remove Secret Versions** ⚡ CRITICAL

**Why**: Constitution compliance (HP-05)

**Steps**:
1. **Edit `terraform/secrets.tf`**:
   - Remove lines 16-19: `random_password.directus_key`
   - Remove lines 42-45: `google_secret_manager_secret_version.directus_key`
   - Remove lines 48-51: `random_password.directus_secret`
   - Remove lines 74-77: `google_secret_manager_secret_version.directus_secret`
   - Remove lines 80-83: `random_password.directus_db_password`
   - Remove lines 106-109: `google_secret_manager_secret_version.directus_db_password`

2. **Keep ONLY**:
   - Secret metadata resources (`google_secret_manager_secret.*`)
   - IAM bindings for secretAccessor (reading secrets, not setting policies)

3. **Coordinate with chatgpt-githubnew**:
   - Request secret population for:
     - `DIRECTUS_KEY_test`
     - `DIRECTUS_SECRET_test`
     - `DIRECTUS_DB_PASSWORD_test`

---

### 5.2 IAM Permission Fix (If Needed After HP-05 Resolution)

**If Terraform still needs to manage secret IAM bindings** (decision needed):

**Option A**: Grant broader permission
```bash
gcloud projects add-iam-policy-binding github-chatgpt-ggcloud \
  --member="serviceAccount:chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com" \
  --role="roles/secretmanager.admin"
```

**Option B**: Remove IAM bindings from Terraform
- Delete `google_secret_manager_secret_iam_member.*` resources
- Manage secret access via manual IAM or separate process

**Recommendation**: Option B (remove from Terraform) aligns better with HP-05 principle.

---

### 5.3 Validation Steps (Before Re-Apply)

**Pre-flight checks**:

1. ✅ **Verify code matches Task 0020 skeleton**:
   - 10 Terraform files (backend, providers, variables, storage, sql, secrets, artifacts, audit, monitoring, outputs)
   - NO Cloud Run resources
   - NO secret version resources
   - Resource count ~28 (as per Task 0021 plan)

2. ✅ **Run local plan**:
   ```bash
   terraform init -backend-config="bucket=huyen1974-web-test-tfstate" -backend-config="prefix=terraform/state"
   terraform plan -no-color | tee plan-output.txt
   # Review: Should show NO Cloud Run, NO secret versions
   ```

3. ✅ **Check Anti-Stupid compliance**:
   ```bash
   grep -r "postgres\|chatwoot\|kestra\|n8n" terraform/
   # Should return NOTHING or only comments about "NO postgres"
   ```

4. ✅ **Verify Constitution checklist**:
   - HP-02: No hardcoded secrets ✅
   - HP-05: Metadata only, no secret values ✅
   - HP-VIII: WIF auth ✅
   - Appendix F: MySQL-only ✅

---

### 5.4 Re-Apply Strategy

**Option 1: Targeted Apply (Safer)**
```bash
# Apply in stages to isolate failures
terraform apply -target=google_project_service.sqladmin
terraform apply -target=module.mysql_directus
terraform apply  # Apply remaining
```

**Option 2: Full Apply with Monitoring**
```bash
terraform apply -no-color 2>&1 | tee apply-log.txt
# Monitor closely, ready to Ctrl+C if unexpected resources appear
```

**Recommendation**: Use Option 1 for first re-apply to minimize blast radius.

---

## 6️⃣ COMPLIANCE SUMMARY

### Constitution Rules Evaluated

| Rule | Status | Evidence |
|------|--------|----------|
| **HP-02** (No hardcoded secrets) | ⚠️ PARTIAL | Secret values in code via random_password |
| **HP-05** (Metadata only) | ❌ **VIOLATED** | Secret versions created by Terraform |
| **HP-VIII** (WIF auth) | ✅ COMPLIANT | WIF working correctly |
| **HP-SEC-01** (Least privilege) | ⚠️ PARTIAL | SA lacks setIamPolicy permission |
| **HP-SEC-03** (Audit logging) | ⏳ NOT TESTED | Audit resources not created yet |
| **Appendix F** (MySQL-only) | ❌ **VIOLATED** | Cloud Run service deployed |
| **SP-03** (No budget in IaC) | ✅ COMPLIANT | No billing_budget resource |

---

## 7️⃣ FINAL RECOMMENDATIONS

### Critical Path to Success (Task 0022B)

1. **CLEAN UP** partial infrastructure (destroy failed Cloud Run)
2. **REVERT** code to MySQL-only scope (remove Cloud Run, secret versions)
3. **VERIFY** against Task 0020 skeleton (28 resources)
4. **RE-APPLY** with targeted approach
5. **DOCUMENT** state changes in new report

### Success Criteria for Task 0022B

✅ Terraform apply completes with exit code 0
✅ Only MySQL-only resources created (per Task 0020 scope)
✅ NO Cloud Run resources
✅ NO secret version resources (HP-05 compliant)
✅ State file consistent with GCP reality
✅ All Constitution rules compliant

---

## 8️⃣ EVIDENCE ARCHIVE

### Log Files
- Full CI log: `/tmp/run-19405125561.zip`
- Terraform output: `/tmp/0_Terraform Plan_Apply _ terraform.txt`

### GCP Resource State (as of 2025-11-16)

**Cloud SQL**:
```
$ gcloud sql instances list --project=github-chatgpt-ggcloud
NAME                     STATUS    REGION
mysql-directus-web-test  RUNNABLE  asia-southeast1
```

**Secrets**:
```
$ gcloud secrets list --project=github-chatgpt-ggcloud --filter="name:DIRECTUS"
NAME                       CREATED
DIRECTUS_DB_PASSWORD_test  2025-11-16T11:49:31
DIRECTUS_KEY_test          2025-11-16T11:49:31
DIRECTUS_SECRET_test       2025-11-16T11:49:31
```

**Cloud Run**:
```
$ gcloud run services list --region=asia-southeast1
NAME             STATUS  CREATION_TIMESTAMP
directus-test    False   2025-11-16T11:57:15.908811Z
```

---

## CONCLUSION

**Task 0022A Investigation**: ✅ **COMPLETE**

**Root Causes Identified**: 3 critical issues
1. Scope violation (Cloud Run not approved)
2. HP-05 violation (secret versions in Terraform)
3. IAM permission missing

**Infrastructure Impact**: PARTIAL CREATION with state inconsistency

**Next Steps**: Task 0022B must clean up, revert to MySQL-only scope, and re-apply.

**Estimated Recovery Time**: 1-2 hours (cleanup + fix + re-apply)

---

**Report Generated**: 2025-11-16
**Agent**: Claude Code
**Status**: Investigation complete, awaiting Task 0022B execution

**🚨 BLOCKER**: Do NOT attempt re-apply until scope violations (TD-TF-007, TD-TF-008) are resolved. 🚨
