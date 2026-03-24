#!/usr/bin/env node
/**
 * Điều 31 Integrity Runner v2.0 — PG-Driven
 *
 * Default: reads method=2 measurements from measurement_registry (PG).
 * --legacy: runs original JSON contract flow (preserved 100%).
 *
 * Usage:
 *   node main.js [--run-id=xxx]                    # PG-driven (default)
 *   node main.js --legacy [--tier=all] [--run-id=x] # Legacy JSON contracts
 */

// ─── PG-driven imports ───
const { connect: pgConnect, getMethod2Measurements, logMeasurementResult, disconnect: pgDisconnect } = require('./pg-client');
const { runPgVsNuxtCheck } = require('./runners/pg-vs-nuxt-check');

// ─── Shared imports ───
const { checkHealth } = require('./health-gate');
const { dedupeAndReport } = require('./dedupe');

// ─── Legacy imports (kept for --legacy flow) ───
const { loadContracts } = require('./contract-reader');
const { runExistsCheck } = require('./runners/exists-check');
const { runSyncCheck } = require('./runners/sync-check');
const { runAlwaysFail } = require('./runners/always-fail');

// ─── Parse CLI args ───
const args = {};
for (const arg of process.argv.slice(2)) {
	const match = arg.match(/^--(\w[\w-]*)(?:=(.+))?$/);
	if (match) args[match[1]] = match[2] || 'true';
}

const runId = args['run-id'] || `run-${Date.now()}`;
const legacyMode = args.legacy === 'true';
const tier = args.tier || 'all';
const contractFilter = args.contract || null;

// ═══════════════════════════════════════════════════════════════
// PG-DRIVEN FLOW (default) — Methodology v2.0 Bài toán B
// ═══════════════════════════════════════════════════════════════

