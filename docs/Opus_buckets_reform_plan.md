# 📋 MA TRẬN KẾ HOẠCH TRIỂN KHAI BUCKETS TERRAFORM

## TỔNG QUAN PHASES

| Phase | Task | Action |
| :--- | :--- | :--- |
| **PHASE 0: VERIFICATION & BACKUP** | **B0.1** | Verify Blueprint vs Reality (web-test) |
| | **B0.2** | Verify Blueprint vs Reality (agent-data-test) |
| | **B0.3** | Backup web-test → web-test-backup |
| | **B0.4** | Backup agent-data-test → agent-data-test-backup |
| **PHASE 1: IMPORT & LOCK (web-test)** | **B1.1** | Setup Terraform Structure (web-test) |
| | **B1.2** | Import W1-T (TF State) |
| | **B1.3** | Import S3, S4, S5 (Orphan/Legacy) |
| **PHASE 2: CREATE TEST BUCKETS (web-test)** | **B2.1** | Create S1 (System Backups) |
| | **B2.2** | Create S2 (Temp) |
| | **B2.3** | Create W2-T (Directus) + Migration Plan |
| | **B2.4** | Create W3-T, W4-T, W5-T |
| **PHASE 3: CREATE PRODUCTION BUCKETS (web-test)** | **B3.1** | Create W1-P (TF State Prod) |
| | **B3.2** | Create W2-P → W5-P |
| **PHASE 4: AGENT-DATA (Separate Track)** | **B4.1** | Setup Terraform Structure (agent-data-test) |
| | **B4.2** | Import A1-T → A6-T, A-L1, A-L2 |
| | **B4.3** | Import A1-P → A5-P, A-LP |
| | **B4.4** | Create A6-P (Backup Production) |

## PHASE 0: VERIFICATION & BACKUP

| Bước | Repo | Mục tiêu | Executor | Gate Condition | Prompt ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| B0.1 | web-test | Verify Blueprint phản ánh 100% thực tế buckets | Cursor + Antigravity | Output: Checklist ✅/❌ cho từng bucket | PROMPT-B0.1 |
| B0.2 | agent-data-test | Verify Blueprint phản ánh 100% thực tế buckets | Cursor + Antigravity | Output: Checklist ✅/❌ cho từng bucket | PROMPT-B0.2 |
| B0.3 | web-test → web-test-backup | Backup toàn bộ repo trước khi thay đổi | Antigravity | Backup commit với tag pre-terraform-YYYYMMDD | PROMPT-B0.3 |
| B0.4 | agent-data-test → agent-data-test-backup | Backup toàn bộ repo trước khi thay đổi | Antigravity | Backup commit với tag pre-terraform-YYYYMMDD | PROMPT-B0.4 |

## PROMPT-B0.1: Verify Blueprint - web-test

````markdown
Role: Cursor + Antigravity, GCP Infrastructure Auditor.

Mission: VERIFY Blueprint accuracy for `web-test` repo buckets.
**Reason:** Ensure BUCKETS_MASTER_BLUEPRINT.md reflects 100% reality before Terraform changes.

Reference: `/Users/nmhuyen/Documents/Manual Deploy/web-test/docs/BUCKETS_MASTER_BLUEPRINT.md`

Execution Tasks:

### TASK 1: LIST ALL ACTUAL BUCKETS IN GCP
Run the following command and capture output:
```bash
gsutil ls -p github-chatgpt-ggcloud | grep -E "huyen1974-(web|system|artifact|log|chatgpt|directus)" | sort
```

### TASK 1.5: VERIFY NHÓM 0 BUCKETS (Google-Managed)
**Purpose:** Confirm UNVERIFIED buckets in Blueprint before proceeding.

| ID | Bucket Name | Blueprint Status | CLI Check Command | Actual Status | Action |
|:---|:------------|:-----------------|:------------------|:--------------|:-------|
| Sys-1 | `github-chatgpt-ggcloud_cloudbuild` | Exist | `gsutil ls -b gs://github-chatgpt-ggcloud_cloudbuild` | ? | KEEP |
| Sys-2 | `us.artifacts.github-chatgpt-ggcloud.appspot.com` | **UNVERIFIED** | `gsutil ls -b gs://us.artifacts.github-chatgpt-ggcloud.appspot.com` | ? | FREEZE/REMOVE |
| Sys-3 | `asia.artifacts.github-chatgpt-ggcloud.appspot.com` | **UNVERIFIED** | `gsutil ls -b gs://asia.artifacts.github-chatgpt-ggcloud.appspot.com` | ? | AUDIT/REMOVE |
| Sys-4 | `gcf-v2-sources-812872501910-asia-southeast1` | Exist | `gsutil ls -b gs://gcf-v2-sources-812872501910-asia-southeast1` | ? | KEEP |
| Sys-5 | `gcf-v2-uploads-812872501910-asia-southeast1` | **UNVERIFIED** | `gsutil ls -b gs://gcf-v2-uploads-812872501910-asia-southeast1` | ? | MONITOR/REMOVE |
| Sys-7 | `run-sources-github-chatgpt-ggcloud-asia-southeast1` | Exist | `gsutil ls -b gs://run-sources-github-chatgpt-ggcloud-asia-southeast1` | ? | KEEP |

