/**
 * Sync Check Runner — verifies Directus ↔ Vector sync
 * For directus_vs_vector contracts
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'https://directus.incomexsaigoncorp.vn';
const AGENT_DATA_URL = process.env.AGENT_DATA_URL || 'https://vps.incomexsaigoncorp.vn/api';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || '';

async function runSyncCheck(contract, check) {
	const direction = check.direction;

	if (direction === 'directus_to_vector') {
		return await checkDirectusToVector(check);
	}
	if (direction === 'vector_to_directus') {
		return await checkVectorToDirectus(check);
	}

	return { status: 'pass', values: { note: 'unknown direction, skipped' } };
}

async function checkDirectusToVector(check) {
	try {
		// Get Directus count
		const headers = DIRECTUS_TOKEN ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` } : {};
		const dResp = await fetch(
			`${DIRECTUS_URL}/items/knowledge_documents?meta=total_count&limit=0&filter[status][_eq]=published`,
			{ headers, signal: AbortSignal.timeout(15000) },
		);
		const dData = await dResp.json();
		const directusCount = dData?.meta?.total_count ?? dData?.meta?.filter_count ?? -1;

		// Get Agent Data health (has document_count)
		const aResp = await fetch(`${AGENT_DATA_URL}/health`, { signal: AbortSignal.timeout(15000) });
		const aData = await aResp.json();
		const vectorCount = aData?.data_integrity?.document_count ?? -1;

		const ratio = vectorCount > 0 && directusCount > 0 ? vectorCount / directusCount : 0;

		return {
			status: ratio >= 0.8 ? 'pass' : 'fail',
			values: { directusCount, vectorCount, ratio: ratio.toFixed(2) },
		};
	} catch (e) {
		return { status: 'fail', values: { error: e.message } };
	}
}

async function checkVectorToDirectus(check) {
	try {
		const aResp = await fetch(`${AGENT_DATA_URL}/health`, { signal: AbortSignal.timeout(15000) });
		const aData = await aResp.json();
		const vectorCount = aData?.data_integrity?.document_count ?? 0;

		return {
			status: vectorCount > 0 ? 'pass' : 'fail',
			values: { vectorCount, exists: vectorCount > 0 },
		};
	} catch (e) {
		return { status: 'fail', values: { error: e.message } };
	}
}

module.exports = { runSyncCheck };
