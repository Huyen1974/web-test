import { authentication, createDirectus, rest } from '@directus/sdk';
import { joinURL } from 'ufo';
import type { Schema } from '~/types/schema';

import { defineNuxtPlugin, useRoute, useRuntimeConfig } from '#imports';

export default defineNuxtPlugin((nuxtApp) => {
	const config = useRuntimeConfig();

	const directusBaseUrl =
		config.public.directus?.rest?.baseUrl ||
		config.public.directus?.url ||
		config.public.directusUrl ||
		config.public.siteUrl;

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
		// Re-create with authentication for client-side
		const clientDirectus = createDirectus<Schema>(joinURL(directusBaseUrl), { globals: { fetch: $fetch } })
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