**Note:** NHÓM 0 buckets are Google-managed. We do NOT manage them in Terraform, but we MUST verify their existence and decide FREEZE/REMOVE for UNVERIFIED ones.

### TASK 2: VERIFY EACH BUCKET IN BLUEPRINT (Nhóm 1, 4, 5 + Legacy)
For each bucket in Blueprint, check:

| ID | Bucket Name | Blueprint Status | CLI Check Command | Actual Status | Match? |
|:---|:------------|:-----------------|:------------------|:--------------|:------:|
| S1 | `huyen1974-system-backups-shared` | MISSING | `gsutil ls -b gs://huyen1974-system-backups-shared` | ? | ⬜ |
| S2 | `huyen1974-system-temp-shared` | MISSING | `gsutil ls -b gs://huyen1974-system-temp-shared` | ? | ⬜ |
| S3 | `huyen1974-artifact-storage` | EXIST | `gsutil ls -b gs://huyen1974-artifact-storage` | ? | ⬜ |
| S4 | `huyen1974-log-storage` | EXIST | `gsutil ls -b gs://huyen1974-log-storage` | ? | ⬜ |
| S5 | `huyen1974-chatgpt-functions` | EXIST | `gsutil ls -b gs://huyen1974-chatgpt-functions` | ? | ⬜ |
| W1-T | `huyen1974-web-test-tfstate` | EXIST | `gsutil ls -b gs://huyen1974-web-test-tfstate` | ? | ⬜ |
| W2-T | `huyen1974-web-uploads-test` | MISSING | `gsutil ls -b gs://huyen1974-web-uploads-test` | ? | ⬜ |
| W3-T | `huyen1974-kestra-storage-test` | MISSING | `gsutil ls -b gs://huyen1974-kestra-storage-test` | ? | ⬜ |
| W4-T | `huyen1974-chatwoot-storage-test` | MISSING | `gsutil ls -b gs://huyen1974-chatwoot-storage-test` | ? | ⬜ |
| W5-T | `huyen1974-affiliate-data-test` | MISSING | `gsutil ls -b gs://huyen1974-affiliate-data-test` | ? | ⬜ |
| Legacy-1 | `directus-assets-test-20251223` | EXIST | `gsutil ls -b gs://directus-assets-test-20251223` | ? | ⬜ |
| W1-P | `huyen1974-web-production-tfstate` | MISSING | `gsutil ls -b gs://huyen1974-web-production-tfstate` | ? | ⬜ |
| W2-P | `huyen1974-web-uploads-production` | MISSING | `gsutil ls -b gs://huyen1974-web-uploads-production` | ? | ⬜ |
| W3-P | `huyen1974-kestra-storage-production` | MISSING | `gsutil ls -b gs://huyen1974-kestra-storage-production` | ? | ⬜ |
| W4-P | `huyen1974-chatwoot-storage-production` | MISSING | `gsutil ls -b gs://huyen1974-chatwoot-storage-production` | ? | ⬜ |
| W5-P | `huyen1974-affiliate-data-production` | MISSING | `gsutil ls -b gs://huyen1974-affiliate-data-production` | ? | ⬜ |

