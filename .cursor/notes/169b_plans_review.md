# 169b Plans Review

## Reviewed Plan Documents

1. **Plan checkpoint V7** - Technical Quality Gates with 44 checkpoints (CP) covering toolchain, baseline, and infrastructure requirements
2. **DS tái sử dụng V2** - Reuse strategy for Agent Data Langroid leveraging existing frameworks (Langroid, Qdrant, etc.)
3. **KH quay lại con đường V2** - "Back on track" plan focusing on dependency alignment and CI fixes
4. **KH tối ưu time Test V9** - Not found in current codebase (may be in future development)

## Key Constraints Affecting CLI 169b

- **Single Service Account Strategy**: Use `chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com` for both test and production environments
- **CI Green First**: Maintain CI status green at all times; fail-fast on any checkpoint failures (CP 🚀 = block merge/deploy)
- **Secrets Centralization**: Phase 1 keeps PAT only in central repo for sync-secrets workflow; Phase 2 will move to GCP Secret Manager
- **Test Count Control**: Strict manifest drift = 0 rule; any test changes must update baseline in same commit
- **Qdrant Suspended**: Do not trigger any jobs that would reactivate Qdrant without explicit user permission

## Implementation Notes

- Dependencies pinned: slowapi==0.1.9, redis>=5.0.1,<6.0.0 per V7 CP0.9
- Lockfile management: pip-compile --no-upgrade with git diff --exit-code verification
- WIF condition covers both repos: test (any branch/tags) and production (main/tags only)
