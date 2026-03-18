<script setup lang="ts">
/**
 * Homepage — Explicit route for /
 * S135G: Simplified to debug SSR issue. Fetches page data with minimal fields
 * to avoid M2A blocks expansion which may fail in SSR.
 */
import type { Page } from '~/types';

const url = useRequestURL();
const { fileUrl } = useFiles();
const { globals } = useAppConfig();

// Step 1: Fetch page with FULL blocks expansion (same as [...permalink].vue)
const { data: page, error: fetchError } = await useAsyncData(
	'homepage',
	async () => {
		try {
			const result = await useDirectus(
				readItems('pages', {
					filter: { permalink: { _eq: '/' } },
					fields: [
						'*',
						{
							seo: ['*'],
							blocks: [
								'id',
								'collection',
								'hide_block',
								{
									item: {
										block_hero: ['id', 'title', 'headline', 'content', 'image', 'image_position',
											{ button_group: ['*', { buttons: ['*', { page: ['permalink'], post: ['slug'] }] }] }],
										block_faqs: ['id', 'title', 'faqs', 'headline', 'alignment'],
										block_richtext: ['id', 'title', 'headline', 'content', 'alignment'],
										block_testimonials: ['id', 'title', 'headline',
											{ testimonials: [{ testimonials_id: ['id', 'title', 'subtitle', 'content', 'company', 'company_logo', { image: ['id', 'title', 'description'] }] }] }],
										block_quote: ['id', 'title', 'subtitle', 'content'],
										block_cta: ['id', 'title', 'headline', 'content',
											{ button_group: ['*', { buttons: ['*', { page: ['permalink'], post: ['slug'] }] }] }],
										block_form: ['id', 'title', 'headline', { form: ['*'] }],
										block_logocloud: ['id', 'title', 'headline', { logos: ['id', { directus_files_id: ['id', 'title', 'description'] }] }],
										block_gallery: ['id', 'title', 'headline', { gallery_items: [{ directus_files_id: ['id', 'title', 'description'] }] }],
										block_steps: ['id', 'title', 'headline', 'show_step_numbers', 'alternate_image_position',
											{ steps: ['id', 'title', 'content', 'image', { button_group: ['*', { buttons: ['*', { page: ['permalink'], post: ['slug'] }] }] }] }],
										block_columns: ['id', 'title', 'headline',
											{ rows: ['title', 'headline', 'content', 'image_position', { image: ['id', 'title', 'description'] },
												{ button_group: ['*', { buttons: ['*', { page: ['permalink'], post: ['slug'] }] }] }] }],
										block_divider: ['id', 'title'],
										block_team: ['*'],
										block_html: ['*'],
										block_video: ['*'],
										block_cardgroup: ['*'],
									},
								},
							],
						},
					],
					limit: 1,
				}),
			);
			return result?.[0] ?? null;
		} catch (e: any) {
			// Log SSR error for debugging
			if (import.meta.server) {
				console.error('[Homepage SSR] Directus query failed:', e?.message || e);
			}
			return null;
		}
	},
);

// If full query fails, try simple query (no blocks) as fallback
if (!unref(page) && !unref(fetchError)) {
	try {
		const { data: simplePage } = await useAsyncData(
			'homepage-simple',
			async () => {
				const result = await useDirectus(
					readItems('pages', {
						filter: { permalink: { _eq: '/' } },
						fields: ['id', 'title', 'permalink', 'status', 'summary'],
						limit: 1,
					}),
				);
				return result?.[0] ?? null;
			},
		);
		if (unref(simplePage)) {
			// We got the page without blocks — render a simple version
			page.value = unref(simplePage) as any;
		}
	} catch {
		// Ignore fallback error
	}
}

if (!unref(page)) {
	throw createError({ statusCode: 404, statusMessage: 'Page Not Found' });
}

const metadata = computed(() => {
	const p = unref(page);
	return {
		title: p?.seo?.title ?? p?.title ?? 'Home',
		description: p?.seo?.meta_description ?? p?.summary ?? undefined,
		image: globals?.og_image ? fileUrl(globals.og_image) : undefined,
		canonical: p?.seo?.canonical_url ?? url,
	};
});

useSchemaOrg([defineWebPage({ name: unref(metadata)?.title, description: unref(metadata)?.description })]);
useHead({ title: () => unref(metadata)?.title, link: [{ rel: 'canonical', href: () => unref(metadata)?.canonical }] });
useServerSeoMeta({ title: () => unref(metadata)?.title, description: () => unref(metadata)?.description,
	ogTitle: () => unref(metadata)?.title, ogDescription: () => unref(metadata)?.description });
</script>
<template>
	<NuxtErrorBoundary>
		<PageBuilder v-if="page && (page as any).blocks" :page="page as Page" />
		<!-- Fallback for when blocks aren't loaded -->
		<BlockContainer v-else-if="page">
			<div class="py-16 text-center">
				<h1 class="text-4xl font-bold text-gray-900 dark:text-white">{{ (page as any).title || 'Incomex AI Portal' }}</h1>
				<p v-if="(page as any).summary" class="mt-4 text-lg text-gray-600 dark:text-gray-400">{{ (page as any).summary }}</p>
			</div>
		</BlockContainer>
		<template #error="{ error }">
			<BlockContainer>
				<VAlert type="error">{{ error }}</VAlert>
			</BlockContainer>
		</template>
	</NuxtErrorBoundary>
</template>
