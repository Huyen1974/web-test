<script setup lang="ts">
/**
 * ThreadList Component
 * Middle column - Comments/rounds list
 */

interface Comment {
  id: number
  author_id: any
  comment_type: string
  content: string
  round: number
  decision?: string
  date_created: string
}

interface Discussion {
  id: number
  topic: string
  status: string
  round: number
  max_rounds: number
}

const props = defineProps<{
  discussion: Discussion | null
  comments: Comment[]
  selectedCommentId: number | null
}>()

const emit = defineEmits<{
  selectComment: [id: number]
}>()

const selectedRound = ref<number>(1)

// Get unique rounds
const rounds = computed(() => {
  if (!props.discussion) return []
  const maxRound = props.discussion.round || 1
  return Array.from({ length: maxRound }, (_, i) => ({
    number: i + 1,
    isActive: i + 1 === maxRound
  }))
})

// Filter comments by selected round
const roundComments = computed(() => {
  return props.comments.filter(c => c.round === selectedRound.value)
})

const getAgentName = (author: any): string => {
  if (!author) return 'Unknown'
  if (typeof author === 'string') return author
  return author.first_name || author.email?.split('@')[0] || 'Agent'
}

const truncate = (text: string, length: number): string => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const formatTime = (dateStr: string): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

const getCommentStyle = (type: string): string => {
  const styles: Record<string, string> = {
    draft: 'bg-blue-50 border-l-blue-500',
    review: 'bg-purple-50 border-l-purple-500',
    approval: 'bg-green-50 border-l-green-500',
    human: 'bg-yellow-50 border-l-yellow-500',
    human_supreme: 'bg-yellow-100 border-l-yellow-600'
  }
  return styles[type] || 'bg-gray-50 border-l-gray-400'
}

// Auto-select latest round when discussion changes
watch(() => props.discussion, (newVal) => {
  if (newVal) {
    selectedRound.value = newVal.round || 1
  }
}, { immediate: true })
</script>

<template>
  <div class="thread-list">
    <!-- Header -->
    <div v-if="discussion" class="thread-header">
      <h3 class="thread-title">{{ discussion.topic }}</h3>
      <div class="thread-meta">
        <AiStatusBadge :status="discussion.status" size="sm" />
        <span class="round-info">Round {{ discussion.round }}/{{ discussion.max_rounds }}</span>
      </div>
    </div>

    <!-- Rounds Navigation -->
    <div v-if="rounds.length > 1" class="rounds-nav">
      <button
        v-for="round in rounds"
        :key="round.number"
        :class="['round-btn', { active: selectedRound === round.number }]"
        @click="selectedRound = round.number"
      >
        R{{ round.number }}
        <span v-if="round.isActive" class="active-dot"></span>
      </button>
    </div>

    <!-- Comments List -->
    <div class="comments-list">
      <div
        v-for="comment in roundComments"
        :key="comment.id"
        :class="['comment-item', getCommentStyle(comment.comment_type), { selected: comment.id === selectedCommentId }]"
        @click="emit('selectComment', comment.id)"
      >
        <div class="comment-header">
          <AiAgentAvatar :agent="comment.author_id" size="sm" />
          <span class="author-name">{{ getAgentName(comment.author_id) }}</span>
          <AiDecisionBadge v-if="comment.decision" :decision="comment.decision" size="xs" />
        </div>
        <p class="comment-preview">{{ truncate(comment.content, 80) }}</p>
        <span class="comment-time">{{ formatTime(comment.date_created) }}</span>
      </div>

      <div v-if="roundComments.length === 0" class="empty-comments">
        Chua co thao luan trong vong nay
      </div>
    </div>
  </div>
</template>

<style scoped>
.thread-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e2e8f0;
  background: white;
}

.thread-header {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.thread-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.thread-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.round-info {
  font-size: 12px;
  color: #64748b;
}

.rounds-nav {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  overflow-x: auto;
}

.round-btn {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  background: white;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.round-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.active-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.round-btn.active .active-dot {
  background: white;
}

.comments-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.comment-item {
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  border-left: 3px solid;
  cursor: pointer;
  transition: all 0.15s;
}

.comment-item:hover {
  opacity: 0.9;
}

.comment-item.selected {
  ring: 2px;
  ring-color: #3b82f6;
  box-shadow: 0 0 0 2px #3b82f6;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.author-name {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.comment-preview {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}

.comment-time {
  font-size: 10px;
  color: #94a3b8;
  display: block;
  margin-top: 4px;
}

.empty-comments {
  padding: 24px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}
</style>