async function runPgDriven() {
	console.log('');
	console.log('╔══════════════════════════════════════╗');
	console.log('║   ĐIỀU 31 — INTEGRITY RUNNER v2.0    ║');
	console.log('║        PG-DRIVEN (method=2)          ║');
	console.log('╚══════════════════════════════════════╝');
	console.log(`  Run ID:  ${runId}`);
	console.log(`  Mode:    PG-driven (measurement_registry)`);
	console.log(`  Token:   ${process.env.DIRECTUS_TOKEN ? 'set' : 'NOT SET (dry-run)'}`);
	console.log(`  DB:      ${process.env.DATABASE_URL ? 'set' : 'NOT SET'}`);
	console.log('');

	// 1. Health Gate
	console.log('1. HEALTH GATE');
	const health = await checkHealth();
	if (!health.ok) {
		console.log(`  ✗ FAIL: ${health.error}`);
		await dedupeAndReport({
			contractId: 'INFRA', checkId: 'INFRA-HEALTH', issueClass: 'infra_fault',
			severity: 'CRITICAL', description: `Health gate failed: ${health.error}`,
			evidence: { error: health.error, timestamp: new Date().toISOString() },
		}, runId);
		process.exit(1);
	}
	console.log('  ✓ PASS: All endpoints healthy');
	console.log('');

	// 2. Connect to PG
	console.log('2. PG CONNECTION');
	const pgOk = await pgConnect();
	if (!pgOk) {
		console.log('  ✗ PG connection failed, falling back to legacy.');
		console.log('');
		return runLegacy();
	}
	console.log('  ✓ Connected to PG');
	console.log('');

	try {
		// 3. Load method=2 measurements
		console.log('3. LOADING MEASUREMENTS FROM PG');
		const measurements = await getMethod2Measurements();
		if (measurements.length === 0) {
			console.log('  ⚠ No method=2 measurements found. Falling back to legacy.');
			console.log('');
			await pgDisconnect();
			return runLegacy();
		}
		console.log(`  Loaded ${measurements.length} method-2 measurements from measurement_registry`);
		for (const m of measurements) {
			console.log(`    ${m.measurement_id} [${m.law_code}] ${m.measurement_name}`);
		}
		console.log('');

		// 4. Run each measurement
		console.log('4. RUNNING PG vs NUXT CHECKS');
		let totalPass = 0;
		let totalFail = 0;
		let totalError = 0;
		let issuesCreated = 0;
		let issuesReopened = 0;
		let watchdogUpdated = false;

		for (const m of measurements) {
			const isWatchdog = m.comparison === 'always_fail';
			const result = await runPgVsNuxtCheck(m);

			const icon = result.result === 'pass' ? '✓' : (isWatchdog ? '⚡' : (result.result === 'error' ? '!' : '✗'));
			const label = result.result === 'pass' ? 'PASS' : (isWatchdog ? 'WATCHDOG' : result.result.toUpperCase());

			console.log(`  ${icon} ${m.measurement_id}: ${label} — ${m.measurement_name}`);
			console.log(`    PG (source):   ${result.source_value}`);
			console.log(`    Nuxt (target): ${result.target_value}`);
			if (result.delta !== '0') console.log(`    Delta: ${result.delta}`);

			// Log to measurement_log via PG (trigger auto-updates measurement_registry.last_*)
			await logMeasurementResult(runId, m.measurement_id, result.result, result.source_value, result.target_value, result.delta);

			if (isWatchdog) {
				await dedupeAndReport({
					contractId: 'CTR-WATCHDOG', checkId: m.measurement_id,
					issueClass: 'watchdog_fault', severity: (m.severity || 'critical').toUpperCase(),
					description: m.measurement_name,
					evidence: { source_value: result.source_value, target_value: result.target_value, delta: result.delta, runId, timestamp: new Date().toISOString() },
				}, runId);
				watchdogUpdated = true;
			} else if (result.result === 'pass') {
				totalPass++;
			} else if (result.result === 'error') {
				totalError++;
			} else {
				totalFail++;
				const dedupeResult = await dedupeAndReport({
					contractId: m.law_code, checkId: m.measurement_id,
					issueClass: 'sync_fault', severity: (m.severity || 'warning').toUpperCase(),
					description: `${m.measurement_name}: PG=${result.source_value} ≠ Nuxt=${result.target_value}`,
					evidence: { source_value: result.source_value, target_value: result.target_value, delta: result.delta, runId, measurement_id: m.measurement_id, timestamp: new Date().toISOString() },
				}, runId);
				if (dedupeResult.action === 'created') issuesCreated++;
				if (dedupeResult.action === 'reopened') issuesReopened++;
			}
			console.log('');
		}

		// 5. Summary
		const total = totalPass + totalFail;
		const passRate = total > 0 ? ((totalPass / total) * 100).toFixed(1) : '100.0';

		console.log('═══════════════════════════════════════');
		console.log(`  PASS: ${totalPass} | FAIL: ${totalFail} | ERROR: ${totalError}`);
		console.log(`  WATCHDOG: ${watchdogUpdated ? 'alive' : 'not found'}`);
		console.log(`  Pass Rate: ${passRate}% (${totalPass}/${total})`);
		console.log(`  Issues Created: ${issuesCreated} | Reopened: ${issuesReopened}`);
		console.log(`  Results logged to measurement_log (run_id: ${runId})`);
		console.log('═══════════════════════════════════════');

		process.exit(totalFail > 0 ? 1 : 0);
	} finally {
		await pgDisconnect();
	}
}

// ═══════════════════════════════════════════════════════════════
// LEGACY FLOW (--legacy flag) — 100% original code from v1.0
// CUT-PASTE from original main(). NO simplification. NO feature removal.
// ═══════════════════════════════════════════════════════════════

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

async function runLegacy() {
	console.log('');
	console.log('╔══════════════════════════════════════╗');
	console.log('║   ĐIỀU 31 — INTEGRITY RUNNER v1.0    ║');
	console.log('║          LEGACY CONTRACT MODE         ║');
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
			} else if (r.check.severity === 'INFO') {
				// INFO: log only, do NOT create issue (Điều 31 §IV.5)
				console.log(`      ℹ INFO — artifact only, no issue created`);
				totalPass++; // INFO fails don't count against pass rate
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

// ═══════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════

if (legacyMode) {
	runLegacy().catch(e => { console.error('Runner crashed:', e.message); process.exit(2); });
} else {
	runPgDriven().catch(e => { console.error('Runner crashed:', e.message); process.exit(2); });
}
