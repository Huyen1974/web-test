/**
 * GET /api/registries/system-issues/detail
 * Route alias → proxies to /api/registry/system-issues-detail
 * Orchestrator expects plural "registries" + slash-separated path.
 */
export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const params = new URLSearchParams();
	for (const [k, v] of Object.entries(query)) {
		if (v !== undefined && v !== null) params.set(k, String(v));
	}
	const qs = params.toString();
	return await $fetch(`/api/registry/system-issues-detail${qs ? '?' + qs : ''}`, {
		headers: Object.fromEntries(event.headers?.entries?.() || []),
	});
});
