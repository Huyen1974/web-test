import { authentication, createDirectus, rest } from '@directus/sdk';
import { joinURL } from 'ufo';
import type { Schema } from '~/types/schema';

import { defineNuxtPlugin, useRoute, useRuntimeConfig } from '#imports';

export default defineNuxtPlugin((nuxtApp) => {
	const config = useRuntimeConfig();

	// E2 Task #011: SDK requires ABSOLUTE URL for initialization
	// Server-side (SSR): Call Directus directly (faster, no proxy loop)
	// Client-side (Browser): Use origin + /api/directus proxy (absolute URL, bypasses CORS)
	const serverDirectusUrl =
		config.directusInternalUrl ||
		config.public.directus?.rest?.baseUrl ||
		config.public.directus?.url ||
		config.public.directusUrl ||
		'https://directus-test-pfne2mqwja-as.a.run.app';

	// Client uses absolute proxy URL (SDK needs absolute URL for `new URL()`)
	// window.location.origin provides the current domain (e.g., https://ai.incomexsaigoncorp.vn)
	const clientDirectusUrl = import.meta.client
		? window.location.origin + '/api/directus'
		: '/api/directus';

	const directusBaseUrl = import.meta.server ? serverDirectusUrl : clientDirectusUrl;

	if (!directusBaseUrl) {
		console.warn('[Directus] Missing base URL – skipping client initialization');
		return;
	}

	// Create Directus client for both server and client
	// Server-side: Uses rest() only (no session auth)
	// Client-side: Uses rest() + authentication('session') for logged-in users
	const directus = createDirectus<Schema>(joinURL(directusBaseUrl), { globals: { fetch: $fetch } })
		.with(rest());

	// Client-side only: Add session authentication and live preview support
	if (import.meta.client) {
		// Re-create with authentication for client-side using proxy URL
		const clientDirectus = createDirectus<Schema>(joinURL(clientDirectusUrl), { globals: { fetch: $fetch } })
			.with(authentication('session'))
			.with(rest());

		const route = useRoute();

		// ** Live Preview Bits **
		// Check if we are in preview mode
		const preview = route.query.preview && route.query.preview === 'true';
		const token = route.query.token as string | undefined;

		// If we are in preview mode, we need to use the token from the query string
		if (preview && token) {
			clientDirectus.setToken(token);

			nuxtApp.hook('page:finish', () => {
				refreshNuxtData();
			});
		}

		return {
			provide: {
				directus: clientDirectus,
			},
		};
	}

	// Server-side: Provide basic directus client for SSR data fetching
	return {
		provide: {
			directus,
		},
	};
});