### TASK 3: CHECK FOR UNEXPECTED BUCKETS
List any buckets found in GCP that are NOT in Blueprint:
```bash
# Step 1: Get all actual buckets matching our patterns (including gcf-v2-* and run-sources-*)
gsutil ls -p github-chatgpt-ggcloud | grep -E "huyen1974-|directus-|github-chatgpt-ggcloud|gcf-v2-|run-sources-" | sort > /tmp/actual_buckets.txt

# Step 2: Create expected list from Blueprint (web-test scope + Sys buckets)
cat << 'EOF' > /tmp/expected_buckets.txt
gs://github-chatgpt-ggcloud_cloudbuild/
gs://us.artifacts.github-chatgpt-ggcloud.appspot.com/
gs://asia.artifacts.github-chatgpt-ggcloud.appspot.com/
gs://gcf-v2-sources-812872501910-asia-southeast1/
gs://gcf-v2-uploads-812872501910-asia-southeast1/
gs://run-sources-github-chatgpt-ggcloud-asia-southeast1/
gs://huyen1974-system-backups-shared/
gs://huyen1974-system-temp-shared/
gs://huyen1974-artifact-storage/
gs://huyen1974-log-storage/
gs://huyen1974-chatgpt-functions/
gs://huyen1974-web-test-tfstate/
gs://huyen1974-web-uploads-test/
gs://huyen1974-kestra-storage-test/
gs://huyen1974-chatwoot-storage-test/
gs://huyen1974-affiliate-data-test/
gs://huyen1974-web-production-tfstate/
gs://huyen1974-web-uploads-production/
gs://huyen1974-kestra-storage-production/
gs://huyen1974-chatwoot-storage-production/
gs://huyen1974-affiliate-data-production/
gs://directus-assets-test-20251223/
EOF

# Step 3: Find unexpected buckets (in actual but not in expected)
echo "=== UNEXPECTED BUCKETS (In GCP but NOT in Blueprint) ==="
comm -23 <(sort /tmp/actual_buckets.txt) <(sort /tmp/expected_buckets.txt)

# Step 4: Find missing buckets (in expected but not in actual)
echo "=== MISSING BUCKETS (In Blueprint but NOT in GCP) ==="
comm -13 <(sort /tmp/actual_buckets.txt) <(sort /tmp/expected_buckets.txt)
```

**Action Required:**
- If UNEXPECTED buckets found → Document in Blueprint or mark for removal
- If MISSING buckets found → Confirm Blueprint status is correct (MISSING = expected)

### TASK 4: REPORT
Output format:
```
=== VERIFICATION REPORT: web-test ===
Date: YYYY-MM-DD HH:MM

MATCHED (Blueprint = Reality):
✅ S3: huyen1974-artifact-storage - EXIST
✅ S4: huyen1974-log-storage - EXIST
...

MISMATCHED (Need Blueprint Update):
❌ [ID]: [bucket-name] - Blueprint says [X], Reality is [Y]
...

UNEXPECTED (In GCP but not in Blueprint):
⚠️ [bucket-name] - Exists in GCP, not documented
...

VERDICT: [PASS / FAIL - Need Blueprint Update]
```

### GATE CONDITION
- If VERDICT = PASS → Proceed to B0.2
- If VERDICT = FAIL → Update Blueprint, re-run B0.1
````

## PROMPT-B0.2: Verify Blueprint - agent-data-test

````markdown
Role: Cursor + Antigravity, GCP Infrastructure Auditor.

Mission: VERIFY Blueprint accuracy for `agent-data-test` repo buckets.
**Reason:** Ensure BUCKETS_MASTER_BLUEPRINT.md reflects 100% reality before Terraform changes.

Reference: `/Users/nmhuyen/Documents/Manual Deploy/web-test/docs/BUCKETS_MASTER_BLUEPRINT.md`

Execution Tasks:

### TASK 1: LIST ALL ACTUAL BUCKETS IN GCP
Run the following command and capture output:
```bash
gsutil ls -p github-chatgpt-ggcloud | grep -E "huyen1974-agent-data|huyen1974-faiss" | sort
```

### TASK 2: VERIFY EACH BUCKET IN BLUEPRINT (Nhóm 2, 3)
For each bucket in Blueprint, check:

