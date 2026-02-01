<script setup lang="ts">
/**
 * Super Session - AI Discussion Monitoring Dashboard
 * WEB-39: 3-tier interface for human oversight of AI discussions
 *
 * Tier 1: Cases List (all discussions)
 * Tier 2: Rounds (conversation rounds within a discussion)
 * Tier 3: Details (individual comments and human input)
 */

definePageMeta({
  layout: 'default',
  middleware: ['auth']
});

const {
  discussions,
  currentDiscussion,
  comments,
  loading,
  error,
  commentsByRound,
  fetchDiscussions,
  fetchDiscussion,
  fetchComments,
  submitHumanComment,
  updateStatus,
  getDeadline,
  startPolling,
  stopPolling
} = useAIDiscussions();

// State
const selectedDiscussionId = ref<string | null>(null);
const selectedRound = ref<number | null>(null);
const humanInput = ref('');
const submitting = ref(false);

// Auth token (from user session or env)
const token = ref('');

// Initialize
onMounted(async () => {
  await fetchDiscussions();
  startPolling(15000); // Refresh every 15 seconds
});

onUnmounted(() => {
  stopPolling();
});

// Select discussion (Tier 1 → Tier 2)
const selectDiscussion = async (id: string) => {
  selectedDiscussionId.value = id;
  selectedRound.value = null;

  await fetchDiscussion(id);
  await fetchComments(id);

  // Auto-select latest round
  const rounds = Object.keys(commentsByRound.value).map(Number);
  if (rounds.length > 0) {
    selectedRound.value = Math.max(...rounds);
  } else {
    selectedRound.value = currentDiscussion.value?.round || 1;
  }
};

// Get comments for selected round (Tier 3)
const currentRoundComments = computed(() => {
  if (!selectedRound.value) return [];
  return commentsByRound.value[selectedRound.value] || [];
});

// Submit human response
const handleSubmitComment = async () => {
  if (!humanInput.value.trim() || !selectedDiscussionId.value) return;

  submitting.value = true;

  const success = await submitHumanComment(
    selectedDiscussionId.value,
    humanInput.value.trim(),
    token.value
  );

  if (success) {
    humanInput.value = '';
  }

  submitting.value = false;
};

// Get available rounds
const availableRounds = computed(() => {
  if (!currentDiscussion.value) return [];

  const maxRound = currentDiscussion.value.round;
  const rounds = [];

  for (let i = 1; i <= maxRound; i++) {
    const roundComments = commentsByRound.value[i] || [];
    rounds.push({
      number: i,
      commentCount: roundComments.length,
      status: i < maxRound ? 'completed' : 'current'
    });
  }

  return rounds;
});

// Refresh data manually
const refresh = async () => {
  await fetchDiscussions();
  if (selectedDiscussionId.value) {
    await fetchDiscussion(selectedDiscussionId.value);
    await fetchComments(selectedDiscussionId.value);
  }
};
</script>

