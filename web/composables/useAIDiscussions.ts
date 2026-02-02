/**
 * Composable for AI Discussion System
 * WEB-39: Super Session - 3-tier discussion management
 */

type DiscussionStatus = 'drafting' | 'pending_human' | 'reviewing' | 'approving' | 'resolved' | 'rejected' | 'archived' | 'stalled_error';

interface AIDiscussion {
  id: string;
  topic: string;
  description?: string;
  drafter_id: any;
  reviewers: string[];
  approver_id: any;
  status: DiscussionStatus;
  round: number;
  max_rounds: number;
  draft_content?: string;
  final_content?: string;
  human_comment?: string;
  linked_feedback_id?: string;
  locked_by_user?: boolean;
  archived_at?: string;
  archive_reason?: string;
  date_created: string;
  date_updated: string;
}

interface AIDiscussionComment {
  id: string;
  discussion_id: string;
  author_id: any;
  comment_type: 'draft' | 'review' | 'approval' | 'human' | 'human_supreme';
  content: string;
  round: number;
  decision?: 'approve' | 'request_changes' | 'comment' | 'reject' | 'redirect';
  date_created: string;
}

export const useAIDiscussions = () => {
  // Use Nuxt proxy to avoid CORS issues (WEB-46)
  // All browser calls go through /api/directus/* which proxies to Directus
  const proxyUrl = '/api/directus';

  const discussions = ref<AIDiscussion[]>([]);
  const currentDiscussion = ref<AIDiscussion | null>(null);
  const comments = ref<AIDiscussionComment[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // S8: AI Working State
  const isAiWorking = ref(false);
  const aiWorkingAgent = ref<{ type: string; name: string } | null>(null);

  /**
   * Fetch all discussions (Tier 1 - Cases List)
   */
  const fetchDiscussions = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `${proxyUrl}/items/ai_discussions?sort=-date_updated&fields=*,drafter_id.first_name,drafter_id.last_name,approver_id.first_name,approver_id.last_name`
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      discussions.value = data.data || [];
      return discussions.value;
    } catch (e) {
      error.value = (e as Error).message;
      return [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * Fetch single discussion with details (Tier 2 - Rounds)
   */
  const fetchDiscussion = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `${proxyUrl}/items/ai_discussions/${id}?fields=*,drafter_id.*,approver_id.*`
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      currentDiscussion.value = data.data;
      return currentDiscussion.value;
    } catch (e) {
      error.value = (e as Error).message;
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Fetch comments for a discussion (Tier 3 - Details)
   */
  const fetchComments = async (discussionId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `${proxyUrl}/items/ai_discussion_comments?filter[discussion_id][_eq]=${discussionId}&sort=round,date_created&fields=*,author_id.first_name,author_id.last_name,author_id.email`
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      comments.value = data.data || [];
      return comments.value;
    } catch (e) {
      error.value = (e as Error).message;
      return [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * Submit human comment (stops auto-approval timer)
   */
  const submitHumanComment = async (discussionId: string, content: string, token: string) => {
    loading.value = true;
    error.value = null;

    try {
      // Update discussion with human_comment
      const updateResponse = await fetch(
        `${proxyUrl}/items/ai_discussions/${discussionId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            human_comment: content
          })
        }
      );

      if (!updateResponse.ok) throw new Error(`Update failed: HTTP ${updateResponse.status}`);

      // Create comment record
      const commentResponse = await fetch(
        `${proxyUrl}/items/ai_discussion_comments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            discussion_id: discussionId,
            comment_type: 'human',
            content: content,
            round: currentDiscussion.value?.round || 1
          })
        }
      );

      if (!commentResponse.ok) throw new Error(`Comment failed: HTTP ${commentResponse.status}`);

      // Refresh data
      await fetchDiscussion(discussionId);
      await fetchComments(discussionId);

      return true;
    } catch (e) {
      error.value = (e as Error).message;
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Submit Supreme Authority decision (WEB-40)
   * User decision overrides all AI consensus
   */
  const submitHumanDecision = async (
    discussionId: string,
    content: string,
    decision: 'approve' | 'reject' | 'redirect' | 'comment'
  ) => {
    loading.value = true;
    error.value = null;

    try {
      // Determine new status based on decision
      let newStatus: AIDiscussion['status'] | null = null;
      let shouldLock = false;

      switch (decision) {
        case 'approve':
          newStatus = 'resolved';
          shouldLock = true;
          break;
        case 'reject':
          newStatus = 'rejected';
          shouldLock = true;
          break;
        case 'redirect':
          newStatus = 'drafting';
          shouldLock = false;
          break;
        case 'comment':
          newStatus = null;
          shouldLock = false;
          break;
      }

      // Create human_supreme comment
      const commentResponse = await fetch(
        `${proxyUrl}/items/ai_discussion_comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            discussion_id: discussionId,
            comment_type: 'human_supreme',
            content: `**QUYET DINH CUA USER (SUPREME AUTHORITY)**\n\n${content}`,
            round: currentDiscussion.value?.round || 1,
            decision: decision
          })
        }
      );

      if (!commentResponse.ok) throw new Error(`Comment failed: HTTP ${commentResponse.status}`);

      // Update discussion status and lock if needed
      const updatePayload: Record<string, any> = {
        human_comment: content
      };

      if (newStatus) {
        updatePayload.status = newStatus;
      }

      if (shouldLock) {
        updatePayload.locked_by_user = true;
      }

      // Increment round for redirect
      if (decision === 'redirect' && currentDiscussion.value) {
        updatePayload.round = currentDiscussion.value.round + 1;
      }

      const updateResponse = await fetch(
        `${proxyUrl}/items/ai_discussions/${discussionId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        }
      );

      if (!updateResponse.ok) throw new Error(`Update failed: HTTP ${updateResponse.status}`);

      // Refresh data
      await fetchDiscussion(discussionId);
      await fetchComments(discussionId);

      console.log(`[SUPREME AUTHORITY] User decision: ${decision} on discussion ${discussionId}`);
      return true;
    } catch (e) {
      error.value = (e as Error).message;
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Update discussion status
   */
  const updateStatus = async (discussionId: string, status: AIDiscussion['status'], token: string) => {
    try {
      const response = await fetch(
        `${proxyUrl}/items/ai_discussions/${discussionId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      await fetchDiscussion(discussionId);
      return true;
    } catch (e) {
      error.value = (e as Error).message;
      return false;
    }
  };

  /**
   * Archive discussion (S9)
   * Soft delete - moves to archived state instead of hard delete
   */
  const archiveDiscussion = async (discussionId: string, reason?: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await $fetch('/api/agent-data/status', {
        method: 'PATCH',
        body: {
          discussion_id: discussionId,
          status: 'archived',
          archive_reason: reason || ''
        }
      });

      // Refresh discussions list
      await fetchDiscussions();

      console.log(`[ARCHIVE] Discussion ${discussionId} archived`);
      return true;
    } catch (e) {
      error.value = (e as Error).message;
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Activate Now (S4)
   * Skips the 5-minute timer and immediately processes the discussion
   */
  const activateNow = async (discussionId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await $fetch('/api/agent-data/activate-now', {
        method: 'POST',
        body: { discussion_id: discussionId }
      });

      // Refresh current discussion
      await fetchDiscussion(discussionId);
      await fetchComments(discussionId);

      console.log(`[ACTIVATE NOW] Discussion ${discussionId} activated immediately`);
      return true;
    } catch (e) {
      error.value = (e as Error).message;
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Set AI working state (S8)
   */
  const setAiWorking = (working: boolean, agent?: { type: string; name: string }) => {
    isAiWorking.value = working;
    aiWorkingAgent.value = working && agent ? agent : null;
  };

  /**
   * Group comments by round for Tier 2 display
   */
  const commentsByRound = computed(() => {
    const grouped: Record<number, AIDiscussionComment[]> = {};

    for (const comment of comments.value) {
      const round = comment.round || 1;
      if (!grouped[round]) grouped[round] = [];
      grouped[round].push(comment);
    }

    return grouped;
  });

  /**
   * Calculate countdown deadline (5 minutes from creation)
   */
  const getDeadline = (discussion: AIDiscussion) => {
    if (discussion.status !== 'pending_human') return null;

    const created = new Date(discussion.date_created);
    const deadline = new Date(created.getTime() + 5 * 60 * 1000);
    return deadline;
  };

  /**
   * Auto-refresh discussions (polling)
   */
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const startPolling = (intervalMs = 10000) => {
    stopPolling();
    pollInterval = setInterval(async () => {
      await fetchDiscussions();
      if (currentDiscussion.value) {
        await fetchComments(currentDiscussion.value.id);
      }
    }, intervalMs);
  };

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  // Cleanup on unmount
  onUnmounted(() => {
    stopPolling();
  });

  return {
    // State
    discussions,
    currentDiscussion,
    comments,
    loading,
    error,
    isAiWorking,
    aiWorkingAgent,

    // Computed
    commentsByRound,

    // Methods
    fetchDiscussions,
    fetchDiscussion,
    fetchComments,
    submitHumanComment,
    submitHumanDecision,
    updateStatus,
    archiveDiscussion,
    activateNow,
    setAiWorking,
    getDeadline,
    startPolling,
    stopPolling
  };
};