| ID | Bucket Name | Blueprint Status | CLI Check Command | Actual Status | Match? |
|:---|:------------|:-----------------|:------------------|:--------------|:------:|
| A1-T | `huyen1974-agent-data-tfstate-test` | EXIST | `gsutil ls -b gs://huyen1974-agent-data-tfstate-test` | ? | ⬜ |
| A2-T | `huyen1974-agent-data-knowledge-test` | EXIST | `gsutil ls -b gs://huyen1974-agent-data-knowledge-test` | ? | ⬜ |
| A3-T | `huyen1974-agent-data-artifacts-test` | EXIST | `gsutil ls -b gs://huyen1974-agent-data-artifacts-test` | ? | ⬜ |
| A4-T | `huyen1974-agent-data-logs-test` | EXIST | `gsutil ls -b gs://huyen1974-agent-data-logs-test` | ? | ⬜ |
| A5-T | `huyen1974-agent-data-qdrant-snapshots-test` | EXIST | `gsutil ls -b gs://huyen1974-agent-data-qdrant-snapshots-test` | ? | ⬜ |
| A6-T | `huyen1974-agent-data-backup-test` | EXIST | `gsutil ls -b gs://huyen1974-agent-data-backup-test` | ? | ⬜ |
| A-L1 | `huyen1974-agent-data-source-test` | EXIST | `gsutil ls -b gs://huyen1974-agent-data-source-test` | ? | ⬜ |
| A-L2 | `huyen1974-faiss-index-storage` | EXIST | `gsutil ls -b gs://huyen1974-faiss-index-storage` | ? | ⬜ |
| Legacy | `huyen1974-agent-data-terraform-state` | EXIST | `gsutil ls -b gs://huyen1974-agent-data-terraform-state` | ? | ⬜ |
| A1-P | `huyen1974-agent-data-tfstate-production` | EXIST | `gsutil ls -b gs://huyen1974-agent-data-tfstate-production` | ? | ⬜ |
| A2-P | `huyen1974-agent-data-knowledge-production` | EXIST | `gsutil ls -b gs://huyen1974-agent-data-knowledge-production` | ? | ⬜ |
| A3-P | `huyen1974-agent-data-artifacts-production` | EXIST | `gsutil ls -b gs://huyen1974-agent-data-artifacts-production` | ? | ⬜ |
| A4-P | `huyen1974-agent-data-logs-production` | EXIST | `gsutil ls -b gs://huyen1974-agent-data-logs-production` | ? | ⬜ |
| A5-P | `huyen1974-agent-data-qdrant-snapshots-production` | EXIST | `gsutil ls -b gs://huyen1974-agent-data-qdrant-snapshots-production` | ? | ⬜ |
| A6-P | `huyen1974-agent-data-backup-production` | MISSING | `gsutil ls -b gs://huyen1974-agent-data-backup-production` | ? | ⬜ |
| A-LP | `huyen1974-agent-data-source-production` | EXIST | `gsutil ls -b gs://huyen1974-agent-data-source-production` | ? | ⬜ |

### TASK 3: CHECK FOR UNEXPECTED BUCKETS
List any agent-data buckets found in GCP that are NOT in Blueprint.

### TASK 4: REPORT
Output format: (Same as B0.1)

### GATE CONDITION
- If VERDICT = PASS → Proceed to B0.3
- If VERDICT = FAIL → Update Blueprint, re-run B0.1 & B0.2
````

## PROMPT-B0.3: Backup web-test

````markdown
Role: Antigravity, DevOps Engineer.

Mission: BACKUP `web-test` repo to `web-test-backup` before Terraform changes.
**Reason:** Safety net for rollback if Terraform execution causes issues.

Source: `Huyen1974/web-test` (main branch)
Target: `Huyen1974/web-test-backup`

Execution Tasks:

### TASK 1: CLONE/UPDATE BACKUP REPO
```bash
# Safety check: Verify we're pushing to the correct backup repo
EXPECTED_BACKUP_REPO="https://github.com/Huyen1974/web-test-backup.git"
echo "⚠️ VERIFY: Backup target is $EXPECTED_BACKUP_REPO"
echo "Press Ctrl+C within 5 seconds to abort if incorrect..."
sleep 5

cd /Users/nmhuyen/Documents/Manual\ Deploy/
git clone https://github.com/Huyen1974/web-test-backup.git || cd web-test-backup && git pull origin main
```

### TASK 2: SYNC FROM SOURCE TO BACKUP
```bash
cd /Users/nmhuyen/Documents/Manual\ Deploy/web-test-backup

# Remove old content (except .git)
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} \;

# Copy all from source
cp -r /Users/nmhuyen/Documents/Manual\ Deploy/web-test/* .

# Verify copy
ls -la
```

### TASK 3: COMMIT WITH TIMESTAMP TAG
```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
git add -A
git commit -m "Backup pre-terraform: $TIMESTAMP"
git tag "pre-terraform-$TIMESTAMP"
git push origin main --tags
```

### TASK 4: VERIFY BACKUP
```bash
echo "=== BACKUP VERIFICATION ==="
echo "Commit: $(git rev-parse HEAD)"
echo "Tag: pre-terraform-$TIMESTAMP"
echo "Files: $(git ls-files | wc -l)"
echo "Remote: $(git remote get-url origin)"
```

