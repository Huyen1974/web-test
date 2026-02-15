/**
 * Strip session cookie from public cacheable routes — WEB-70F + P26
 *
 * Firebase Hosting (Fastly CDN) never caches responses with set-cookie headers.
 * The session.global.ts middleware sets a session cookie on every page,
 * causing ALL public HTML requests to be CDN MISS.
 *
 * This middleware removes set-cookie from public cacheable responses,
 * allowing Firebase CDN to cache them with s-maxage (stale-while-revalidate).
 *
 * Auth/private routes (login, admin, portal, profile) keep their cookies.
 *
 * VERIFY: curl -sI localhost:3000/posts | grep set-cookie (should be empty)
 * REGISTRY: docs/CUSTOM-CODE-REGISTRY.md
 */

/** Public route prefixes where cookies should be stripped for CDN caching */
const CACHEABLE_PREFIXES = [
	'/knowledge',
	'/posts',
	'/projects',
	'/blueprints',
	'/help',
];

function isCacheablePath(path: string): boolean {
	// Homepage
	if (path === '/') return true;
	// Public route prefixes
	return CACHEABLE_PREFIXES.some(
		(prefix) => path === prefix || path.startsWith(prefix + '/'),
	);
}

export default defineEventHandler((event) => {
	const path = getRequestURL(event).pathname;

	if (!isCacheablePath(path)) {
		return;
	}

	// Hook into response to strip set-cookie, vary:cookie, and override s-maxage for CDN
	const originalWriteHead = event.node.res.writeHead;
	event.node.res.writeHead = function (
		statusCode: number,
		...args: unknown[]
	) {
		// Remove set-cookie so CDN can cache the response
		event.node.res.removeHeader('set-cookie');

		// Override cache-control: Nitro ISR uses short swr (60s) for freshness,
		// but CDN should cache permanently (purged by Directus flow on content change)
		event.node.res.setHeader(
			'cache-control',
			's-maxage=31536000, stale-while-revalidate',
		);

		// Remove 'cookie' from vary header so CDN serves one cache entry
		// regardless of what cookies the browser sends (P28)
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
