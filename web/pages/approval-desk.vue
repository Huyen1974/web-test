<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
});

const props = defineProps(['id']); // Usually route param
const route = useRoute();
const documentId = route.params.id || '1'; // Default for demo

const { $directus, $config } = useNuxtApp();
const directusUrl = $config.public.directusUrl;

// Iframe URL for Revisions
// Assuming Directus Admin URL structure. 
// If we can't deep direct link to Revisions, we might need to show the Item Detail which has Revisions in sidebar.
// Or effectively use the "Anti-Stupid" approach: Embed Directus Item View.
const iframeUrl = computed(() => `${directusUrl}/admin/content/knowledge_documents/${documentId}`);

const approve = async () => {
    // Call Directus Flow or API to update status
    await $directus.request($directus.updateItem('knowledge_documents', documentId, { status: 'published' }));
    alert('Approved!');
};

const requestChange = async () => {
    // Trigger logic
    alert('Change Requested');
};
</script>

<template>
  <div class="h-[calc(100vh-64px)] flex flex-col">
    <div class="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
      <h1 class="text-lg font-semibold">Approval Desk</h1>
      <div class="space-x-2">
        <UButton color="red" variant="soft" label="Request Change" @click="requestChange" />
        <UButton color="green" label="Approve" @click="approve" />
      </div>
    </div>
    
    <div class="flex-1 w-full bg-gray-100">
        <iframe :src="iframeUrl" class="w-full h-full border-0" title="Directus Review"></iframe>
    </div>
  </div>
</template>