### OUTPUT REQUIRED
```
=== BACKUP REPORT: web-test ===
Date: YYYY-MM-DD HH:MM
Source: Huyen1974/web-test
Target: Huyen1974/web-test-backup
Commit SHA: [hash]
Tag: pre-terraform-YYYYMMDD_HHMMSS
Files backed up: [count]
Status: ✅ SUCCESS / ❌ FAILED
```

### GATE CONDITION
- If Status = SUCCESS → Proceed to B0.4
- If Status = FAILED → Debug and retry B0.3
````

## PROMPT-B0.4: Backup agent-data-test

````markdown
Role: Antigravity, DevOps Engineer.

Mission: BACKUP `agent-data-test` repo to `agent-data-test-backup` before Terraform changes.
**Reason:** Safety net for rollback if Terraform execution causes issues.

Source: `Huyen1974/agent-data-test` (main branch)
Target: `Huyen1974/agent-data-test-backup`

Execution Tasks:

### TASK 1: CLONE/UPDATE BACKUP REPO
```bash
# Safety check: Verify we're pushing to the correct backup repo
EXPECTED_BACKUP_REPO="https://github.com/Huyen1974/agent-data-test-backup.git"
echo "⚠️ VERIFY: Backup target is $EXPECTED_BACKUP_REPO"
echo "Press Ctrl+C within 5 seconds to abort if incorrect..."
sleep 5

cd /Users/nmhuyen/Documents/Manual\ Deploy/
git clone https://github.com/Huyen1974/agent-data-test-backup.git || cd agent-data-test-backup && git pull origin main
```

### TASK 2: SYNC FROM SOURCE TO BACKUP
```bash
cd /Users/nmhuyen/Documents/Manual\ Deploy/agent-data-test-backup

# Remove old content (except .git)
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} \;

# Copy all from source
cp -r /Users/nmhuyen/Documents/Manual\ Deploy/agent-data-test/* .

# Verify copy
ls -la
```

### TASK 3: COMMIT WITH TIMESTAMP TAG
```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
git add -A
git commit -m "Backup pre-terraform: $TIMESTAMP"
git tag "pre-terraform-$TIMESTAMP"
git push origin main --tags
```

### TASK 4: VERIFY BACKUP
```bash
echo "=== BACKUP VERIFICATION ==="
echo "Commit: $(git rev-parse HEAD)"
echo "Tag: pre-terraform-$TIMESTAMP"
echo "Files: $(git ls-files | wc -l)"
echo "Remote: $(git remote get-url origin)"
```

### OUTPUT REQUIRED
```
=== BACKUP REPORT: agent-data-test ===
Date: YYYY-MM-DD HH:MM
Source: Huyen1974/agent-data-test
Target: Huyen1974/agent-data-test-backup
Commit SHA: [hash]
Tag: pre-terraform-YYYYMMDD_HHMMSS
Files backed up: [count]
Status: ✅ SUCCESS / ❌ FAILED
```

### GATE CONDITION
- If Status = SUCCESS → Proceed to PHASE 1 (B1.1)
- If Status = FAILED → Debug and retry B0.4
````

---

## PHASE 1-4: TERRAFORM EXECUTION

| Bước | Repo | Mục tiêu | Executor | Gate Condition | Prompt ID |
|:----:|:-----|:---------|:---------|:---------------|:----------|
| **B1.1** | `web-test` | Setup Terraform directory structure | Cursor | `provider.tf`, `backend.tf`, `variables.tf` created | `PROMPT-B1.1` |
| **B1.2** | `web-test` | Import W1-T (TF State bucket) | Cursor + Manual | `terraform plan` shows "No changes" | `PROMPT-B1.2` |
| **B1.3** | `web-test` | Import S3, S4, S5 (Orphan/Legacy) | Cursor + Manual | `terraform plan` shows "No changes" | `PROMPT-B1.3` |
| **B2.1** | `web-test` | Create S1 (System Backups) | Cursor | Bucket exists, `gsutil ls` confirms | `PROMPT-B2.1` |
| **B2.2** | `web-test` | Create S2 (Temp) | Cursor | Bucket exists | `PROMPT-B2.2` |
| **B2.3** | `web-test` | Create W2-T + Migration Plan | Cursor | Bucket exists + Migration checklist completed | `PROMPT-B2.3` |
| **B2.4** | `web-test` | Create W3-T, W4-T, W5-T | Cursor | All 3 buckets exist | `PROMPT-B2.4` |
| **B3.1** | `web-test` | Create W1-P (TF State Prod) | Cursor | Bucket exists | `PROMPT-B3.1` |
| **B3.2** | `web-test` | Create W2-P → W5-P | Cursor | All 4 buckets exist | `PROMPT-B3.2` |
| **B4.1** | `agent-data-test` | Setup Terraform structure | Cursor | Structure ready | `PROMPT-B4.1` |
| **B4.2** | `agent-data-test` | Import A1-T → A6-T, A-L1, A-L2 | Cursor + Manual | `terraform plan` shows **EXACTLY**: `0 to add, 0 to change, 0 to destroy`. If ANY change detected → STOP, do NOT apply. | `PROMPT-B4.2` |
| **B4.3** | `agent-data-test` | Import A1-P → A5-P, A-LP | Cursor + Manual | `terraform plan` shows **EXACTLY**: `0 to add, 0 to change, 0 to destroy`. If ANY change detected → STOP, do NOT apply. | `PROMPT-B4.3` |
| **B4.4** | `agent-data-test` | Create A6-P (Backup Production) | Cursor | Bucket exists | `PROMPT-B4.4` |


