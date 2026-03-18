/**
 * S135G Debug: Test homepage Directus query from server side
 * DELETE THIS FILE after debugging
 */
import { createDirectus, readItems, rest } from '@directus/sdk';

export default defineEventHandler(async () => {
	const config = useRuntimeConfig();

	const serverDirectusUrl =
		config.directusInternalUrl ||
		config.public?.directus?.rest?.baseUrl ||
		config.public?.directus?.url ||
		config.public?.directusUrl ||
		'https://directus.incomexsaigoncorp.vn';

	const results: Record<string, any> = {
		serverDirectusUrl,
		steps: [],
	};

	try {
		const directus = createDirectus(serverDirectusUrl, { globals: { fetch: $fetch as any } }).with(rest());
		results.steps.push('Client created');

		const pages = await directus.request(
			readItems('pages', {
				filter: { permalink: { _eq: '/' } },
				fields: ['id', 'title', 'permalink', 'status'],
				limit: 1,
			}),
		);

		results.steps.push(`Query returned ${Array.isArray(pages) ? pages.length : 'non-array'} items`);
		results.pages = pages;
		results.success = true;
	} catch (error: any) {
		results.error = {
			message: error?.message || String(error),
			statusCode: error?.statusCode,
			statusMessage: error?.statusMessage,
			response: error?.response?.status,
		};
		results.success = false;
	}

	return results;
});
