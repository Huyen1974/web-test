<script setup lang="ts">
const { params } = useRoute();
const { $directus } = useNuxtApp();
const { readItems } = await import('@directus/sdk');

// Query project's folder from DB instead of hardcoded UUID
const { data: project } = await useAsyncData(`project-${params.id}`, () =>
	$directus.request(readItems('os_projects', {
		filter: { id: { _eq: params.id as string } },
		fields: ['files_folder'],
		limit: 1,
	}))
);
const folderId = computed(() => project.value?.[0]?.files_folder || '');
</script>
<template>
	<UCard
		class="mt-6"
		:ui="{
			background: 'bg-transparent dark:bg-transparent',
		}"
	>
		<template #header>
			<div class="flex items-center justify-between w-full">
				<div>
					<TypographyHeadline content="Files" size="xs" />
					<TypographyProse size="sm" content="These are the files you'll need to complete your project" />
				</div>
				<div>
					<PortalFileUploadModal :folder-id="folderId" />
				</div>
			</div>
		</template>
		<PortalFilesView :folder-id="folderId" />
	</UCard>
</template>
