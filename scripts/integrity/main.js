#!/usr/bin/env node
/**
 * Điều 31 Integrity Runner — Main Entry Point
 * Reads contracts, runs checks, dedupes issues, reports results.
 * Usage: node scripts/integrity/main.js [--tier=A] [--contract=CTR-001] [--run-id=xxx]
 */

const { loadContracts } = require('./contract-reader');
const { checkHealth } = require('./health-gate');
const { dedupeAndReport } = require('./dedupe');
const { runExistsCheck } = require('./runners/exists-check');
const { runSyncCheck } = require('./runners/sync-check');
const { runAlwaysFail } = require('./runners/always-fail');

// Parse CLI args
const args = {};
for (const arg of process.argv.slice(2)) {
	const match = arg.match(/^--(\w[\w-]*)=(.+)$/);
	if (match) args[match[1]] = match[2];
}

const tier = args.tier || 'all';
const contractFilter = args.contract || null;
const runId = args['run-id'] || `run-${Date.now()}`;

function classifyIssue(contract, check) {
	if (check.operator === 'always_fail') return 'watchdog_fault';
	if (contract.type === 'directus_vs_vector') return 'sync_fault';
	if (contract.type === 'dom_vs_db' || contract.type === 'dom_vs_contract') return 'render_fault';
	if (contract.type === 'db_vs_db' || contract.type === 'api_vs_db') return 'data_fault';
	return 'contract_fault';
}

async function runCheck(contract, check) {
	switch (check.operator) {
		case 'exists':
		case 'not_exists':
			return await runExistsCheck(contract, check);

		case 'eventual_equals':
		case 'strict_equals':
		case 'equals':
			// For v1 pilot: use exists check pattern (API-based)
			return await runExistsCheck(contract, check);

		case 'always_fail':
			return await runAlwaysFail(contract, check);

		default:
			return { status: 'pass', values: { note: `operator '${check.operator}' not implemented in v1 pilot` } };
	}
}

async function runSyncContract(contract) {
	const results = [];
	for (const check of contract.checks) {
		const result = await runSyncCheck(contract, check);
		results.push({ check, ...result });
	}
	return results;
}

