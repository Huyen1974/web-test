<script setup lang="ts">
/**
 * DiscussionCard Component
 * Case card for Tier 1 list display
 */

interface Discussion {
  id: string;
  topic: string;
  description?: string;
  status: string;
  round: number;
  max_rounds: number;
  drafter_id?: { first_name: string; last_name: string };
  approver_id?: { first_name: string; last_name: string };
  date_created: string;
  date_updated: string;
}

const props = defineProps<{
  discussion: Discussion;
  selected?: boolean;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  drafting: { label: 'Đang soạn', color: '#3b82f6', icon: '✏️' },
  pending_human: { label: 'Chờ User', color: '#f59e0b', icon: '⏳' },
  reviewing: { label: 'Đang review', color: '#8b5cf6', icon: '🔍' },
  approving: { label: 'Chờ duyệt', color: '#06b6d4', icon: '📝' },
  resolved: { label: 'Hoàn tất', color: '#10b981', icon: '✅' },
  rejected: { label: 'Từ chối', color: '#ef4444', icon: '❌' }
};

const getStatus = () => statusConfig[props.discussion.status] || { label: props.discussion.status, color: '#64748b', icon: '📁' };

const getDrafterName = () => {
  const d = props.discussion.drafter_id;
  return d ? `${d.first_name || ''} ${d.last_name || ''}`.trim() : 'Unknown';
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};
</script>

<template>
  <div
    class="discussion-card"
    :class="{ selected, [discussion.status]: true }"
    @click="emit('select', discussion.id)"
  >
    <div class="card-icon">{{ getStatus().icon }}</div>
    <div class="card-content">
      <div class="card-header">
        <h3 class="topic">{{ discussion.topic }}</h3>
        <span class="status-badge" :style="{ background: getStatus().color }">
          {{ getStatus().label }}
        </span>
      </div>
      <p v-if="discussion.description" class="description">{{ discussion.description }}</p>
      <div class="card-meta">
        <span class="drafter">🤖 {{ getDrafterName() }}</span>
        <span class="round">Vòng {{ discussion.round }}/{{ discussion.max_rounds }}</span>
        <span class="updated">{{ formatDate(discussion.date_updated) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.discussion-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.discussion-card:hover {
  border-color: #94a3b8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.discussion-card.selected {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.discussion-card.pending_human {
  border-left: 3px solid #f59e0b;
}

.discussion-card.resolved {
  border-left: 3px solid #10b981;
}

.card-icon {
  flex-shrink: 0;
  font-size: 24px;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.topic {
  flex: 1;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
}

.status-badge {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  color: white;
}

.description {
  margin: 0 0 8px;
  font-size: 14px;
  color: #64748b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #94a3b8;
}

.card-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.round {
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 4px;
}
</style>
