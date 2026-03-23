/**
 * Dedupe Engine — prevents duplicate system_issues
 * Uses violation_hash for exact dedupe, business_logic_hash for logic-level dedupe
 */

const crypto = require('crypto');

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'https://directus.incomexsaigoncorp.vn';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || '';

function computeHashes(contractId, checkId, issueClass) {
	const violationHash = crypto.createHash('sha256')
		.update(`${contractId}|${checkId}|${issueClass}`)
		.digest('hex')
		.slice(0, 16);

	const businessLogicHash = crypto.createHash('sha256')
		.update(`${contractId}|${issueClass}`)
		.digest('hex')
		.slice(0, 16);

	return { violationHash, businessLogicHash };
}

async function findExistingIssue(violationHash) {
	if (!DIRECTUS_TOKEN) return null;
	try {
		const url = `${DIRECTUS_URL}/items/system_issues?filter[violation_hash][_eq]=${violationHash}&filter[status][_eq]=open&limit=1`;
		const resp = await fetch(url, {
			headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
			signal: AbortSignal.timeout(10000),
		});
		if (!resp.ok) return null;
		const data = await resp.json();
		return data?.data?.[0] || null;
	} catch {
		return null;
	}
}

async function createIssue(issueData) {
	if (!DIRECTUS_TOKEN) {
		console.log(`  [DRY-RUN] Would create issue: ${issueData.title}`);
		return { id: 'dry-run', ...issueData };
	}
	try {
		const resp = await fetch(`${DIRECTUS_URL}/items/system_issues`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${DIRECTUS_TOKEN}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(issueData),
			signal: AbortSignal.timeout(10000),
		});
		if (!resp.ok) {
			const text = await resp.text();
			console.error(`  [ERROR] Create issue failed: HTTP ${resp.status} — ${text.slice(0, 200)}`);
			return null;
		}
		const data = await resp.json();
		return data?.data || null;
	} catch (e) {
		console.error(`  [ERROR] Create issue failed: ${e.message}`);
		return null;
	}
}

async function updateIssue(id, patchData) {
	if (!DIRECTUS_TOKEN) {
		console.log(`  [DRY-RUN] Would update issue #${id}`);
		return true;
	}
	try {
		const resp = await fetch(`${DIRECTUS_URL}/items/system_issues/${id}`, {
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${DIRECTUS_TOKEN}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(patchData),
			signal: AbortSignal.timeout(10000),
		});
		return resp.ok;
	} catch {
		return false;
	}
}

async function dedupeAndReport(result, runId) {
	const { contractId, checkId, issueClass, severity, description, evidence } = result;
	const { violationHash, businessLogicHash } = computeHashes(contractId, checkId, issueClass);
	const now = new Date().toISOString();

	const existing = await findExistingIssue(violationHash);

	if (existing) {
		// Reopen / increment
		const newCount = (existing.occurrence_count || 1) + 1;
		await updateIssue(existing.id, {
			occurrence_count: newCount,
			last_seen_at: now,
			evidence_snapshot: evidence,
			run_id: runId,
		});
		return { action: 'reopened', issueId: existing.id, occurrenceCount: newCount };
	}

	// Create new
	const issue = await createIssue({
		title: `[${contractId}] ${description}`,
		status: 'open',
		severity: severity.toLowerCase(),
		source_system: 'dieu31-runner',
		issue_class: issueClass,
		violation_hash: violationHash,
		business_logic_hash: businessLogicHash,
		run_id: runId,
		first_seen_at: now,
		last_seen_at: now,
		occurrence_count: 1,
		verification_contract_id: contractId,
		evidence_snapshot: evidence,
	});

	return { action: 'created', issueId: issue?.id || 'unknown' };
}

module.exports = { computeHashes, findExistingIssue, createIssue, updateIssue, dedupeAndReport };
