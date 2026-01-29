<script setup lang="ts">
export interface ProseProps {
	content: string;
	size?: 'sm' | 'md' | 'lg'; // @TODO: Rework the sizes
}

withDefaults(defineProps<ProseProps>(), {
	size: 'md',
});

const config = useRuntimeConfig();
const contentEl = ref<HTMLElement | null>(null);

onMounted(() => {
	if (!contentEl.value) return;

	const anchors = Array.from(contentEl.value.getElementsByTagName('a'));
	if (!anchors) return;

	for (const anchor of anchors) {
		const href = anchor.getAttribute('href');

		if (!href) return;

		const url = new URL(href, window.location.origin);

		const isLocal = url.hostname === config.public.siteUrl;

		if (isLocal) {
			anchor.addEventListener('click', (e) => {
				const { pathname, searchParams, hash } = new URL(anchor.href);

				navigateTo({
					path: pathname,
					hash: hash,
					query: Object.fromEntries(searchParams.entries()),
				});

				e.preventDefault();
			});
		} else {
			anchor.setAttribute('target', '_blank');
			anchor.setAttribute('rel', 'noopener noreferrer');
		}
	}
});
</script>

<template>
	<div
		ref="contentEl"
		:class="[
			{
				'prose-sm': size === 'sm',
				'md:prose-base lg:prose-lg': size === 'md',
				'prose-lg lg:prose-xl': size === 'lg',
			},
			// Base prose with dark mode
		'prose dark:prose-invert max-w-none',
		// Typography - readable line height and spacing
		'prose-p:leading-7 prose-p:mb-4',
		// Headings - clear hierarchy with display font
		'prose-headings:font-display prose-headings:font-semibold prose-headings:tracking-tight',
		'prose-h1:text-3xl prose-h1:mt-0 prose-h1:mb-6',
		'prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 dark:prose-h2:border-gray-700',
		'prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3',
		'prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-2',
		// Links - consistent primary color
		'prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline',
		// Images - rounded with subtle border
		'prose-img:rounded-lg prose-img:border-2 prose-img:border-gray-200 dark:prose-img:border-gray-700',
		// Code blocks - better contrast and styling
		'prose-code:before:content-none prose-code:after:content-none',
		'prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono',
		'dark:prose-code:bg-gray-800',
		'prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:whitespace-pre prose-pre:font-mono',
		'dark:prose-pre:bg-gray-950 dark:prose-pre:border dark:prose-pre:border-gray-800',
		// Tables - proper borders and spacing
		'prose-table:border-collapse prose-table:w-full prose-table:my-6',
		'prose-thead:bg-gray-50 dark:prose-thead:bg-gray-800',
		'prose-th:border prose-th:border-gray-300 prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold',
		'dark:prose-th:border-gray-600',
		'prose-td:border prose-td:border-gray-300 prose-td:px-4 prose-td:py-3',
		'dark:prose-td:border-gray-600',
		'prose-tr:even:bg-gray-50 dark:prose-tr:even:bg-gray-800/50',
		// Lists - consistent spacing
		'prose-ul:my-4 prose-ol:my-4 prose-li:my-1',
		// Blockquotes - subtle styling
		'prose-blockquote:border-l-4 prose-blockquote:border-primary-500 prose-blockquote:bg-gray-50 prose-blockquote:py-1 prose-blockquote:px-4',
		'dark:prose-blockquote:bg-gray-800/50',
		// Horizontal rules
		'prose-hr:border-gray-300 dark:prose-hr:border-gray-700 prose-hr:my-8',
		]"
		v-html="content"
	/>
</template>
