/**
 * Dynamic sitemap URLs for knowledge documents — WEB-80d
 *
 * Fetches all published knowledge docs from Directus and returns
 * URLs in the format expected by @nuxtjs/sitemap.
 *
 * Convention: server/routes/__sitemap__/urls.ts is auto-discovered
 * by the sitemap module as a dynamic URL source.
 */
export default defineSitemapEventHandler(async () => {
	const config = useRuntimeConfig();
	const directusUrl =
		config.directusInternalUrl ||
		config.public.directusUrl ||
		'https://directus.incomexsaigoncorp.vn';

	try {
		const data = await $fetch<{ data: any[] }>(
			`${directusUrl}/items/knowledge_documents`,
			{
				params: {
					'filter[status][_eq]': 'published',
					'filter[is_current_version][_eq]': true,
					'filter[is_folder][_eq]': false,
					'fields': 'file_path,date_updated',
					'limit': -1,
				},
			},
		);

		return (data?.data || [])
			.filter((doc) => doc.file_path?.startsWith('knowledge/'))
			.map((doc) => {
				const clean = doc.file_path
					.replace(/^knowledge\//, '')
					.replace(/^docs\//, '')
					.replace(/\.md$/, '');
				return {
					loc: `/knowledge/${clean}`,
					lastmod: doc.date_updated || undefined,
				};
			});
	} catch (error) {
		console.error('[Sitemap] Failed to fetch knowledge docs:', error);
		return [];
	}
});
