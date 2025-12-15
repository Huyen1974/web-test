import { authentication, createDirectus, rest } from '@directus/sdk';
import { joinURL } from 'ufo';
import type { Schema } from '~/types/schema';

import { defineNuxtPlugin, useRoute, useRuntimeConfig } from '#imports';

export default defineNuxtPlugin((nuxtApp) => {
	// Skip on server during prerender/build
	if (import.meta.server) return;

	const route = useRoute();
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

	const directus = createDirectus<Schema>(joinURL(directusBaseUrl), { globals: { fetch: $fetch } })
		.with(authentication('session'))
		.with(rest());

	// ** Live Preview Bits **
	// Check if we are in preview mode
	const preview = route.query.preview && route.query.preview === 'true';
	const token = route.query.token as string | undefined;

	// If we are in preview mode, we need to use the token from the query string
	if (preview && token) {
		directus.setToken(token);

		nuxtApp.hook('page:finish', () => {
			refreshNuxtData();
		});
	}

	return {
		provide: {
			directus,
		},
	};
});
