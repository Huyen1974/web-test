<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
});

const { $directus } = useNuxtApp();

// Fetch all documents
const { data: documents, pending, error } = await useAsyncData('knowledge-tree', async () => {
    // Fetch fields needed for tree. Order by sort if available, or title.
    return $directus.request($directus.readItems('knowledge_documents', {
        fields: ['id', 'title', 'parent_id', 'status'],
        limit: -1,
        sort: ['sort', 'title']
    }));
});

const treeData = computed(() => {
    if (!documents.value) return [];
    
    // Build tree
    const map = {};
    const roots = [];
    
    // Initialize map
    documents.value.forEach(doc => {
        map[doc.id] = { ...doc, children: [] };
    });
    
    // Link children to parents
    documents.value.forEach(doc => {
        if (doc.parent_id && map[doc.parent_id]) {
            map[doc.parent_id].children.push(map[doc.id]);
        } else {
            roots.push(map[doc.id]);
        }
    });
    
    return roots;
});
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Knowledge Tree</h1>
    
    <UCard>
        <div v-if="pending" class="p-4 text-center">Loading...</div>
        <div v-else-if="error" class="p-4 text-red-500">{{ error.message }}</div>
        <div v-else>
            <KnowledgeTreeItem v-for="root in treeData" :key="root.id" :item="root" />
            <div v-if="treeData.length === 0" class="text-gray-500 italic">No documents found.</div>
        </div>
    </UCard>
  </div>
</template>
