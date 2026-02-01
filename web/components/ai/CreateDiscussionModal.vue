<script setup lang="ts">
/**
 * CreateDiscussionModal Component
 * Form to create new discussion
 */

interface Agent {
  id: string
  name: string
  email: string
  role: string
}

const props = defineProps<{
  agents: Agent[]
}>()

const emit = defineEmits<{
  close: []
  created: [discussion: any]
}>()

const form = ref({
  topic: '',
  description: '',
  category: 'business',
  participants: [] as string[],
  content: '',
  urgent: false,
  autoApprove: true
})

const isSubmitting = ref(false)
const error = ref<string | null>(null)

const categories = [
  { value: 'business', label: '📊 Nghiep vu' },
  { value: 'technical', label: '⚙️ Ky thuat' },
  { value: 'administrative', label: '📋 Hanh chinh' },
  { value: 'other', label: '📁 Khac' }
]

const isValid = computed(() => form.value.topic.trim().length > 0)

const handleSubmit = async () => {
  if (!isValid.value || isSubmitting.value) return

  isSubmitting.value = true
  error.value = null

  try {
    const config = useRuntimeConfig()
    const directusUrl = config.public.directusUrl || 'https://directus-test-pfne2mqwja-as.a.run.app'

    // Get first participant as drafter (or use current user)
    const drafterId = form.value.participants[0] || null

    const response = await $fetch(`${directusUrl}/items/ai_discussions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        topic: `[${form.value.category.toUpperCase()}] ${form.value.topic}`,
        description: form.value.description,
        drafter_id: drafterId,
        reviewers: JSON.stringify(form.value.participants.slice(1)),
        status: form.value.autoApprove ? 'pending_human' : 'drafting',
        round: 1,
        max_rounds: 3,
        draft_content: form.value.content || `## ${form.value.topic}\n\n${form.value.description}`
      }
    })

    emit('created', (response as any).data)
  } catch (e: any) {
    error.value = e.message || 'Failed to create discussion'
  } finally {
    isSubmitting.value = false
  }
}

const toggleParticipant = (agentId: string) => {
  const idx = form.value.participants.indexOf(agentId)
  if (idx >= 0) {
    form.value.participants.splice(idx, 1)
  } else {
    form.value.participants.push(agentId)
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <h2>➕ Tao vu viec moi</h2>
        <button @click="emit('close')" class="close-btn">✕</button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="modal-form">
        <!-- Error Message -->
        <div v-if="error" class="error-message">
          ⚠️ {{ error }}
        </div>

        <!-- Topic -->
        <div class="form-group">
          <label>Chu de *</label>
          <input
            v-model="form.topic"
            type="text"
            required
            placeholder="VD: De xuat quy trinh quan ly kho"
          />
        </div>

        <!-- Description -->
        <div class="form-group">
          <label>Mo ta chi tiet</label>
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="Mo ta ngan gon yeu cau..."
          ></textarea>
        </div>

        <!-- Category -->
        <div class="form-group">
          <label>Phan loai</label>
          <select v-model="form.category">
            <option v-for="cat in categories" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </option>
          </select>
        </div>

        <!-- AI Team Selection -->
        <div class="form-group">
          <label>Chon AI tham gia</label>
          <div class="agents-grid">
            <div
              v-for="agent in agents"
              :key="agent.id"
              :class="['agent-card', { selected: form.participants.includes(agent.id) }]"
              @click="toggleParticipant(agent.id)"
            >
              <AiAgentAvatar :agent="agent.email" size="sm" />
              <div class="agent-info">
                <div class="agent-name">{{ agent.name }}</div>
                <div class="agent-role">{{ agent.role }}</div>
              </div>
              <input
                type="checkbox"
                :checked="form.participants.includes(agent.id)"
                @click.stop
                @change="toggleParticipant(agent.id)"
              />
            </div>
          </div>
        </div>

        <!-- Initial Content -->
        <div class="form-group">
          <label>Noi dung yeu cau ban dau</label>
          <textarea
            v-model="form.content"
            rows="4"
            placeholder="Nhap yeu cau chi tiet..."
          ></textarea>
        </div>

        <!-- Options -->
        <div class="form-options">
          <label class="option-label">
            <input type="checkbox" v-model="form.urgent" />
            <span>🔥 Khan cap</span>
          </label>
          <label class="option-label">
            <input type="checkbox" v-model="form.autoApprove" />
            <span>⏱️ Auto-approve sau 5 phut</span>
          </label>
        </div>
      </form>

      <!-- Footer -->
      <div class="modal-footer">
        <button @click="emit('close')" class="btn-cancel">Huy</button>
        <button
          @click="handleSubmit"
          :disabled="!isValid || isSubmitting"
          class="btn-submit"
        >
          {{ isSubmitting ? 'Dang tao...' : 'Tao vu viec' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #eff6ff;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  border-radius: 6px;
}

.close-btn:hover {
  background: #e2e8f0;
}

.modal-form {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.error-message {
  padding: 12px;
  background: #fee2e2;
  border-radius: 8px;
  color: #dc2626;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 6px;
  color: #374151;
}

.form-group input[type="text"],
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.agents-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.agent-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.agent-card:hover {
  background: #f8fafc;
}

.agent-card.selected {
  background: #eff6ff;
  border-color: #3b82f6;
}

.agent-info {
  flex: 1;
}

.agent-name {
  font-size: 13px;
  font-weight: 500;
}

.agent-role {
  font-size: 11px;
  color: #64748b;
}

.form-options {
  display: flex;
  gap: 20px;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.btn-cancel {
  padding: 10px 20px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #f1f5f9;
}

.btn-submit {
  padding: 10px 24px;
  border: none;
  background: #3b82f6;
  color: white;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-submit:hover:not(:disabled) {
  background: #2563eb;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
