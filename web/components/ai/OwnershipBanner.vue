<script setup lang="ts">
/**
 * OwnershipBanner Component (S3)
 * Visual indicator showing who currently owns the discussion
 * with health status based on elapsed time
 */

interface Owner {
  type: 'drafter' | 'reviewer' | 'approver' | 'human' | 'system'
  id?: string
  name?: string
  email?: string
}

interface Props {
  status: string
  drafter?: any
  approver?: any
  dateUpdated?: string
}

const props = defineProps<Props>()

const ownerConfig: Record<string, { type: Owner['type']; label: string; icon: string }> = {
  drafting: { type: 'drafter', label: 'AI Drafter', icon: '🤖' },
  reviewing: { type: 'reviewer', label: 'AI Reviewer', icon: '🔍' },
  approving: { type: 'approver', label: 'AI Approver', icon: '✍️' },
  pending_human: { type: 'human', label: 'User (Ban)', icon: '👑' },
  resolved: { type: 'system', label: 'He thong', icon: '✅' },
  rejected: { type: 'system', label: 'He thong', icon: '❌' },
  archived: { type: 'system', label: 'Da luu tru', icon: '📦' },
  stalled_error: { type: 'system', label: 'Loi he thong', icon: '🚨' }
}

const currentOwner = computed(() => {
  const config = ownerConfig[props.status] || { type: 'system', label: 'He thong', icon: '❓' }

  let name = config.label
  if (config.type === 'drafter' && props.drafter) {
    name = props.drafter.first_name || props.drafter.email?.split('@')[0] || config.label
  } else if (config.type === 'approver' && props.approver) {
    name = props.approver.first_name || props.approver.email?.split('@')[0] || config.label
  }

  return {
    type: config.type,
    label: name,
    icon: config.icon
  }
})

const elapsedMinutes = computed(() => {
  if (!props.dateUpdated) return 0
  const updated = new Date(props.dateUpdated)
  const now = new Date()
  return Math.floor((now.getTime() - updated.getTime()) / 60000)
})

const healthStatus = computed(() => {
  const elapsed = elapsedMinutes.value
  if (elapsed < 2) return { class: 'health-ok', emoji: '🟢', text: 'Binh thuong' }
  if (elapsed < 5) return { class: 'health-warning', emoji: '🟡', text: 'Cho lau' }
  return { class: 'health-error', emoji: '🔴', text: 'Qua han' }
})

const isActiveStatus = computed(() => {
  return ['drafting', 'reviewing', 'approving', 'pending_human'].includes(props.status)
})
</script>

<template>
  <div v-if="isActiveStatus" :class="['ownership-banner', healthStatus.class]">
    <div class="owner-info">
      <span class="owner-icon">{{ currentOwner.icon }}</span>
      <span class="waiting-label">Dang doi:</span>
      <span class="owner-name">{{ currentOwner.label }}</span>
    </div>

    <div class="health-info">
      <span class="health-emoji">{{ healthStatus.emoji }}</span>
      <span class="health-text">{{ healthStatus.text }}</span>
      <span class="elapsed-time">({{ elapsedMinutes }} phut)</span>
    </div>
  </div>
</template>

<style scoped>
.ownership-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 14px;
}

.health-ok {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border: 1px solid #10b981;
}

.health-warning {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 1px solid #f59e0b;
}

.health-error {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 1px solid #ef4444;
}

.owner-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.owner-icon {
  font-size: 18px;
}

.waiting-label {
  color: #64748b;
}

.owner-name {
  font-weight: 600;
  color: #1e293b;
}

.health-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.health-emoji {
  font-size: 14px;
}

.health-text {
  font-weight: 500;
  color: #475569;
}

.elapsed-time {
  color: #94a3b8;
  font-size: 12px;
}
</style>
