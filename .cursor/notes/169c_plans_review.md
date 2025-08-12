# 169c Plans Review

## Four Key Planning Documents Reviewed

1. **Agent Data Langroid Fw – Plan V12** - Main development framework with priorities and roadmap
2. **Plan checkpoint V7** - Technical quality gates and CI verification checkpoints
3. **QDRANT_plan.md** - Qdrant management and cost optimization strategies
4. **VẬN HÀNH QDRANT.md** - Operational procedures for Qdrant cluster lifecycle

## Key Constraints for CLI 169c

- **CI Must Stay Green**: All CP checkpoints must pass; if red, STOP and fix before new changes
- **No Test Count Drift**: Control test manifest baseline; if tests change, update manifest in same commit
- **Qdrant Suspended Policy**: Do NOT reactivate Qdrant; if step requires it, STOP and ask user
- **Evidence-Based Reporting**: Tie all CI logs to HEAD SHA, store machine-verifiable evidence
- **WIF/GSM Integration**: Move from GitHub secrets to Google Secret Manager via Workload Identity Federation

## Implementation Notes

- Central repo: `Huyen1974/chatgpt-githubnew` (secrets hub)
- Test repo: `Huyen1974/agent-data-test`
- Production repo: `Huyen1974/agent-data-production`
- GCP Project: `github-chatgpt-ggcloud` with Secret Manager and WIF configured
- Service Account: `chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com`
- Secret: `gh_pat_sync_secrets` (PAT stored in Secret Manager)
