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

	// Hook into response to strip set-cookie after all handlers run
	const originalWriteHead = event.node.res.writeHead;
	event.node.res.writeHead = function (
		statusCode: number,
		...args: unknown[]
	) {
		event.node.res.removeHeader('set-cookie');
		return originalWriteHead.call(this, statusCode, ...args);
	};
});
