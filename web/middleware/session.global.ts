import { generateId } from '~~/utils/strings';

export interface Session {
	id: string;
	date_created: string;
}

/**
 * Public route prefixes where session cookie must NOT be created.
 * useCookie() during SSR adds `vary: cookie` to the response,
 * which forces CDN (Fastly) to create per-user cache entries → always MISS.
 */
const PUBLIC_PREFIXES = ['/knowledge', '/posts', '/projects', '/blueprints', '/help'];

function isPublicRoute(path: string): boolean {
	if (path === '/') return true;
	return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
}

export default defineNuxtRouteMiddleware((to) => {
	// Skip session on public cacheable routes — P28 CDN fix
	if (isPublicRoute(to.path)) return;

	// Create a unique session ID for each visitor to track feedback through Help Articles
	const session = useCookie('session');

	if (!session.value) {
		const newSession: Session = {
			id: generateId(),
			date_created: new Date().toISOString(),
		};

		session.value = JSON.stringify(newSession);
	}
});
