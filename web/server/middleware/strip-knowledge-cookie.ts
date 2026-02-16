/**
 * Strip session cookie from public cacheable routes — WEB-70F + P26 + P37B
 *
 * The session.global.ts middleware sets a Directus session cookie on every page.
 * This middleware removes set-cookie and strips 'cookie' from Vary header
 * on public routes so responses are uniform regardless of browser cookies.
 *
 * Auth/private routes (login, admin, portal, profile) keep their cookies.
 *
 * VERIFY: curl -sI localhost:3000/knowledge | grep set-cookie (should be empty)
 * REGISTRY: docs/CUSTOM-CODE-REGISTRY.md
 */

/** Public route prefixes where cookies should be stripped */
const CACHEABLE_PREFIXES = [
	'/knowledge',
	'/posts',
	'/projects',
	'/blueprints',
	'/help',
];

function isCacheablePath(path: string): boolean {
	if (path === '/') return true;
	return CACHEABLE_PREFIXES.some(
		(prefix) => path === prefix || path.startsWith(prefix + '/'),
	);
}

export default defineEventHandler((event) => {
	const path = getRequestURL(event).pathname;

	if (!isCacheablePath(path)) {
		return;
	}

	// Hook into response to strip set-cookie and vary:cookie
	const originalWriteHead = event.node.res.writeHead;
	event.node.res.writeHead = function (
		statusCode: number,
		...args: unknown[]
	) {
		// Remove set-cookie so Directus session cookie is not sent
		event.node.res.removeHeader('set-cookie');

		// Remove 'cookie' from vary header so all users get the same response
		const vary = event.node.res.getHeader('vary');
		if (vary) {
			const parts = (Array.isArray(vary) ? vary.join(', ') : String(vary))
				.split(',')
				.map((v) => v.trim())
				.filter((v) => v.toLowerCase() !== 'cookie');
			if (parts.length > 0) {
				event.node.res.setHeader('vary', parts.join(', '));
			} else {
				event.node.res.removeHeader('vary');
			}
		}

		return originalWriteHead.call(this, statusCode, ...args);
	};
});
