<script setup lang="ts">
// Redirect to first tab (targets) when hitting /tasks/:id directly
const route = useRoute();
const taskId = route.params.id as string;

await navigateTo(`/tasks/${taskId}/targets`, { replace: true });
</script>

<template>
	<div></div>
</template>
