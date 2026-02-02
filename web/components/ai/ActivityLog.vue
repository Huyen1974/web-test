<script setup lang="ts">
/**
 * ActivityLog Component (S7)
 * Collapsible panel showing system activity log for a discussion
 */

interface ActivityLogEntry {
  id: string
  timestamp: string
  type: 'status_change' | 'ai_response' | 'human_action' | 'timer_event' | 'error' | 'system'
  message: string
  actor?: string
  metadata?: Record<string, any>
}

interface Props {
  discussionId: string
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  limit: 20
})

const config = useRuntimeConfig()
const directusUrl = config.public.directusUrl || 'https://directus-test-pfne2mqwja-as.a.run.app'

const isExpanded = ref(false)
const activities = ref<ActivityLogEntry[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const typeConfig: Record<string, { icon: string; color: string }> = {
  status_change: { icon: '🔄', color: 'text-blue-600' },
  ai_response: { icon: '🤖', color: 'text-purple-600' },
  human_action: { icon: '👤', color: 'text-green-600' },
  timer_event: { icon: '⏱️', color: 'text-yellow-600' },
  error: { icon: '⚠️', color: 'text-red-600' },
  system: { icon: '⚙️', color: 'text-gray-600' }
}

const fetchActivities = async () => {
  if (!props.discussionId) return

  loading.value = true
  error.value = null

  try {
    // Fetch from Directus activity log
    const response = await fetch(
      `${directusUrl}/activity?filter[collection][_eq]=ai_discussions&filter[item][_eq]=${props.discussionId}&sort=-timestamp&limit=${props.limit}`
    )

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = await response.json()
    const rawActivities = data.data || []

    // Transform Directus activities to our format
    activities.value = rawActivities.map((activity: any) => ({
      id: activity.id,
      timestamp: activity.timestamp,
      type: mapActivityType(activity.action),
      message: formatActivityMessage(activity),
      actor: activity.user?.email || 'System',
      metadata: activity.revisions
    }))
  } catch (e) {
    error.value = (e as Error).message
    // Fallback to empty array with placeholder
    activities.value = []
  } finally {
    loading.value = false
  }
}

const mapActivityType = (action: string): ActivityLogEntry['type'] => {
  switch (action) {
    case 'update':
      return 'status_change'
    case 'create':
      return 'system'
    case 'delete':
      return 'error'
    default:
      return 'system'
  }
}

const formatActivityMessage = (activity: any): string => {
  switch (activity.action) {
    case 'create':
      return 'Discussion duoc tao'
    case 'update':
      return 'Discussion duoc cap nhat'
    case 'delete':
      return 'Discussion bi xoa'
    default:
      return activity.action || 'Hoat dong khong xac dinh'
  }
}

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  })
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  if (isExpanded.value && activities.value.length === 0) {
    fetchActivities()
  }
}

// Watch for discussion changes
watch(() => props.discussionId, () => {
  if (isExpanded.value) {
    fetchActivities()
  }
})
</script>

<template>
  <div class="activity-log">
    <button @click="toggleExpanded" class="toggle-button">
      <span class="toggle-icon">{{ isExpanded ? '▼' : '▶' }}</span>
      <span class="toggle-label">📋 Nhat ky hoat dong</span>
      <span v-if="activities.length > 0" class="activity-count">
        ({{ activities.length }})
      </span>
    </button>

    <div v-if="isExpanded" class="activity-content">
      <div v-if="loading" class="loading-state">
        Dang tai...
      </div>

      <div v-else-if="error" class="error-state">
        Loi: {{ error }}
      </div>

      <div v-else-if="activities.length === 0" class="empty-state">
        Chua co hoat dong nao
      </div>

      <div v-else class="activity-list">
        <div
          v-for="activity in activities"
          :key="activity.id"
          class="activity-item"
        >
          <span :class="['activity-icon', typeConfig[activity.type]?.color]">
            {{ typeConfig[activity.type]?.icon || '📝' }}
          </span>
          <div class="activity-details">
            <span class="activity-message">{{ activity.message }}</span>
            <span class="activity-meta">
              {{ activity.actor }} - {{ formatTimestamp(activity.timestamp) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.activity-log {
  border-top: 1px solid #e2e8f0;
  margin-top: 16px;
}

.toggle-button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 0;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #64748b;
  transition: color 0.2s;
}

.toggle-button:hover {
  color: #1e293b;
}

.toggle-icon {
  font-size: 10px;
  color: #94a3b8;
}

.toggle-label {
  font-weight: 500;
}

.activity-count {
  font-size: 12px;
  color: #94a3b8;
}

.activity-content {
  padding-bottom: 12px;
}

.loading-state,
.error-state,
.empty-state {
  padding: 12px;
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
}

.error-state {
  color: #ef4444;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
}

.activity-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.activity-details {
  flex: 1;
  min-width: 0;
}

.activity-message {
  display: block;
  font-size: 13px;
  color: #334155;
}

.activity-meta {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}
</style>
