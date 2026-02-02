<script setup lang="ts">
/**
 * Super Session - AI Discussion Center
 * WEB-42: Complete 3-column Outlook-style layout
 *
 * Layout:
 * - Left (20%): Discussion list with categories
 * - Middle (25%): Thread/comments list
 * - Right (55%): Detail panel with Supreme Authority input
 */

definePageMeta({
  layout: 'default'
})

// Use Nuxt proxy to avoid CORS issues (WEB-46)
const proxyUrl = '/api/directus'

// State
const discussions = ref<any[]>([])
const agents = ref<any[]>([])
const selectedDiscussionId = ref<number | null>(null)
const selectedCommentId = ref<number | null>(null)
const discussionComments = ref<any[]>([])
const isLoading = ref(false)
const showCreateModal = ref(false)

// Computed
const selectedDiscussion = computed(() =>
  discussions.value.find(d => d.id === selectedDiscussionId.value)
)

const selectedComment = computed(() =>
  discussionComments.value.find(c => c.id === selectedCommentId.value)
)

// API Functions
const fetchDiscussions = async () => {
  isLoading.value = true
  try {
    const response = await $fetch(`${proxyUrl}/items/ai_discussions`, {
      params: {
        sort: '-date_updated',
        fields: '*,drafter_id.first_name,drafter_id.last_name,drafter_id.email',
        limit: 50
      }
    })
    discussions.value = (response as any).data || []
  } catch (e) {
    console.error('Failed to fetch discussions:', e)
  } finally {
    isLoading.value = false
  }
}

const fetchComments = async (discussionId: number) => {
  try {
    const response = await $fetch(`${proxyUrl}/items/ai_discussion_comments`, {
      params: {
        'filter[discussion_id][_eq]': discussionId,
        sort: 'round,date_created',
        fields: '*,author_id.first_name,author_id.last_name,author_id.email'
      }
    })
    discussionComments.value = (response as any).data || []
  } catch (e) {
    console.error('Failed to fetch comments:', e)
    discussionComments.value = []
  }
}

const fetchAgents = async () => {
  try {
    const response = await $fetch(`${proxyUrl}/users`, {
      params: {
        'filter[email][_contains]': 'agent.',
        fields: 'id,first_name,last_name,email'
      }
    })
    agents.value = ((response as any).data || []).map((u: any) => ({
      id: u.id,
      name: u.first_name || u.email?.split('@')[0] || 'Agent',
      email: u.email,
      role: getAgentRole(u.email)
    }))
  } catch (e) {
    console.error('Failed to fetch agents:', e)
  }
}

const getAgentRole = (email: string): string => {
  if (!email) return 'Agent'
  if (email.includes('gemini')) return 'Supervisor'
  if (email.includes('chatgpt')) return 'Assistant'
  if (email.includes('claude')) return 'Developer'
  if (email.includes('codex')) return 'Executor'
  if (email.includes('antigravity')) return 'Knowledge'
  return 'Agent'
}

// Event Handlers
const selectDiscussion = async (id: number) => {
  selectedDiscussionId.value = id
  selectedCommentId.value = null
  await fetchComments(id)
}

const selectComment = (id: number) => {
  selectedCommentId.value = id
}

const handleDecision = async (decision: string, content: string) => {
  if (!selectedDiscussionId.value) return

  try {
    const currentRound = selectedDiscussion.value?.round || 1

    // 1. Create human_supreme comment
    await $fetch(`${proxyUrl}/items/ai_discussion_comments`, {
      method: 'POST',
      body: {
        discussion_id: selectedDiscussionId.value,
        comment_type: 'human_supreme',
        content: `👑 **QUYET DINH CUA USER:**\n\n${content || 'No comment'}`,
        round: currentRound,
        decision: decision
      }
    })

    // 2. Update discussion status
    const updateData: any = { human_comment: content }

    switch (decision) {
      case 'approve':
        updateData.status = 'resolved'
        updateData.locked_by_user = true
        break
      case 'reject':
        updateData.status = 'rejected'
        updateData.locked_by_user = true
        break
      case 'redirect':
        updateData.status = 'drafting'
        updateData.round = currentRound + 1
        break
    }

    await $fetch(`${proxyUrl}/items/ai_discussions/${selectedDiscussionId.value}`, {
      method: 'PATCH',
      body: updateData
    })

    // Refresh data
    await fetchDiscussions()
    await fetchComments(selectedDiscussionId.value)

  } catch (e) {
    console.error('Failed to submit decision:', e)
  }
}

