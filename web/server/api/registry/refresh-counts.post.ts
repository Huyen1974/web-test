/**
 * POST /api/registry/refresh-counts
 *
 * Refreshes record_count for all meta_catalog entries by counting
 * actual records in each registry_collection via Directus API.
 *
 * Model A (Directus SSOT): actual_count = record_count (same source — correct)
 * Model B (File-scanned):  actual_count NOT touched (needs filesystem — CLI only)
 *
 * Called by:
 *   - Directus Flow (every 6h schedule)
 *   - Post-deploy hook in deploy-vps.yml
 *   - CLI: dot-registry-count-refresh (does filesystem counts separately)
 *
 * Auth: Requires service token (internal only).
 */

interface CountResult {
	code: string;
	name: string;
	collection: string;
	source_model: string;
	old_count: number;
	new_count: number;
	changed: boolean;
}

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();
	const directusUrl = config.directusInternalUrl || config.public?.directusUrl || 'https://directus.incomexsaigoncorp.vn';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;

	// Optional Model B counts from request body (passed by CI deploy step)
	const body = await readBody(event).catch(() => null);
	const modelBCounts: Record<string, number> = body?.modelBCounts || {};

	if (!token) {
		throw createError({ statusCode: 500, message: 'Service token not configured' });
	}

	const headers = {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
	};

	// 1. Fetch all meta_catalog entries (including source_model)
	const catalogResp: any = await $fetch(`${directusUrl}/items/meta_catalog`, {
		headers,
		params: {
			fields: 'id,code,name,source_model,registry_collection,record_count,actual_count,orphan_count',
			sort: 'code',
			limit: -1,
		},
		timeout: 15000,
	});

	const catalog = catalogResp?.data || [];
	if (!catalog.length) {
		return { status: 'error', message: 'No meta_catalog entries found' };
	}

	const now = new Date().toISOString();
	const results: CountResult[] = [];
	let updated = 0;
	let errors = 0;

	// 2. Count records in each registry_collection
	for (const entry of catalog) {
		const collection = entry.registry_collection;
		if (!collection) continue;

		let newCount = 0;
		try {
			const countResp: any = await $fetch(`${directusUrl}/items/${collection}`, {
				headers,
				params: {
					'aggregate[countDistinct]': 'id',
				},
				timeout: 10000,
			});

			const data = countResp?.data;
			if (Array.isArray(data) && data.length > 0) {
				const cd = data[0]?.countDistinct;
				if (cd && typeof cd === 'object' && cd.id) {
					newCount = parseInt(cd.id, 10) || 0;
				}
			}
		} catch {
			errors++;
			continue;
		}

		const oldCount = entry.record_count || 0;
		const sourceModel = entry.source_model || 'A';
		const changed = newCount !== oldCount;

		results.push({
			code: entry.code,
			name: entry.name,
			collection,
			source_model: sourceModel,
			old_count: oldCount,
			new_count: newCount,
			changed,
		});

		// 3. Build patch based on source_model
		const patch: Record<string, any> = {
			record_count: newCount,
			last_scan_date: now,
		};

		if (sourceModel === 'A') {
			// Model A: Directus IS the source → actual = record, orphan = 0
			patch.actual_count = newCount;
			patch.orphan_count = 0;
		} else if (modelBCounts[entry.code] !== undefined) {
			// Model B: CI passed filesystem counts → update actual_count
			patch.actual_count = modelBCounts[entry.code];
		}
		// Model B without CI counts: DO NOT touch actual_count (CLI only)

		try {
			await $fetch(`${directusUrl}/items/meta_catalog/${entry.id}`, {
				method: 'PATCH',
				headers,
				body: patch,
				timeout: 10000,
			});
			updated++;
		} catch {
			errors++;
		}
	}

	return {
		status: 'ok',
		timestamp: now,
		total: catalog.length,
		updated,
		errors,
		changes: results.filter((r) => r.changed),
		all: results,
	};
});
