# ⛔ CURSOR RULES – Agent Data Langroid (critical) Version 1.1
Updated: 2025-08-06

## 1. Context & Operational Scope
You operate only within the defined contexts below.
- **Exclusive Project Path**: /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid
- **Exclusive Google Cloud Project**: github-chatgpt-ggcloud
- **Exclusive Service Account**: chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com
- **Repositories in Scope**:
  - agent-data-test (Development & Testing Repo)
  - agent-data-production (Production Repo)
  - chatgpt-githubnew (Central Secrets Management Repo)
- **Quick WIF Check**
```bash
gcloud auth application-default login --impersonate-service-account=$GCP_SERVICE_ACCOUNT
```

## 2. Infrastructure Management Rules (Terraform)
- **Bucket Naming Convention**: All created buckets MUST follow the format <standard-prefix>-agent-data-<purpose>-<env>.
  - standard-prefix is huyen1974.
  - Character Rule: MUST use hyphens (-), absolutely prohibit underscores (_).
- **Specific Bucket List**: Below is the list of buckets managed by Terraform.

| Bucket Name | Purpose (<purpose>) | Environment (<env>) |
|-------------|---------------------|---------------------|
| huyen1974-agent-data-artifacts-test | artifacts | test |
| huyen1974-agent-data-artifacts-production | artifacts | production |
| huyen1974-agent-data-knowledge-test | knowledge | test |
| huyen1974-agent-data-knowledge-production | knowledge | production |
| huyen1974-agent-data-logs-test | logs | test |
| huyen1974-agent-data-logs-production | logs | production |
| huyen1974-agent-data-qdrant-snapshots-test | qdrant-snapshots | test |
| huyen1974-agent-data-qdrant-snapshots-production | qdrant-snapshots | production |
| huyen1974-agent-data-source-test | source | test |
| huyen1974-agent-data-source-production | source | production |
| huyen1974-agent-data-tfstate-test | tfstate | test |
| huyen1974-agent-data-tfstate-production | tfstate | production |
| huyen1974-agent-data-backup-test | backup | test |
| huyen1974-agent-data-backup-production | backup | production |

- **Note**: All new buckets MUST enable Uniform Bucket-Level Access (UBLA) to comply with the Constitution (HP-02) and TF-LAW (§4.3).
- **Additional Note**: Some buckets created before the Constitution took effect may not have UBLA enabled. These are considered "legacy" and will be handled according to technical debt TD-TF-01.

## 3. Artifacts & Docker Images Management
- **Storage Location**: All Docker images, Cloud Functions, and other artifacts must be stored in the corresponding Artifact Registry for the repository (agent-data-test or agent-data-production).
- **Lifecycle Rule**: Old artifacts (>30 days) MUST be managed by creating a GitHub Issue for approval before manual deletion, as defined in HP-CI-03 of Constitution v1.11e.

## 4. CI/CD Discipline
- **Absolute Green CI**: Every change MUST ensure a fully green CI for Cloud Function, Cloud Run, and Workflow YAML.
- **Prohibitions**: Do not merge if CI is red, even for one step. Absolutely prohibit `continue-on-error: true` in any test/validation steps.
- **Pre-commit Hooks**: Configure .pre-commit-config.yaml with at least: black, ruff, trufflehog, manifest-drift.

## 5. Firestore & Qdrant Management
- **Firestore**: Used for session memory storage and metadata tagging. MUST ensure metadata synchronization with Qdrant vectors.
- **Qdrant**: Single cluster for both environments, with separate collections: test_documents and production_documents. Use Qdrant Cloud Paid Tier in us-east4 (exception until Singapore support).

## 6. Secrets & IAM Baseline
- **GitHub Secrets List**:

| Purpose | GitHub Secret Name | Note |
|---------|--------------------|------|
| GCP Project ID | GCP_PROJECT_ID | Value: github-chatgpt-ggcloud |
| Deployer SA | GCP_SERVICE_ACCOUNT | Value: chatgpt-deployer@... |
| WIF Provider | GCP_WIF_PROVIDER | projects/.../providers/... |
| WIF Pool | GCP_WIF_POOL | e.g. gha-pool |
| SA Fallback Key (base64) | GCP_SA_KEY_JSON | Used if WIF fails |
| OpenAI Key | OPENAI_API_KEY | Runtime secret |
| Lark App Secret | LARK_APP_SECRET | Runtime secret |
| Qdrant Mgmt Key | QDRANT_CLOUD_MGMT_KEY | For Qdrant Cloud management |
| Qdrant Cluster Key | QDRANT_CLUSTER1_KEY | Access key for cluster |
| Qdrant Cluster ID | QDRANT_CLUSTER1_ID | ID of the cluster |

- **Rotation Policy**: Critical secrets (e.g., QDRANT_CLUSTER1_KEY, OPENAI_API_KEY) MUST be rotated periodically: 90 days for production, 120 days for test.
- **Rotation Alert**: A daily monitoring workflow (secrets-audit.yml) MUST be set up to send Slack alerts when a critical secret has <15 days until rotation.

## 7. Access Management (IAM)
- **Permitted Roles for Service Account (chatgpt-deployer@...)**:
  - roles/artifactregistry.writer
  - roles/cloudfunctions.developer
  - roles/run.admin
  - roles/secretmanager.secretAccessor
  - roles/storage.admin
  - roles/iam.serviceAccountUser
  - roles/viewer
  - roles/logging.logWriter
  - roles/serviceusage.serviceUsageAdmin
- **Absolutely Prohibited Roles**:
  - roles/secretmanager.admin
  - roles/iam.serviceAccountAdmin
  - roles/cloudscheduler.admin
  - roles/pubsub.publisher

## 8. Operational & Self-Correction Rules
- **Retry Limit**: If CI fails, automatically fix and push to the same branch up to 2 times. After the 2nd failure, MUST stop and notify.
- **Test Count Control (Manifest Drift)**:
  - Principle: All changes to test file count MUST update test_manifest_baseline.txt.
  - Valid Update Process:
    1. Complete and commit new test files.
    2. Run python scripts/collect_manifest.py > test_manifest_baseline.txt to update baseline.
    3. Commit new tests and updated baseline in the same commit.
    4. Commit message must explain the test count change reason.
- **Wait Time**: MUST have a minimum 5-minute wait between automatic retries.
- **Verification Before Reporting**: Do not report a task as "Success" or "Complete" until verified by checking CI logs (e.g., gh run view) for success status.

## 9. RULES Protection
- You must absolutely not delete any content in this RULES file unless explicitly requested. Cursor must not delete any content unless explicitly permitted by the prompt.
- Only add new sections if the prompt does not mention deletion. All rule updates must be committed together with the related logic. When removing workflows, use `git rm`, not `rm -f`.
