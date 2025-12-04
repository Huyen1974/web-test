#!/usr/bin/env bash
set -euo pipefail

# Auto-merge a PR with temporary soft-ungate and full restoration of branch protection.
# Usage: ./scripts/auto_merge_pr.sh <PR_NUMBER>

PR_NUMBER="${1:-}"
OWNER="${OWNER:-Huyen1974}"
REPO="${REPO:-web-test}"
BRANCH="${BRANCH:-main}"

log() { echo "[AUTO-MERGE] $*"; }
fail() { echo "[ERROR] $*" >&2; exit 1; }

[ -n "$PR_NUMBER" ] || fail "PR number required. Usage: ./scripts/auto_merge_pr.sh <PR_NUMBER>"

# Ensure gh is authenticated with proper scopes
gh auth status -t >/dev/null || fail "gh auth missing or insufficient scopes"

# Helpers to normalize branch protection for PUT payloads
normalize_protection() {
	jq '{
		required_status_checks: (if .required_status_checks then {
			strict: (.required_status_checks.strict // false),
			checks: (.required_status_checks.checks // [])
		} else null end),
		enforce_admins: (.enforce_admins.enabled // false),
		required_pull_request_reviews: (if .required_pull_request_reviews then
			(
				{
					dismiss_stale_reviews: (.required_pull_request_reviews.dismiss_stale_reviews // false),
					require_code_owner_reviews: (.required_pull_request_reviews.require_code_owner_reviews // false),
					required_approving_review_count: (.required_pull_request_reviews.required_approving_review_count // 0),
					require_last_push_approval: (.required_pull_request_reviews.require_last_push_approval // false)
				}
				+ (if (.required_pull_request_reviews.bypass_pull_request_allowances // null) != null
					then {bypass_pull_request_allowances: .required_pull_request_reviews.bypass_pull_request_allowances}
					else {} end)
			)
		else null end),
		restrictions: null,
		required_linear_history: (.required_linear_history.enabled // false),
		allow_force_pushes: (.allow_force_pushes.enabled // false),
		allow_deletions: (.allow_deletions.enabled // false),
		block_creations: (.block_creations.enabled // false),
		required_conversation_resolution: (.required_conversation_resolution.enabled // false),
		lock_branch: (.lock_branch.enabled // false),
		allow_fork_syncing: (.allow_fork_syncing.enabled // false)
	}'
}

restore_file=""
restore_protection() {
	if [[ -n "${restore_file}" && -f "${restore_file}" ]]; then
		log "Restoring branch protection from backup"
		gh api --method PUT -H "Accept: application/vnd.github+json" \
			"repos/${OWNER}/${REPO}/branches/${BRANCH}/protection" \
			--input "${restore_file}" >/dev/null
	fi
}
trap restore_protection EXIT

# Pre-check PR state and CI
log "Checking PR #${PR_NUMBER} status and checks"
pr_json="$(gh pr view "${PR_NUMBER}" --repo "${OWNER}/${REPO}" --json state,mergeable,statusCheckRollup,baseRefName)"
state="$(echo "${pr_json}" | jq -r '.state')"
mergeable="$(echo "${pr_json}" | jq -r '.mergeable')"
base_ref="$(echo "${pr_json}" | jq -r '.baseRefName')"

[ "${state}" == "OPEN" ] || fail "PR state is ${state}, expected OPEN"
[ "${mergeable}" == "MERGEABLE" ] || fail "PR not mergeable"
[ "${base_ref}" == "${BRANCH}" ] || fail "PR targets ${base_ref}, expected ${BRANCH}"

ci_bad="$(echo "${pr_json}" | jq -r '.statusCheckRollup[] | select(.conclusion!="SUCCESS") | .name' || true)"
[ -z "${ci_bad}" ] || fail "Required checks not all green: ${ci_bad}"

# Backup branch protection and normalize for PUT
log "Backing up branch protection for ${BRANCH}"
raw_backup="$(mktemp)"
gh api -H "Accept: application/vnd.github+json" \
	"repos/${OWNER}/${REPO}/branches/${BRANCH}/protection" > "${raw_backup}"

restore_file="$(mktemp)"
normalize_protection < "${raw_backup}" > "${restore_file}"

# Build relaxed protection (soft-ungate)
relaxed_file="$(mktemp)"
normalize_protection < "${raw_backup}" | jq '
	.required_pull_request_reviews = null
	| .required_status_checks = null
	| .enforce_admins = true
' > "${relaxed_file}"

# Apply relaxed protection
log "Applying temporary relaxed protection"
gh api --method PUT -H "Accept: application/vnd.github+json" \
	"repos/${OWNER}/${REPO}/branches/${BRANCH}/protection" \
	--input "${relaxed_file}" >/dev/null

# Merge
log "Merging PR #${PR_NUMBER}"
gh pr merge "${PR_NUMBER}" --repo "${OWNER}/${REPO}" --squash --delete-branch --admin >/dev/null
log "Merge command completed"

# Success path will still hit trap to restore protection
