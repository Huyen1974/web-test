/**
 * Strip session cookie from /knowledge routes — WEB-70F
 *
 * Firebase Hosting (Fastly CDN) never caches responses with set-cookie headers.
 * The Directus auth module sets a session cookie on every SSR-rendered page,
 * causing ALL /knowledge HTML requests to be CDN MISS.
 *
 * This middleware removes set-cookie from /knowledge responses only,
 * allowing Firebase CDN to cache them with s-maxage=31536000 (1 year).
 *
 * Other routes (login, admin, portal) keep their cookies untouched.
 *
 * VERIFY: curl -sI localhost:3000/knowledge | grep set-cookie (should be empty)
 * REGISTRY: docs/CUSTOM-CODE-REGISTRY.md
 */
export default defineEventHandler((event) => {
	const path = getRequestURL(event).pathname;

	if (!path.startsWith('/knowledge')) {
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