> **⚠️ CRITICAL RULE FOR AGENT-DATA (Phase 4):**
> - Gate condition `"No changes"` means **EXACTLY**: `Plan: 0 to add, 0 to change, 0 to destroy`
> - If terraform plan shows ANY change → **STOP IMMEDIATELY**
> - Do NOT proceed to apply
> - Debug by adjusting `ignore_changes` in lifecycle block to match current bucket state
> - Only proceed when plan shows zero changes

## PROMPT-B2.3: Create W2-T (Directus Assets) + Migration
````markdown
Role: Cursor, GCP Infrastructure Engineer.

Mission: CREATE W2-T bucket and prepare migration from Legacy-1.

Execution Tasks:

### TASK 1: CREATE W2-T BUCKET
Add to `web-test/terraform/storage.tf`:
```hcl
resource "google_storage_bucket" "web_uploads_test" {
  name          = "huyen1974-web-uploads-test"
  location      = "ASIA-SOUTHEAST1"
  storage_class = "STANDARD"
  
  uniform_bucket_level_access = true
  public_access_prevention    = "inherited"
  
  # No lifecycle rule - permanent storage
  
  lifecycle {
    prevent_destroy = true
  }
}

resource "google_storage_bucket_iam_member" "web_uploads_test_public" {
  bucket = google_storage_bucket.web_uploads_test.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
```

### TASK 2: APPLY AND VERIFY
```bash
terraform plan
terraform apply
gsutil ls -b gs://huyen1974-web-uploads-test
```

### TASK 3: MIGRATION CHECKLIST (Legacy-1 → W2-T)
Execute the following steps IN ORDER:

**Pre-Migration:**
- [ ] Count objects in Legacy-1: `gsutil ls gs://directus-assets-test-20251223/** | wc -l`
- [ ] Calculate total size: `gsutil du -s gs://directus-assets-test-20251223`
- [ ] Record values: Objects = _____, Size = _____

**Migration:**
- [ ] Copy all objects: `gsutil -m cp -r gs://directus-assets-test-20251223/* gs://huyen1974-web-uploads-test/`
- [ ] Verify count matches: `gsutil ls gs://huyen1974-web-uploads-test/** | wc -l`
- [ ] Verify size matches: `gsutil du -s gs://huyen1974-web-uploads-test`

**Config Switch:**
- [ ] Update Directus `.env`: `STORAGE_LOCATIONS_S3_BUCKET=huyen1974-web-uploads-test`
- [ ] Restart Directus service
- [ ] Test upload new file via Directus UI
- [ ] Test access existing files via Directus UI

**Freeze Legacy (7-day hold):**
- [ ] Record current IAM: `gsutil iam get gs://directus-assets-test-20251223 > /tmp/legacy1_iam_backup.json`
- [ ] Remove DevOps SA write access: `gsutil iam ch -d serviceAccount:chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com:objectAdmin gs://directus-assets-test-20251223`
- [ ] Add DevOps SA read-only: `gsutil iam ch serviceAccount:chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com:objectViewer gs://directus-assets-test-20251223`
- [ ] Verify read-only: `gsutil iam get gs://directus-assets-test-20251223` (should show objectViewer only for DevOps SA)
- [ ] Record freeze date: _____
- [ ] Set calendar reminder for delete date (freeze + 7 days)

**Delete (After 7 days):**
- [ ] Confirm no errors in 7 days
- [ ] Delete Legacy-1: `gsutil rm -r gs://directus-assets-test-20251223`