<template>
  <div class="super-session">
    <header class="page-header">
      <h1>🎯 Super Session</h1>
      <p>Giám sát thảo luận AI - Hybrid Human-AI Decision System</p>
      <button class="refresh-btn" @click="refresh" :disabled="loading">
        🔄 Làm mới
      </button>
    </header>

    <div class="session-layout">
      <!-- TIER 1: Cases List -->
      <section class="tier tier-1">
        <h2>📁 Danh sách vụ việc</h2>
        <div v-if="loading && discussions.length === 0" class="loading">
          Đang tải...
        </div>
        <div v-else-if="discussions.length === 0" class="empty">
          Chưa có cuộc thảo luận nào
        </div>
        <div v-else class="discussion-list">
          <AiDiscussionCard
            v-for="discussion in discussions"
            :key="discussion.id"
            :discussion="discussion"
            :selected="discussion.id === selectedDiscussionId"
            @select="selectDiscussion"
          />
        </div>
      </section>

      <!-- TIER 2: Rounds -->
      <section class="tier tier-2" v-if="currentDiscussion">
        <h2>🔄 Vòng thảo luận</h2>
        <div class="discussion-info">
          <h3>{{ currentDiscussion.topic }}</h3>
          <div class="info-row">
            <span class="status" :class="currentDiscussion.status">
              {{ currentDiscussion.status }}
            </span>
            <AiCountdownTimer
              v-if="currentDiscussion.status === 'pending_human'"
              :deadline="getDeadline(currentDiscussion)"
              @expired="refresh"
            />
          </div>
        </div>

        <div class="rounds-list">
          <div
            v-for="round in availableRounds"
            :key="round.number"
            class="round-item"
            :class="{ selected: round.number === selectedRound, current: round.status === 'current' }"
            @click="selectedRound = round.number"
          >
            <span class="round-number">Vòng {{ round.number }}</span>
            <span class="comment-count">{{ round.commentCount }} comments</span>
            <span v-if="round.status === 'current'" class="current-badge">Hiện tại</span>
          </div>
        </div>
      </section>

      <!-- TIER 3: Details -->
      <section class="tier tier-3" v-if="selectedRound">
        <h2>💬 Chi tiết hội thoại</h2>

        <AiDiscussionThread
          :comments="currentRoundComments"
          :current-round="selectedRound"
        />

        <!-- Human Input -->
        <div v-if="currentDiscussion?.status === 'pending_human'" class="human-input-section">
          <h4>👤 Phản hồi của bạn</h4>
          <textarea
            v-model="humanInput"
            placeholder="Nhập phản hồi để dừng auto-approval..."
            rows="3"
          ></textarea>
          <div class="input-actions">
            <button
              @click="handleSubmitComment"
              :disabled="!humanInput.trim() || submitting"
              class="submit-btn"
            >
              {{ submitting ? 'Đang gửi...' : '📤 Gửi phản hồi' }}
            </button>
            <span class="hint">
              Gửi phản hồi sẽ dừng đồng hồ auto-approval
            </span>
          </div>
        </div>

        <!-- Link for AI agents -->
        <div class="ai-link-info">
          <p>
            🔗 Link giám sát: <code>https://ai.incomexsaigoncorp.vn/admin/super-session</code>
          </p>
        </div>
      </section>
    </div>

    <!-- Error display -->
    <div v-if="error" class="error-banner">
      ⚠️ {{ error }}
    </div>
  </div>
</template>

<style scoped>
.super-session {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
}

.page-header p {
  margin: 0;
  color: #64748b;
  flex: 1;
}

.refresh-btn {
  padding: 8px 16px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.session-layout {
  display: grid;
  grid-template-columns: 350px 300px 1fr;
  gap: 24px;
  min-height: 600px;
}

.tier {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  overflow: auto;
}

.tier h2 {
  margin: 0 0 16px;
  font-size: 16px;
  color: #374151;
}

.discussion-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading, .empty {
  text-align: center;
  color: #94a3b8;
  padding: 24px;
}

/* Tier 2 - Rounds */
.discussion-info {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 16px;
}

.discussion-info h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  background: #e2e8f0;
  color: #475569;
}

.status.pending_human {
  background: #fef3c7;
  color: #d97706;
}

.status.reviewing {
  background: #ede9fe;
  color: #7c3aed;
}

.status.resolved {
  background: #dcfce7;
  color: #16a34a;
}

.rounds-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.round-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.round-item:hover {
  background: #f1f5f9;
}

.round-item.selected {
  background: #eff6ff;
  border-color: #3b82f6;
}

.round-item.current {
  border-left: 3px solid #3b82f6;
}

.round-number {
  font-weight: 600;
}

.comment-count {
  font-size: 12px;
  color: #64748b;
}

.current-badge {
  margin-left: auto;
  font-size: 10px;
  padding: 2px 6px;
  background: #3b82f6;
  color: white;
  border-radius: 4px;
}

/* Tier 3 - Details */
.human-input-section {
  margin-top: 24px;
  padding: 16px;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 8px;
}

.human-input-section h4 {
  margin: 0 0 12px;
  font-size: 14px;
}

.human-input-section textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.submit-btn {
  padding: 10px 20px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: #d97706;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hint {
  font-size: 12px;
  color: #92400e;
}

.ai-link-info {
  margin-top: 24px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 6px;
  font-size: 13px;
}

.ai-link-info code {
  background: #e0f2fe;
  padding: 2px 6px;
  border-radius: 4px;
}

.error-banner {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
}

/* Responsive */
@media (max-width: 1200px) {
  .session-layout {
    grid-template-columns: 1fr;
  }

  .tier {
    max-height: 400px;
  }
}
</style>
