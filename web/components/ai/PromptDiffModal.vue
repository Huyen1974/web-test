<script setup lang="ts">
/**
 * PromptDiffModal Component (S6)
 * Side-by-side comparison of prompt versions
 */

interface PromptVersion {
  version: number
  content: string
  changes_summary?: string
  date_created: string
  author?: string
}

interface Props {
  isOpen: boolean
  discussionId: string
  versions?: PromptVersion[]
}

const props = withDefaults(defineProps<Props>(), {
  versions: () => []
})

const emit = defineEmits<{
  close: []
}>()

const selectedOldVersion = ref<number>(1)
const selectedNewVersion = ref<number>(2)

const oldPrompt = computed(() => {
  const version = props.versions.find(v => v.version === selectedOldVersion.value)
  return version?.content || ''
})

const newPrompt = computed(() => {
  const version = props.versions.find(v => v.version === selectedNewVersion.value)
  return version?.content || ''
})

const changesSummary = computed(() => {
  const version = props.versions.find(v => v.version === selectedNewVersion.value)
  return version?.changes_summary || 'Khong co mo ta thay doi'
})

const versionOptions = computed(() => {
  return props.versions.map(v => ({
    value: v.version,
    label: `Vong ${v.version} - ${formatDate(v.date_created)}`
  }))
})

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Simple diff highlighting (word-level)
const highlightDiff = (oldText: string, newText: string, isNew: boolean) => {
  const oldWords = oldText.split(/\s+/)
  const newWords = newText.split(/\s+/)

  if (isNew) {
    return newWords.map((word, i) => {
      const isChanged = oldWords[i] !== word
      return isChanged ? `<span class="diff-added">${word}</span>` : word
    }).join(' ')
  } else {
    return oldWords.map((word, i) => {
      const isChanged = newWords[i] !== word
      return isChanged ? `<span class="diff-removed">${word}</span>` : word
    }).join(' ')
  }
}

const handleClose = () => {
  emit('close')
}

// Set initial versions when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.versions.length >= 2) {
    selectedOldVersion.value = props.versions[props.versions.length - 2]?.version || 1
    selectedNewVersion.value = props.versions[props.versions.length - 1]?.version || 2
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="handleClose">
      <div class="modal-container">
        <!-- Header -->
        <div class="modal-header">
          <h2 class="modal-title">📊 So sanh Prompt Versions</h2>
          <button @click="handleClose" class="close-button">✕</button>
        </div>

        <!-- Version Selectors -->
        <div class="version-selectors">
          <div class="version-select">
            <label>Phien ban cu:</label>
            <select v-model="selectedOldVersion">
              <option
                v-for="opt in versionOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
          <span class="arrow">→</span>
          <div class="version-select">
            <label>Phien ban moi:</label>
            <select v-model="selectedNewVersion">
              <option
                v-for="opt in versionOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Diff Content -->
        <div class="diff-container">
          <div class="diff-column old-version">
            <h4>📄 Vong {{ selectedOldVersion }}</h4>
            <pre class="diff-content" v-html="highlightDiff(oldPrompt, newPrompt, false)"></pre>
          </div>
          <div class="diff-column new-version">
            <h4>📄 Vong {{ selectedNewVersion }}</h4>
            <pre class="diff-content" v-html="highlightDiff(oldPrompt, newPrompt, true)"></pre>
          </div>
        </div>

        <!-- Changes Summary -->
        <div class="changes-summary">
          <strong>🔍 AI mo ta thay doi:</strong>
          <p>{{ changesSummary }}</p>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button @click="handleClose" class="btn-close">Dong</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.close-button {
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  color: #64748b;
  transition: all 0.2s;
}

.close-button:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.version-selectors {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.version-select {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.version-select label {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}

.version-select select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  background: white;
  min-width: 200px;
}

.arrow {
  font-size: 20px;
  color: #94a3b8;
  margin-top: 18px;
}

.diff-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px 20px;
  flex: 1;
  overflow: hidden;
}

.diff-column {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.diff-column h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.old-version h4 {
  color: #dc2626;
}

.new-version h4 {
  color: #16a34a;
}

.diff-content {
  flex: 1;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-y: auto;
  max-height: 300px;
  margin: 0;
  font-family: inherit;
}

.diff-content :deep(.diff-added) {
  background: #dcfce7;
  color: #166534;
  padding: 1px 2px;
  border-radius: 2px;
}

.diff-content :deep(.diff-removed) {
  background: #fee2e2;
  color: #991b1b;
  padding: 1px 2px;
  border-radius: 2px;
  text-decoration: line-through;
}

.changes-summary {
  padding: 16px 20px;
  background: #fffbeb;
  border-top: 1px solid #fde68a;
}

.changes-summary strong {
  display: block;
  margin-bottom: 4px;
  color: #92400e;
  font-size: 13px;
}

.changes-summary p {
  margin: 0;
  font-size: 14px;
  color: #78350f;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
}

.btn-close {
  padding: 10px 24px;
  background: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #e2e8f0;
}

@media (max-width: 768px) {
  .diff-container {
    grid-template-columns: 1fr;
  }

  .version-selectors {
    flex-direction: column;
    gap: 12px;
  }

  .arrow {
    transform: rotate(90deg);
    margin: 0;
  }
}
</style>
