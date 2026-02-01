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
  submitHumanDecision,
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

// Submit human response (simple comment)
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

// Submit Supreme Authority decision
const handleSupremeDecision = async (decision: 'approve' | 'reject' | 'redirect' | 'comment') => {
  if (!selectedDiscussionId.value) return;

  submitting.value = true;

  const content = humanInput.value.trim() || getDefaultMessage(decision);

  const success = await submitHumanDecision(
    selectedDiscussionId.value,
    content,
    decision
  );

  if (success) {
    humanInput.value = '';
    await refresh();
  }

  submitting.value = false;
};

// Get default message for decision type
const getDefaultMessage = (decision: string): string => {
  switch (decision) {
    case 'approve': return 'Phê duyệt bởi User (Supreme Authority)';
    case 'reject': return 'Từ chối bởi User (Supreme Authority)';
    case 'redirect': return 'Yêu cầu sửa đổi bởi User (Supreme Authority)';
    default: return 'Bình luận từ User';
  }
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

        <!-- Supreme Authority User Input -->
        <div v-if="currentDiscussion && !currentDiscussion.locked_by_user" class="supreme-authority-section">
          <div class="authority-header">
            <span class="authority-badge">SUPREME AUTHORITY</span>
            <span class="authority-hint">Y kien cua ban se override moi quyet dinh AI</span>
          </div>

          <textarea
            v-model="humanInput"
            class="authority-input"
            rows="4"
            placeholder="Nhap y kien cua ban... (Quyen cao nhat - AI se tuan theo)"
          ></textarea>

          <div class="decision-buttons">
            <button
              @click="handleSupremeDecision('approve')"
              :disabled="submitting"
              class="btn-approve"
            >
              Phe duyet & Dong
            </button>
            <button
              @click="handleSupremeDecision('reject')"
              :disabled="submitting"
              class="btn-reject"
            >
              Tu choi
            </button>
            <button
              @click="handleSupremeDecision('redirect')"
              :disabled="submitting"
              class="btn-redirect"
            >
              Yeu cau sua doi
            </button>
            <button
              @click="handleSupremeDecision('comment')"
              :disabled="submitting"
              class="btn-comment"
            >
              Binh luan (AI tiep tuc)
            </button>
          </div>

          <p class="authority-note">
            Luu y: Phe duyet/Tu choi se KHOA discussion - AI khong the thay doi sau do.
          </p>
        </div>

        <!-- Locked indicator -->
        <div v-if="currentDiscussion?.locked_by_user" class="locked-notice">
          <span class="lock-icon">🔒</span>
          <span>Discussion da bi khoa boi User - Khong the thay doi</span>
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

/* Supreme Authority Section */
.supreme-authority-section {
  margin-top: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
  border-radius: 12px;
}

.authority-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.authority-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  font-weight: 700;
  font-size: 12px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
}

.authority-hint {
  font-size: 13px;
  color: #92400e;
}

.authority-input {
  width: 100%;
  padding: 14px;
  border: 2px solid #fbbf24;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  background: white;
}

.authority-input:focus {
  outline: none;
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
}

.decision-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.decision-buttons button {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.decision-buttons button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-approve {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.btn-approve:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.btn-reject {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.btn-reject:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-redirect {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.btn-redirect:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

.btn-comment {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.btn-comment:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.authority-note {
  margin-top: 12px;
  font-size: 12px;
  color: #92400e;
  font-style: italic;
}

.locked-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 24px;
  padding: 16px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-weight: 500;
}

.lock-icon {
  font-size: 20px;
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