### OUTPUT REQUIRED
````
=== MIGRATION REPORT: Legacy-1 → W2-T ===
Date: YYYY-MM-DD HH:MM

Pre-Migration:
- Legacy-1 Objects: [count]
- Legacy-1 Size: [size]

Post-Migration:
- W2-T Objects: [count]
- W2-T Size: [size]
- Match: ✅ / ❌

Config Switch:
- Directus Config Updated: ✅ / ❌
- Upload Test: ✅ / ❌
- Access Test: ✅ / ❌

Freeze Status:
- Legacy-1 Read-Only: ✅ / ❌
- Freeze Date: [date]
- Delete Date: [date + 7 days]

Status: ✅ MIGRATION COMPLETE / ❌ ROLLBACK REQUIRED
````

### GATE CONDITION
- If Status = MIGRATION COMPLETE → Proceed to B2.4
- If Status = ROLLBACK REQUIRED → Revert Directus config, investigate
````

## PROMPT-B4.1.5: Preflight Data-Safety Scan (agent-data)
````markdown
Role: Cursor + Antigravity, Data Safety Auditor.

Mission: SCAN object age distribution in agent-data buckets BEFORE applying lifecycle rules.
**Reason:** Lifecycle rules may DELETE objects older than retention threshold immediately upon apply.

**CRITICAL:** This step is MANDATORY before B4.2/B4.3.

Execution Tasks:

### TASK 1: SCAN OBJECT AGE FOR CRITICAL BUCKETS
Run the following commands to find the OLDEST objects in each bucket:
```bash
# A4-T: Logs (30-day lifecycle)
echo "=== A4-T: agent-data-logs-test (OLDEST 10 objects) ==="
gsutil ls -l gs://huyen1974-agent-data-logs-test/** 2>/dev/null | grep -v "TOTAL:" | sort -k2,3 | head -10
gsutil du -s gs://huyen1974-agent-data-logs-test

# A5-T: Qdrant Snapshots (30-day lifecycle) - CRITICAL
echo "=== A5-T: agent-data-qdrant-snapshots-test (OLDEST 10 objects) ==="
gsutil ls -l gs://huyen1974-agent-data-qdrant-snapshots-test/** 2>/dev/null | grep -v "TOTAL:" | sort -k2,3 | head -10
gsutil du -s gs://huyen1974-agent-data-qdrant-snapshots-test

# A6-T: Backups (90-day lifecycle) - CRITICAL
echo "=== A6-T: agent-data-backup-test (OLDEST 10 objects) ==="
gsutil ls -l gs://huyen1974-agent-data-backup-test/** 2>/dev/null | grep -v "TOTAL:" | sort -k2,3 | head -10
gsutil du -s gs://huyen1974-agent-data-backup-test

# A4-P: Logs Production (30-day lifecycle)
echo "=== A4-P: agent-data-logs-production (OLDEST 10 objects) ==="
gsutil ls -l gs://huyen1974-agent-data-logs-production/** 2>/dev/null | grep -v "TOTAL:" | sort -k2,3 | head -10
gsutil du -s gs://huyen1974-agent-data-logs-production

# A5-P: Qdrant Snapshots Production (30-day lifecycle) - CRITICAL
echo "=== A5-P: agent-data-qdrant-snapshots-production (OLDEST 10 objects) ==="
gsutil ls -l gs://huyen1974-agent-data-qdrant-snapshots-production/** 2>/dev/null | grep -v "TOTAL:" | sort -k2,3 | head -10
gsutil du -s gs://huyen1974-agent-data-qdrant-snapshots-production
```

**Note:** Output is sorted by date (column 2) and time (column 3) ascending, so the FIRST lines are the OLDEST objects. Check if oldest object date is older than retention threshold.

### TASK 2: ANALYZE AND DECIDE
For each bucket, check:
- [ ] Oldest object date < retention threshold? (30d or 90d)
- [ ] If YES → Objects may be DELETED on apply
- [ ] If critical data found → INCREASE retention in Terraform config BEFORE apply

### TASK 3: REPORT
````
=== DATA SAFETY SCAN REPORT ===
Date: YYYY-MM-DD HH:MM

