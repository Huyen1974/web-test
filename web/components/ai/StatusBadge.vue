<script setup lang="ts">
/**
 * StatusBadge Component
 * Displays discussion status with icon and color
 */
const props = defineProps<{
  status: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}>()

const statusConfig: Record<string, { icon: string; label: string; color: string }> = {
  drafting: { icon: '📝', label: 'Dang soan', color: 'bg-gray-100 text-gray-700' },
  pending_human: { icon: '⏳', label: 'Cho duyet', color: 'bg-yellow-100 text-yellow-700' },
  reviewing: { icon: '🔍', label: 'Dang review', color: 'bg-blue-100 text-blue-700' },
  approving: { icon: '✍️', label: 'Cho phe duyet', color: 'bg-purple-100 text-purple-700' },
  resolved: { icon: '✅', label: 'Hoan thanh', color: 'bg-green-100 text-green-700' },
  rejected: { icon: '❌', label: 'Tu choi', color: 'bg-red-100 text-red-700' },
  archived: { icon: '📦', label: 'Da luu tru', color: 'bg-gray-200 text-gray-500' },
  stalled_error: { icon: '🚨', label: 'AI that bai', color: 'bg-red-200 text-red-800' }
}

const config = computed(() => statusConfig[props.status] || statusConfig.drafting)

const sizeClass = computed(() => ({
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base'
}[props.size || 'sm']))
</script>

<template>
  <span :class="['inline-flex items-center gap-1 rounded-full font-medium', sizeClass, config.color]">
    {{ config.icon }} {{ config.label }}
  </span>
</template>
