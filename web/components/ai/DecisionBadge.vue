<script setup lang="ts">
/**
 * DecisionBadge Component
 * Shows review decision type
 */
const props = defineProps<{
  decision: string
  size?: 'xs' | 'sm' | 'md'
}>()

const decisionConfig: Record<string, { label: string; color: string }> = {
  approve: { label: 'Dong y', color: 'bg-green-100 text-green-700' },
  request_changes: { label: 'Can sua', color: 'bg-orange-100 text-orange-700' },
  comment: { label: 'Gop y', color: 'bg-blue-100 text-blue-700' },
  reject: { label: 'Tu choi', color: 'bg-red-100 text-red-700' },
  redirect: { label: 'Chuyen lai', color: 'bg-yellow-100 text-yellow-700' }
}

const config = computed(() => decisionConfig[props.decision] || { label: props.decision, color: 'bg-gray-100 text-gray-700' })

const sizeClass = computed(() => ({
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm'
}[props.size || 'sm']))
</script>

<template>
  <span :class="['rounded-full font-medium', sizeClass, config.color]">
    {{ config.label }}
  </span>
</template>
