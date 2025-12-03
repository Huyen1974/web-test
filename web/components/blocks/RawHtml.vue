<script setup lang="ts">
export interface RawHtmlBlockProps {
	id: string;
	raw_html: string;
}

defineProps<{
	data: RawHtmlBlockProps;
}>();
</script>
<template>
	<BlockContainer>
		<!-- Nội dung HTML được lấy từ Directus (SSOT, nội bộ kiểm soát); chấp nhận render trực tiếp theo Luật Data & Connection. -->
		<!-- eslint-disable-next-line vue/no-v-html -->
		<div v-html="data.raw_html" />
	</BlockContainer>
</template>
