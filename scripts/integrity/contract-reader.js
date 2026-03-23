/**
 * Contract Reader — loads and filters Điều 31 contracts
 * Usage: const contracts = loadContracts({ tier: 'A', contractId: 'CTR-001' })
 */

const fs = require('fs');
const path = require('path');

const CONTRACTS_DIR = path.join(__dirname, '..', '..', 'web', 'tests', 'contracts');
const SKIP_FILES = ['schema.json', 'README.md'];

function loadContracts(options = {}) {
	const { tier, contractId } = options;
	const files = fs.readdirSync(CONTRACTS_DIR)
		.filter(f => f.endsWith('.json') && !SKIP_FILES.includes(f));

	const contracts = [];
	for (const file of files) {
		const data = JSON.parse(fs.readFileSync(path.join(CONTRACTS_DIR, file), 'utf8'));
		if (!data.contract_id) continue; // skip legacy Điều 30
		if (!data.enabled) continue;
		if (tier && tier !== 'all' && data.tier !== tier) continue;
		if (contractId && data.contract_id !== contractId) continue;
		contracts.push({ ...data, _file: file });
	}
	return contracts;
}

module.exports = { loadContracts };
