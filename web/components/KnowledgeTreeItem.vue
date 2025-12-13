<script setup lang="ts">
const props = defineProps({
  item: Object,
  level: {
    type: Number,
    default: 0
  }
});

const isOpen = ref(false);
const hasChildren = computed(() => props.item.children && props.item.children.length > 0);

const toggle = () => {
  if (hasChildren.value) {
    isOpen.value = !isOpen.value;
  }
};
</script>

<template>
  <div class="ml-4">
    <div class="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2" @click="toggle">
      <UIcon v-if="hasChildren" :name="isOpen ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'" class="w-4 h-4 text-gray-500" />
      <div v-else class="w-4"></div>
      
      <UIcon name="i-heroicons-document-text" class="w-4 h-4 text-indigo-500" />
      <span class="text-sm select-none">{{ item.title }}</span>
      <UBadge v-if="item.status" size="xs" :color="item.status === 'published' ? 'green' : 'orange'" variant="subtle">{{ item.status }}</UBadge>
    </div>
    
    <div v-if="isOpen && hasChildren" class="border-l border-gray-200 dark:border-gray-700 ml-2">
      <KnowledgeTreeItem v-for="child in item.children" :key="child.id" :item="child" :level="level + 1" />
    </div>
  </div>
</template>
