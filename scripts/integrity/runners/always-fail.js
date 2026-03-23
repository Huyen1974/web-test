/**
 * Always Fail Runner — WATCHDOG liveness check
 * If this check doesn't appear as FAIL, the runner is dead
 */

async function runAlwaysFail(contract, check) {
	return {
		status: 'fail',
		values: {
			expected: 'always_fail — WATCHDOG liveness',
			actual: 'FAIL (expected — runner is alive)',
		},
	};
}

module.exports = { runAlwaysFail };