| Bucket | Oldest Object | Retention | Risk Level | Action |
|--------|---------------|-----------|------------|--------|
| A4-T   | [date]        | 30d       | [LOW/MED/HIGH] | [PROCEED/INCREASE RETENTION] |
| A5-T   | [date]        | 30d       | [LOW/MED/HIGH] | [PROCEED/INCREASE RETENTION] |
| A6-T   | [date]        | 90d       | [LOW/MED/HIGH] | [PROCEED/INCREASE RETENTION] |
| A4-P   | [date]        | 30d       | [LOW/MED/HIGH] | [PROCEED/INCREASE RETENTION] |
| A5-P   | [date]        | 30d       | [LOW/MED/HIGH] | [PROCEED/INCREASE RETENTION] |

VERDICT: [SAFE TO PROCEED / NEED RETENTION ADJUSTMENT]
````

### GATE CONDITION
- If VERDICT = SAFE TO PROCEED → Continue to B4.2
- If VERDICT = NEED RETENTION ADJUSTMENT → Modify Terraform config, re-run scan
````

---

## FLOW DIAGRAM

```
START
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│ B0.1: Verify Blueprint (web-test)                          │
│       Executor: Cursor + Antigravity                        │
│       Gate: All buckets match? ──────────────────┐         │
└─────────────────────────────────────────────────────────────┘
                    │                              │
                   YES                            NO
                    │                              │
                    ▼                              ▼
┌─────────────────────────────────────────┐  ┌──────────────────┐
│ B0.2: Verify Blueprint (agent-data)    │  │ Update Blueprint │
│       Gate: All buckets match?         │  │ Re-run B0.1      │
└─────────────────────────────────────────┘  └──────────────────┘
                    │
                   YES
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ B0.3: Backup web-test → web-test-backup                    │
│       Gate: Tag created & pushed?                           │
└─────────────────────────────────────────────────────────────┘
                    │
                   YES
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ B0.4: Backup agent-data-test → agent-data-test-backup      │
│       Gate: Tag created & pushed?                           │
└─────────────────────────────────────────────────────────────┘
                    │
                   YES
                    ▼
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
   ┌───────────┐       ┌───────────┐
   │ PHASE 1-3 │       │ PHASE 4   │
   │ (web-test)│       │ (agent)   │
   └───────────┘       └───────────┘
         │                   │
         ▼                   ▼
      B1.1 → B1.2 → B1.3    B4.1 → B4.1.5 → B4.2 → B4.3 → B4.4
                            (Data Safety Scan - MANDATORY)
         │
         ▼
      B2.1 → B2.2 → B2.3 → B2.4
         │
         ▼
      B3.1 → B3.2
         │
         ▼
       DONE
```

## TỔNG HỢP PROMPTS

| Phase | Bước | Prompt ID | Repo | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- |
| 0 | B0.1 | PROMPT-B0.1 | web-test | 🔴 |
| 0 | B0.2 | PROMPT-B0.2 | agent-data-test | 🔴 |
| 0 | B0.3 | PROMPT-B0.3 | web-test-backup | 🔴 |
| 0 | B0.4 | PROMPT-B0.4 | agent-data-test-backup | 🔴 |
| 1 | B1.1 | PROMPT-B1.1 | web-test | 🟡 |
| 1 | B1.2 | PROMPT-B1.2 | web-test | 🟡 |
| 1 | B1.3 | PROMPT-B1.3 | web-test | 🟡 |
| 2 | B2.1 | PROMPT-B2.1 | web-test | 🟢 |
| 2 | B2.2 | PROMPT-B2.2 | web-test | 🟢 |
| 2 | B2.3 | PROMPT-B2.3 | web-test | 🟢 |
| 2 | B2.4 | PROMPT-B2.4 | web-test | 🟢 |
| 3 | B3.1 | PROMPT-B3.1 | web-test | ⚪ |
| 3 | B3.2 | PROMPT-B3.2 | web-test | ⚪ |
| 4 | B4.1 | PROMPT-B4.1 | agent-data-test | ⚪ |
| 4 | B4.2 | PROMPT-B4.2 | agent-data-test | ⚪ |
| 4 | B4.3 | PROMPT-B4.3 | agent-data-test | ⚪ |
| 4 | B4.4 | PROMPT-B4.4 | agent-data-test | ⚪ |

Bạn muốn tôi viết chi tiết các PROMPT từ B1.1 trở đi không? Hoặc chúng ta thực hiện B0.1 → B0.4 trước rồi mới tiếp tục?
## 🏁 PROJECT CLOSURE
- **Completion Date:** 2026-01-11
- **Status:** ✅ SUCCESS & CLOSED
- **Reports:** See `/reports` folder for detailed audit logs of Phase 0-4.
- **Executor:** Gemini Supervisor + Cursor + Antigravity.
