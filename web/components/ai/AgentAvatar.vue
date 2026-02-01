<script setup lang="ts">
/**
 * AgentAvatar Component
 * Shows agent icon based on type
 */
const props = defineProps<{
  agent: any
  size?: 'sm' | 'md' | 'lg'
}>()

const agentConfig: Record<string, { emoji: string; bg: string }> = {
  chatgpt: { emoji: '🤖', bg: 'bg-green-100' },
  gemini: { emoji: '💎', bg: 'bg-blue-100' },
  claude: { emoji: '🧠', bg: 'bg-purple-100' },
  codex: { emoji: '⚡', bg: 'bg-yellow-100' },
  antigravity: { emoji: '🚀', bg: 'bg-orange-100' },
  human: { emoji: '👤', bg: 'bg-gray-200' },
  supreme: { emoji: '👑', bg: 'bg-yellow-200' },
  default: { emoji: '🤖', bg: 'bg-gray-100' }
}

const getAgentType = (agent: any): string => {
  if (!agent) return 'default'
  const email = typeof agent === 'string' ? agent : agent.email || ''
  const lower = email.toLowerCase()
  for (const key of Object.keys(agentConfig)) {
    if (lower.includes(key)) return key
  }
  if (lower.includes('nmhuyen') || lower.includes('admin')) return 'human'
  return 'default'
}

const config = computed(() => agentConfig[getAgentType(props.agent)])

const sizeClass = computed(() => ({
  sm: 'w-6 h-6 text-sm',
  md: 'w-8 h-8 text-base',
  lg: 'w-10 h-10 text-lg'
}[props.size || 'md']))
</script>

<template>
  <div :class="['rounded-full flex items-center justify-center', sizeClass, config.bg]">
    {{ config.emoji }}
  </div>
</template>
