<script setup lang="ts">
definePageMeta({
	title: 'Document',
});

const route = useRoute();
const slug = computed(() => {
	const s = route.params.slug;
	return Array.isArray(s) ? s.join('/') : s;
});

const { data: doc, status, error } = useAsyncData(
	`doc-${slug.value}`,
	() => $fetch(`/api/knowledge/${slug.value}`),
	{ default: () => null },
);

const title = computed(() => {
	if (!doc.value) return 'Document';
	const d = doc.value as any;
	return d.metadata?.title || d.document_id || slug.value;
});

useHead({ title });

const content = computed(() => {
	if (!doc.value) return '';
	return (doc.value as any).content || '';
});

const lines = computed(() => content.value.split('\n'));
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<div class="mb-6">
			<NuxtLink
				to="/knowledge/laws"
				class="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
			>
				&larr; Laws & Governance
			</NuxtLink>
		</div>

		<div v-if="status === 'pending'" class="py-8 text-center text-gray-500">Loading document...</div>

		<div v-else-if="error" class="py-8 text-center text-red-500">
			Failed to load document: {{ slug }}
		</div>

		<template v-else-if="doc">
			<article class="prose prose-gray max-w-none dark:prose-invert">
				<template v-for="(line, i) in lines" :key="i">
					<h1 v-if="line.startsWith('# ')" class="text-2xl font-bold mt-6 mb-3">{{ line.slice(2) }}</h1>
					<h2 v-else-if="line.startsWith('## ')" class="text-xl font-semibold mt-5 mb-2">{{ line.slice(3) }}</h2>
					<h3 v-else-if="line.startsWith('### ')" class="text-lg font-semibold mt-4 mb-2">{{ line.slice(4) }}</h3>
					<h4 v-else-if="line.startsWith('#### ')" class="text-base font-semibold mt-3 mb-1">{{ line.slice(5) }}</h4>
					<blockquote v-else-if="line.startsWith('> ')" class="border-l-4 border-gray-300 pl-4 italic text-gray-600 dark:text-gray-400 my-2">{{ line.slice(2) }}</blockquote>
					<li v-else-if="line.startsWith('- ') || line.startsWith('* ')" class="ml-4 list-disc">{{ line.slice(2) }}</li>
					<li v-else-if="/^\d+\.\s/.test(line)" class="ml-4 list-decimal">{{ line.replace(/^\d+\.\s/, '') }}</li>
					<hr v-else-if="line.startsWith('---')" class="my-4" />
					<br v-else-if="line.trim() === ''" />
					<p v-else class="my-1 leading-relaxed">{{ line }}</p>
				</template>
			</article>
		</template>
	</div>
</template>
