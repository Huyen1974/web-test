/**
 * GET /api/registries/system-issues
 * Route alias → proxies to /api/registry/system-issues
 * Orchestrator expects plural "registries" path.
 */
export default defineEventHandler(async () => {
	return await $fetch('/api/registry/system-issues');
});
