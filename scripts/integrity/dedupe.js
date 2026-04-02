/**
 * Dedupe Engine — prevents duplicate system_issues
 * Uses violation_hash for exact dedupe, business_logic_hash for logic-level dedupe
 */

const crypto = require('crypto');

const DIRECTUS_URL = process.env.DIRECTUS_URL;
if (!DIRECTUS_URL) throw new Error('Missing required env: DIRECTUS_URL');
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

function classifySubClass(issueClass, description, contractId) {
	const desc = (description || '').toLowerCase();
	switch (issueClass) {
		case 'render_fault':
			if (desc.includes('target')) return 'orphan_dep_target';
			if (desc.includes('source')) return 'orphan_dep_source';
			if (desc.includes('layer') || desc.includes('config')) return 'missing_registry_config';
			return 'stale_check';
		case 'data_fault':
			if (desc.includes('identifier') || desc.includes('mã')) return 'missing_identifier';
			if (desc.includes('dependency') || desc.includes('quan hệ')) return 'no_dependencies';
			return 'catalog_incomplete';
		case 'sync_fault':
			if (desc.includes('vector') || desc.includes('agent data')) return 'missing_vector';
			return 'count_drift';
		case 'contract_fault':
			if (desc.includes('cascade')) return 'cascade_failure';
			return 'stale_contract';
		case 'infra_fault':
			if (desc.includes('auth')) return 'auth_failure';
			return 'production_down';
		case 'watchdog_fault':
			return 'runner_liveness';
		default:
			return 'unclassified';
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

	// Classify sub_class per Điều 31 §IV.6-B
	const subClass = classifySubClass(issueClass, description, contractId);

	// Create new
	const issue = await createIssue({
		title: `[${contractId}] ${description}`,
		status: 'open',
		severity: severity.toUpperCase(),
		source_system: 'dieu31-runner',
		issue_class: issueClass,
		sub_class: subClass,
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

/**
 * Auto-resolve stale issues: after a full scan, any open dieu31-runner issue
 * whose violation_hash was NOT seen in this run → problem is fixed → resolve.
 * Excludes watchdog_fault (runner_liveness) which must always stay open.
 *
 * @param {Set<string>} seenHashes - violation_hashes from current run's failures
 * @param {string} runId - current run ID
 */
async function autoResolveStale(seenHashes, runId) {
	if (!DIRECTUS_TOKEN) {
		console.log('  [DRY-RUN] Would auto-resolve stale issues');
		return { resolved: 0 };
	}

	const now = new Date().toISOString();
	let resolved = 0;
	let page = 1;

	while (true) {
		try {
			const url = `${DIRECTUS_URL}/items/system_issues?` +
				`filter[source_system][_eq]=dieu31-runner` +
				`&filter[status][_in]=open,archived` +
				`&filter[issue_class][_neq]=watchdog_fault` +
				`&fields=id,violation_hash,title` +
				`&limit=100&page=${page}`;
			const resp = await fetch(url, {
				headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
				signal: AbortSignal.timeout(15000),
			});
			if (!resp.ok) break;
			const data = await resp.json();
			const items = data?.data || [];
			if (items.length === 0) break;

			for (const item of items) {
				if (!item.violation_hash) continue;
				if (seenHashes.has(item.violation_hash)) continue;
				// This issue's violation was NOT seen in current run → problem fixed
				const ok = await updateIssue(item.id, {
					status: 'resolved',
					resolved_at: now,
					resolution: `Auto-resolved: check passed in run ${runId}`,
				});
				if (ok) resolved++;
			}
			page++;
		} catch {
			break;
		}
	}

	return { resolved };
}

module.exports = { computeHashes, findExistingIssue, createIssue, updateIssue, dedupeAndReport, autoResolveStale };
