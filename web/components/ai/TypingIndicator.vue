<script setup lang="ts">
/**
 * TypingIndicator Component (S8)
 * Animated indicator showing AI is currently working
 */

interface Agent {
  type?: string
  name?: string
  email?: string
}

interface Props {
  agent?: Agent
  isTyping: boolean
}

const props = defineProps<Props>()

const agentName = computed(() => {
  if (!props.agent) return 'AI'
  return props.agent.name || props.agent.email?.split('@')[0] || 'AI'
})

const agentEmoji = computed(() => {
  const type = props.agent?.type || 'default'
  const emojiMap: Record<string, string> = {
    drafter: '🤖',
    reviewer: '🔍',
    approver: '✍️',
    default: '🤖'
  }
  return emojiMap[type] || emojiMap.default
})
</script>

<template>
  <div v-if="isTyping" class="typing-indicator">
    <span class="agent-emoji">{{ agentEmoji }}</span>
    <span class="typing-text">{{ agentName }} dang soan thao</span>
    <span class="typing-dots">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </span>
  </div>
</template>

<style scoped>
.typing-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 20px;
  font-size: 13px;
  color: #475569;
}

.agent-emoji {
  font-size: 16px;
}

.typing-text {
  font-weight: 500;
}

.typing-dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 2px;
}

.dot {
  width: 6px;
  height: 6px;
  background: #64748b;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

.dot:nth-child(3) {
  animation-delay: 0s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