const onDiscussionCreated = async (newDiscussion: any) => {
  await fetchDiscussions()
  if (newDiscussion?.id) {
    selectDiscussion(newDiscussion.id)
  }
  showCreateModal.value = false
}

// Polling for real-time updates
let pollInterval: ReturnType<typeof setInterval> | null = null

const startPolling = () => {
  pollInterval = setInterval(async () => {
    await fetchDiscussions()
    if (selectedDiscussionId.value) {
      await fetchComments(selectedDiscussionId.value)
    }
  }, 15000) // 15 seconds
}

// Initialize
onMounted(async () => {
  await Promise.all([
    fetchDiscussions(),
    fetchAgents()
  ])

  // Auto-select first discussion
  if (discussions.value.length > 0) {
    selectDiscussion(discussions.value[0].id)
  }

  startPolling()
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})
</script>

<template>
  <div class="super-session-container">
    <!-- Top Bar -->
    <header class="top-bar">
      <div class="top-bar-left">
        <h1 class="app-title">🎯 Super Session</h1>
        <span class="app-subtitle">AI Discussion Center</span>
      </div>
      <div class="top-bar-right">
        <span v-if="isLoading" class="loading-indicator">⟳ Loading...</span>
        <button @click="showCreateModal = true" class="create-btn">
          ➕ Tao vu viec moi
        </button>
      </div>
    </header>

    <!-- Main 3-Column Layout -->
    <div class="main-layout">
      <!-- Left Column: Discussion List (20%) -->
      <div class="column-left">
        <AiDiscussionSidebar
          :discussions="discussions"
          :selected-id="selectedDiscussionId"
          @select="selectDiscussion"
        />
      </div>

      <!-- Middle Column: Thread List (25%) -->
      <div class="column-middle">
        <AiThreadList
          :discussion="selectedDiscussion"
          :comments="discussionComments"
          :selected-comment-id="selectedCommentId"
          @select-comment="selectComment"
        />
      </div>

      <!-- Right Column: Detail Panel (55%) -->
      <div class="column-right">
        <AiDetailPanel
          :discussion="selectedDiscussion"
          :selected-comment="selectedComment"
          @submit-decision="handleDecision"
        />
      </div>
    </div>

    <!-- Create Discussion Modal -->
    <AiCreateDiscussionModal
      v-if="showCreateModal"
      :agents="agents"
      @close="showCreateModal = false"
      @created="onDiscussionCreated"
    />
  </div>
</template>

<style scoped>
.super-session-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
}

.top-bar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #1e293b;
}

.app-subtitle {
  font-size: 14px;
  color: #64748b;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.loading-indicator {
  font-size: 14px;
  color: #64748b;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.create-btn {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.create-btn:hover {
  background: #2563eb;
}

.main-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.column-left {
  width: 20%;
  min-width: 200px;
  max-width: 300px;
}

.column-middle {
  width: 25%;
  min-width: 250px;
  max-width: 350px;
}

.column-right {
  flex: 1;
}

/* Responsive */
@media (max-width: 1024px) {
  .main-layout {
    flex-direction: column;
  }

  .column-left,
  .column-middle,
  .column-right {
    width: 100%;
    max-width: none;
    height: 33vh;
  }
}
</style>
