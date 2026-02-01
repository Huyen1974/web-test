<script setup lang="ts">
/**
 * DiscussionThread Component
 * Displays conversation thread with AI and Human comments
 */

interface Comment {
  id: string;
  author_id: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  comment_type: 'draft' | 'review' | 'approval' | 'human' | 'human_supreme';
  content: string;
  round: number;
  decision?: 'approve' | 'request_changes' | 'comment' | 'reject' | 'redirect';
  date_created: string;
}

defineProps<{
  comments: Comment[];
  currentRound: number;
}>();

const getAuthorName = (author: Comment['author_id']) => {
  if (!author) return 'Unknown';
  return `${author.first_name || ''} ${author.last_name || ''}`.trim() || author.email;
};

const getAuthorAvatar = (comment: Comment) => {
  if (comment.comment_type === 'human_supreme') return '👑';
  if (comment.comment_type === 'human') return '👤';

  const email = comment.author_id?.email || '';
  if (email.includes('chatgpt')) return '🤖';
  if (email.includes('gemini')) return '💎';
  if (email.includes('claude')) return '🧠';
  if (email.includes('codex')) return '⚡';
  if (email.includes('antigravity')) return '🚀';
  return '🤖';
};

const getDecisionBadge = (decision?: string) => {
  switch (decision) {
    case 'approve': return { text: 'Dong y', class: 'approve' };
    case 'request_changes': return { text: 'Can sua', class: 'changes' };
    case 'comment': return { text: 'Gop y', class: 'comment' };
    case 'reject': return { text: 'Tu choi', class: 'reject' };
    case 'redirect': return { text: 'Yeu cau sua', class: 'redirect' };
    default: return null;
  }
};

const getTypeLabel = (type: Comment['comment_type']) => {
  switch (type) {
    case 'draft': return 'Ban thao';
    case 'review': return 'Phan bien';
    case 'approval': return 'Phe duyet';
    case 'human': return 'Con nguoi';
    case 'human_supreme': return 'SUPREME AUTHORITY';
    default: return type;
  }
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};
</script>

<template>
  <div class="discussion-thread">
    <div v-for="comment in comments" :key="comment.id" class="comment-item" :class="comment.comment_type">
      <div class="comment-avatar">
        {{ getAuthorAvatar(comment) }}
      </div>
      <div class="comment-body">
        <div class="comment-header">
          <span class="author-name">{{ getAuthorName(comment.author_id) }}</span>
          <span class="comment-type">{{ getTypeLabel(comment.comment_type) }}</span>
          <span v-if="comment.round" class="round-badge">R{{ comment.round }}</span>
          <span v-if="getDecisionBadge(comment.decision)"
                class="decision-badge"
                :class="getDecisionBadge(comment.decision)?.class">
            {{ getDecisionBadge(comment.decision)?.text }}
          </span>
          <span class="timestamp">{{ formatTime(comment.date_created) }}</span>
        </div>
        <div class="comment-content" v-html="comment.content"></div>
      </div>
    </div>

    <div v-if="comments.length === 0" class="no-comments">
      Chưa có thảo luận trong vòng này.
    </div>
  </div>
</template>

<style scoped>
.discussion-thread {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 3px solid #e2e8f0;
}

.comment-item.draft {
  border-left-color: #3b82f6;
  background: #eff6ff;
}

.comment-item.review {
  border-left-color: #8b5cf6;
  background: #f5f3ff;
}

.comment-item.approval {
  border-left-color: #10b981;
  background: #ecfdf5;
}

.comment-item.human {
  border-left-color: #f59e0b;
  background: #fffbeb;
}

.comment-item.human_supreme {
  border-left-color: #d97706;
  border-left-width: 4px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
}

.comment-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.author-name {
  font-weight: 600;
  color: #1e293b;
}

.comment-type {
  font-size: 12px;
  padding: 2px 8px;
  background: #e2e8f0;
  border-radius: 4px;
  color: #64748b;
}

.round-badge {
  font-size: 11px;
  padding: 2px 6px;
  background: #0ea5e9;
  color: white;
  border-radius: 4px;
  font-weight: 500;
}

.decision-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.decision-badge.approve {
  background: #dcfce7;
  color: #16a34a;
}

.decision-badge.changes {
  background: #fee2e2;
  color: #dc2626;
}

.decision-badge.comment {
  background: #e0e7ff;
  color: #4f46e5;
}

.decision-badge.reject {
  background: #fee2e2;
  color: #dc2626;
}

.decision-badge.redirect {
  background: #fef3c7;
  color: #d97706;
}

.timestamp {
  font-size: 12px;
  color: #94a3b8;
  margin-left: auto;
}

.comment-content {
  color: #334155;
  line-height: 1.6;
  white-space: pre-wrap;
}

.no-comments {
  text-align: center;
  color: #94a3b8;
  padding: 24px;
  font-style: italic;
}
</style>
