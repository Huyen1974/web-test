/**
 * POST /api/registry/refresh-counts
 *
 * Refreshes record_count for all meta_catalog entries by counting
 * actual records in each registry_collection via Directus API.
 * Updates meta_catalog with fresh counts and last_scan_date.
 *
 * Called by:
 *   - Directus Flow (every 6h schedule)
 *   - Post-deploy hook in deploy-vps.yml
 *   - CLI: dot-registry-count-refresh
 *
 * Auth: Requires service token (internal only).
 */

interface CountResult {
	code: string;
	name: string;
	collection: string;
	old_count: number;
	new_count: number;
	changed: boolean;
}

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();
	const directusUrl = config.directusInternalUrl || config.public?.directusUrl || 'https://directus.incomexsaigoncorp.vn';
	const token = config.directusServiceToken || process.env.NUXT_DIRECTUS_SERVICE_TOKEN;

	if (!token) {
		throw createError({ statusCode: 500, message: 'Service token not configured' });
	}

	const headers = {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
	};

	// 1. Fetch all meta_catalog entries
	const catalogResp: any = await $fetch(`${directusUrl}/items/meta_catalog`, {
		headers,
		params: {
			fields: 'id,code,name,registry_collection,record_count,actual_count,orphan_count',
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
			// Collection might not be accessible — keep old count
			errors++;
			continue;
		}

		const oldCount = entry.record_count || 0;
		const changed = newCount !== oldCount;

		results.push({
			code: entry.code,
			name: entry.name,
			collection,
			old_count: oldCount,
			new_count: newCount,
			changed,
		});

		// 3. Update meta_catalog with fresh counts
		// For self-contained collections, actual_count = record_count
		// (DOT tools / pages actual counts need filesystem — handled by dot-orphan-scan)
		const patch: Record<string, any> = {
			record_count: newCount,
			actual_count: newCount,
			orphan_count: 0,
			last_scan_date: now,
		};

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
