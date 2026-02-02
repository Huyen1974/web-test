<script setup lang="ts">
/**
 * DetailPanel Component
 * Right column - Full content view + Supreme Authority input
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
  description?: string
  status: string
  round: number
  max_rounds: number
  draft_content?: string
  locked_by_user?: boolean
  date_created?: string
}

const props = defineProps<{
  discussion: Discussion | null
  selectedComment: Comment | null
  deadline?: Date | null
}>()

const emit = defineEmits<{
  submitDecision: [decision: string, content: string]
}>()

const userInput = ref('')
const isSubmitting = ref(false)

const getAgentName = (author: any): string => {
  if (!author) return 'Unknown'
  if (typeof author === 'string') return author
  return author.first_name || author.email?.split('@')[0] || 'Agent'
}

const formatContent = (content: string): string => {
  if (!content) return ''
  // Simple markdown-like formatting
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}

const submitDecision = async (decision: string) => {
  if (isSubmitting.value) return
  isSubmitting.value = true

  try {
    emit('submitDecision', decision, userInput.value)
    userInput.value = ''
  } finally {
    isSubmitting.value = false
  }
}

// Countdown timer for pending_human
const remainingSeconds = ref(300)
let timerInterval: ReturnType<typeof setInterval> | null = null

const startTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
  remainingSeconds.value = 300 // 5 minutes

  timerInterval = setInterval(() => {
    remainingSeconds.value--
    if (remainingSeconds.value <= 0) {
      clearInterval(timerInterval!)
    }
  }, 1000)
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

watch(() => props.discussion?.status, (newStatus) => {
  if (newStatus === 'pending_human') {
    startTimer()
  } else if (timerInterval) {
    clearInterval(timerInterval)
  }
}, { immediate: true })

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<template>
  <div class="detail-panel">
    <!-- Header -->
    <div v-if="discussion" class="panel-header">
      <div class="header-content">
        <h2 class="panel-title">{{ discussion.topic }}</h2>
        <div class="header-badges">
          <AiStatusBadge :status="discussion.status" size="md" />
          <span v-if="discussion.locked_by_user" class="locked-badge">🔒 Da khoa</span>
        </div>
      </div>
      <p v-if="discussion.description" class="panel-description">{{ discussion.description }}</p>
    </div>

    <!-- Content Area -->
    <div class="panel-content">
      <!-- Countdown Timer for pending_human -->
      <div v-if="discussion?.status === 'pending_human'" class="countdown-banner">
        <span class="countdown-label">⏱️ Tu dong approve sau:</span>
        <span :class="['countdown-time', { warning: remainingSeconds < 60 }]">
          {{ formatTime(remainingSeconds) }}
        </span>
      </div>

      <!-- Selected Comment Detail -->
      <div v-if="selectedComment" class="comment-detail">
        <div class="comment-author">
          <AiAgentAvatar :agent="selectedComment.author_id" size="lg" />
          <div class="author-info">
            <div class="author-name">{{ getAgentName(selectedComment.author_id) }}</div>
            <div class="author-meta">
              {{ selectedComment.comment_type }} - Round {{ selectedComment.round }}
            </div>
          </div>
          <AiDecisionBadge v-if="selectedComment.decision" :decision="selectedComment.decision" size="md" />
        </div>
        <div class="comment-body" v-html="formatContent(selectedComment.content)"></div>
      </div>

      <!-- Draft Content (when no comment selected) -->
      <div v-else-if="discussion?.draft_content" class="draft-content">
        <h3>📄 Noi dung de xuat</h3>
        <div class="draft-body" v-html="formatContent(discussion.draft_content)"></div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-detail">
        <p>Chon mot discussion de xem chi tiet</p>
      </div>
    </div>

    <!-- Supreme Authority Input (if not locked) -->
    <div
      v-if="discussion && !discussion.locked_by_user && discussion.status !== 'resolved' && discussion.status !== 'rejected'"
      class="authority-section"
    >
      <div class="authority-header">
        <span class="authority-icon">👑</span>
        <span class="authority-title">SUPREME AUTHORITY</span>
        <span class="authority-hint">Y kien cua ban override moi AI</span>
      </div>

      <!-- Context Indicator -->
      <div class="context-indicator">
        <span class="context-label">📍 Dang comment vao:</span>
        <span v-if="selectedComment" class="context-value">
          {{ getAgentName(selectedComment.author_id) }} - Round {{ selectedComment.round }}
        </span>
        <span v-else class="context-value">Toan bo Discussion</span>
      </div>

      <textarea
        v-model="userInput"
        rows="3"
        class="authority-input"
        placeholder="Nhap y kien cua ban..."
      ></textarea>

      <div class="decision-buttons">
        <button
          @click="submitDecision('approve')"
          :disabled="isSubmitting"
          class="btn-approve"
        >
          ✅ Phe duyet & Dong
        </button>
        <button
          @click="submitDecision('reject')"
          :disabled="isSubmitting"
          class="btn-reject"
        >
          ❌ Tu choi
        </button>
        <button
          @click="submitDecision('redirect')"
          :disabled="isSubmitting"
          class="btn-redirect"
        >
          🔄 Yeu cau sua
        </button>
        <button
          @click="submitDecision('comment')"
          :disabled="isSubmitting"
          class="btn-comment"
        >
          💬 Binh luan
        </button>
      </div>
    </div>

    <!-- Locked Notice -->
    <div v-else-if="discussion?.locked_by_user" class="locked-notice">
      🔒 Discussion da bi khoa boi User - Khong the thay doi
    </div>
  </div>
</template>

<style scoped>
.detail-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.header-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.header-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.locked-badge {
  padding: 4px 10px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.panel-description {
  margin: 8px 0 0;
  font-size: 14px;
  color: #64748b;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.countdown-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fef3c7;
  border-radius: 8px;
  margin-bottom: 16px;
}

.countdown-label {
  font-size: 14px;
  color: #92400e;
}

.countdown-time {
  font-size: 20px;
  font-weight: 700;
  color: #d97706;
}

.countdown-time.warning {
  color: #dc2626;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.comment-detail {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
}

.comment-author {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.author-info {
  flex: 1;
}

.author-name {
  font-weight: 600;
  color: #1e293b;
}

.author-meta {
  font-size: 12px;
  color: #64748b;
}

.comment-body {
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
}

.draft-content h3 {
  font-size: 16px;
  margin: 0 0 12px;
  color: #374151;
}

.draft-body {
  font-size: 14px;
  line-height: 1.6;
  color: #334155;
}

.empty-detail {
  text-align: center;
  color: #94a3b8;
  padding: 48px;
}

/* Supreme Authority Section */
.authority-section {
  padding: 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-top: 4px solid #f59e0b;
}

.authority-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.authority-icon {
  font-size: 24px;
}

.authority-title {
  font-weight: 700;
  color: #92400e;
}

.authority-hint {
  font-size: 12px;
  color: #b45309;
}

.context-indicator {
  padding: 8px 12px;
  background: #fef3c7;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;
}

.context-label {
  font-weight: 500;
  color: #92400e;
}

.context-value {
  color: #78350f;
}

.authority-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #fbbf24;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  margin-bottom: 12px;
}

.authority-input:focus {
  outline: none;
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
}

.decision-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.decision-buttons button {
  padding: 10px 8px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}

.decision-buttons button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-approve {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.btn-approve:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.btn-reject {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.btn-reject:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-redirect {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.btn-redirect:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

.btn-comment {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.btn-comment:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.locked-notice {
  padding: 16px;
  background: #fee2e2;
  text-align: center;
  color: #dc2626;
  font-weight: 500;
}

@media (max-width: 768px) {
  .decision-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