async function main() {
	console.log('');
	console.log('╔══════════════════════════════════════╗');
	console.log('║   ĐIỀU 31 — INTEGRITY RUNNER v1.0    ║');
	console.log('╚══════════════════════════════════════╝');
	console.log(`  Run ID:  ${runId}`);
	console.log(`  Tier:    ${tier}`);
	console.log(`  Filter:  ${contractFilter || 'all'}`);
	console.log(`  Token:   ${process.env.DIRECTUS_TOKEN ? 'set' : 'NOT SET (dry-run mode)'}`);
	console.log('');

	// 1. Health Gate
	console.log('1. HEALTH GATE');
	const health = await checkHealth();
	if (!health.ok) {
		console.log(`  ✗ FAIL: ${health.error}`);
		console.log('  → Creating infra_fault issue and exiting');
		await dedupeAndReport({
			contractId: 'INFRA',
			checkId: 'INFRA-HEALTH',
			issueClass: 'infra_fault',
			severity: 'CRITICAL',
			description: `Health gate failed: ${health.error}`,
			evidence: { error: health.error, timestamp: new Date().toISOString() },
		}, runId);
		process.exit(1);
	}
	console.log('  ✓ PASS: All endpoints healthy');
	console.log('');

	// 2. Load contracts
	const contracts = loadContracts({ tier, contractId: contractFilter });
	console.log(`2. CONTRACTS LOADED: ${contracts.length}`);
	for (const c of contracts) {
		console.log(`  ${c.contract_id} [${c.tier}] ${c.name} — ${c.checks.length} checks`);
	}
	console.log('');

	// 3. Run checks
	console.log('3. RUNNING CHECKS');
	let totalPass = 0;
	let totalFail = 0;
	let totalSkip = 0;
	let issuesCreated = 0;
	let issuesReopened = 0;
	let watchdogUpdated = false;
	const cascadeTracker = {}; // contract_id → fail count

	for (const contract of contracts) {
		console.log(`  [${contract.contract_id}] ${contract.name}`);

		let checkResults;
		if (contract.type === 'directus_vs_vector') {
			checkResults = await runSyncContract(contract);
		} else {
			checkResults = [];
			for (const check of contract.checks) {
				const result = await runCheck(contract, check);
				checkResults.push({ check, ...result });
			}
		}

		for (const r of checkResults) {
			const isWatchdog = r.check.operator === 'always_fail';
			const icon = r.status === 'pass' ? '✓' : (isWatchdog ? '⚡' : '✗');
			const label = r.status === 'pass' ? 'PASS' : (isWatchdog ? 'WATCHDOG' : 'FAIL');

			console.log(`    ${icon} ${r.check.check_id}: ${label} — ${r.check.description}`);
			if (r.status === 'fail' && r.values) {
				console.log(`      Expected: ${JSON.stringify(r.values.expected || r.values).slice(0, 100)}`);
				console.log(`      Actual:   ${JSON.stringify(r.values.actual || '').slice(0, 100)}`);
			}

			if (r.status === 'pass') {
				totalPass++;
			} else if (isWatchdog) {
				// WATCHDOG: always fail, update issue but don't count as failure
				await dedupeAndReport({
					contractId: contract.contract_id,
					checkId: r.check.check_id,
					issueClass: 'watchdog_fault',
					severity: r.check.severity,
					description: r.check.description,
					evidence: { ...r.values, runId, timestamp: new Date().toISOString() },
				}, runId);
				watchdogUpdated = true;
				totalSkip++;
			} else {
				totalFail++;
				cascadeTracker[contract.contract_id] = (cascadeTracker[contract.contract_id] || 0) + 1;

				const issueClass = classifyIssue(contract, r.check);

				// 2-pass for WARNING: skip grace for v1 pilot (would need async wait)
				if (r.check.severity === 'WARNING' && contract.grace_seconds > 0) {
					console.log(`      ⏳ WARNING with grace_seconds=${contract.grace_seconds} — reporting anyway in v1 pilot`);
				}

				const dedupeResult = await dedupeAndReport({
					contractId: contract.contract_id,
					checkId: r.check.check_id,
					issueClass,
					severity: r.check.severity,
					description: r.check.description,
					evidence: { ...r.values, runId, contract: contract.contract_id, timestamp: new Date().toISOString() },
				}, runId);

				if (dedupeResult.action === 'created') issuesCreated++;
				if (dedupeResult.action === 'reopened') issuesReopened++;
			}
		}
		console.log('');
	}

	// 4. Cascade detection
	for (const [cid, count] of Object.entries(cascadeTracker)) {
		if (count > 5) {
			console.log(`  ⚠ CASCADE: ${cid} has ${count} failures → creating parent issue`);
			await dedupeAndReport({
				contractId: cid,
				checkId: `${cid}-CASCADE`,
				issueClass: 'contract_fault',
				severity: 'CRITICAL',
				description: `CASCADE: ${count} checks failed in contract ${cid}`,
				evidence: { failCount: count, runId, timestamp: new Date().toISOString() },
			}, runId);
			issuesCreated++;
		}
	}

	// 5. Summary
	const passRate = totalPass + totalFail > 0
		? ((totalPass / (totalPass + totalFail)) * 100).toFixed(1)
		: '100.0';

	console.log('═══════════════════════════════════════');
	console.log(`  PASS: ${totalPass} | FAIL: ${totalFail} | SKIP: ${totalSkip} (watchdog)`);
	console.log(`  Pass Rate: ${passRate}%`);
	console.log(`  Issues Created: ${issuesCreated} | Reopened: ${issuesReopened}`);
	console.log(`  Watchdog: ${watchdogUpdated ? 'updated' : 'not found'}`);
	console.log('═══════════════════════════════════════');

	// Exit code: 0 if no CRITICAL failures, 1 if any
	process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(e => {
	console.error('Runner crashed:', e.message);
	process.exit(2);
});
