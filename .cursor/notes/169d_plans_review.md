# 169d Plans Review

## Four Key Planning Documents Reviewed

1. **Plan checkpoint V7** - Technical quality gates with 44 checkpoints (CP) covering toolchain, baseline, and infrastructure requirements
2. **Agent Data Langroid Fw – Plan V12** - Main development framework with priorities and roadmap
3. **QDRANT_plan.md** - Qdrant management and cost optimization strategies
4. **DS tái sử dụng V2** - Reuse strategy for Agent Data Langroid leveraging existing frameworks

## Key Constraints for CLI 169d

- **CI Must Stay Green**: All CP checkpoints must pass; if red, STOP and fix before new changes
- **No Test Count Drift**: Control test manifest baseline; if tests change, update manifest in same commit
- **Qdrant Suspended Policy**: Do NOT reactivate Qdrant; if step requires it, STOP and ask user
- **Evidence-Based Reporting**: Tie all CI logs to HEAD SHA, store machine-verifiable evidence
- **Hard Gate Implementation**: Non-bypassable CI verification bound to RUN_ID and HEAD SHA
- **Self-Heal Max 2 Attempts**: Terraform plan failures should auto-fix common issues (backend/state, missing vars, provider lock) with maximum 2 attempts

## Implementation Notes for 169d

- Central repo: `Huyen1974/chatgpt-githubnew` (secrets hub)
- Test repo: `Huyen1974/agent-data-test`
- Production repo: `Huyen1974/agent-data-production`
- GCP Project: `github-chatgpt-ggcloud` with Secret Manager and WIF configured
- Service Account: `chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com`
- Secret: `gh_pat_sync_secrets` (PAT stored in Secret Manager)
- Critical CP checkpoints that affect this implementation:
  - CP0.1: Lockfile management with pip-compile --no-upgrade
  - CP0.8: Qdrant health check (must remain suspended)
  - CPG1.1-1.2: GitHub workflow validation
  - CPG4.1-4.2: Deploy and canary procedures

## Terraform Plan Self-Healing Strategy

Based on Plan checkpoint V7 requirements:
- **Attempt #1**: Standard init/validate/plan sequence
- **Attempt #2**: Targeted fixes based on error signatures:
  - Backend/state issues → CI-safe planning with `-backend=false`
  - Missing vars → Create minimal `ci.auto.tfvars` from repo context
  - Provider lock errors → Update lockfile and re-init with `-upgrade`
- **Evidence collection**: Save logs to `.ci/p169d/ci_logs/` tied to HEAD SHA and RUN_ID
- **Fail-fast**: After 2 attempts, STOP and report minimal repro (no infinite retry loops)
