<script setup lang="ts">
/**
 * DiscussionSidebar Component
 * Left column - Discussion list with categories
 */

interface Discussion {
  id: number
  topic: string
  status: string
  date_updated: string
  round: number
}

const props = defineProps<{
  discussions: Discussion[]
  selectedId: number | null
}>()

const emit = defineEmits<{
  select: [id: number]
}>()

const searchQuery = ref('')

const filteredDiscussions = computed(() => {
  if (!searchQuery.value) return props.discussions
  const query = searchQuery.value.toLowerCase()
  return props.discussions.filter(d =>
    d.topic.toLowerCase().includes(query)
  )
})

const pendingCount = computed(() =>
  props.discussions.filter(d => d.status === 'pending_human').length
)

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}
</script>

<template>
  <div class="sidebar">
    <!-- Search -->
    <div class="search-box">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Tim kiem..."
        class="search-input"
      />
    </div>

    <!-- Discussion List -->
    <div class="discussion-list">
      <div
        v-for="discussion in filteredDiscussions"
        :key="discussion.id"
        :class="['discussion-item', { selected: discussion.id === selectedId }]"
        @click="emit('select', discussion.id)"
      >
        <div class="item-topic">{{ discussion.topic }}</div>
        <div class="item-meta">
          <AiStatusBadge :status="discussion.status" size="xs" />
          <span class="item-date">{{ formatDate(discussion.date_updated) }}</span>
        </div>
      </div>

      <div v-if="filteredDiscussions.length === 0" class="empty-state">
        Khong tim thay vu viec nao
      </div>
    </div>

    <!-- Stats -->
    <div class="sidebar-stats">
      <div>Tong: {{ discussions.length }} vu viec</div>
      <div>Cho duyet: {{ pendingCount }}</div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
}

.search-box {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.discussion-list {
  flex: 1;
  overflow-y: auto;
}

.discussion-item {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  transition: background 0.15s;
}

.discussion-item:hover {
  background: #f1f5f9;
}

.discussion-item.selected {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
}

.item-topic {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-date {
  font-size: 11px;
  color: #94a3b8;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

.sidebar-stats {
  padding: 12px;
  border-top: 1px solid #e2e8f0;
  background: white;
  font-size: 12px;
  color: #64748b;
}
</style>
