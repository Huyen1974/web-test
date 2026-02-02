<script setup lang="ts">
/**
 * CreateDiscussionModal Component (WEB-46)
 * Form to create new discussion with AI/Agent role selection
 * Based on WEB-33 design specification
 */

// AI and Agent definitions per WEB-33 design
const AI_ENTITIES = [
  { id: 'claude', name: 'Claude (incl. Cowork)', icon: '🟣', description: 'AI Coordinator' },
  { id: 'chatgpt', name: 'ChatGPT', icon: '🟢', description: 'General Assistant' },
  { id: 'gemini', name: 'Gemini', icon: '🔵', description: 'Supervisor & Analyst' }
]

const AGENT_ENTITIES = [
  { id: 'claude_code_cli', name: 'Claude Code CLI', icon: '💜', description: 'Primary Developer' },
  { id: 'codex', name: 'Codex', icon: '🟡', description: 'Code Executor' },
  { id: 'gemini_cli', name: 'Gemini CLI', icon: '🩵', description: 'Local Assistant' },
  { id: 'antigravity', name: 'Antigravity', icon: '⚪', description: 'Knowledge Manager' }
]

type AIRole = 'coordinator' | 'reviewer' | 'none'
type AgentRole = 'executor' | 'checker' | 'none'

interface AISelection {
  id: string
  role: AIRole
}

interface AgentSelection {
  id: string
  role: AgentRole
}

const emit = defineEmits<{
  close: []
  created: [discussion: any]
}>()

const form = ref({
  topic: '',
  description: '',
  category: 'business',
  content: '',
  urgent: false,
  autoApprove: true
})

// AI and Agent selections with default values per spec
const aiSelections = ref<AISelection[]>([
  { id: 'claude', role: 'coordinator' },  // Default: Claude = Dieu hanh
  { id: 'chatgpt', role: 'reviewer' },    // Default: ChatGPT = Phan bien
  { id: 'gemini', role: 'reviewer' }      // Default: Gemini = Phan bien
])

const agentSelections = ref<AgentSelection[]>([
  { id: 'claude_code_cli', role: 'executor' },  // Default: Claude Code = Thuc hien
  { id: 'codex', role: 'checker' },             // Default: Codex = Kiem tra
  { id: 'gemini_cli', role: 'none' },
  { id: 'antigravity', role: 'checker' }        // Default: Antigravity = Kiem tra
])

const isSubmitting = ref(false)
const error = ref<string | null>(null)

const categories = [
  { value: 'business', label: '📊 Nghiep vu' },
  { value: 'technical', label: '⚙️ Ky thuat' },
  { value: 'administrative', label: '📋 Hanh chinh' },
  { value: 'other', label: '📁 Khac' }
]

const aiRoleOptions = [
  { value: 'coordinator', label: '🎯 Dieu hanh' },
  { value: 'reviewer', label: '💬 Phan bien' },
  { value: 'none', label: '⏸️ Khong tham gia' }
]

const agentRoleOptions = [
  { value: 'executor', label: '⚡ Thuc hien' },
  { value: 'checker', label: '🔍 Kiem tra' },
  { value: 'none', label: '⏸️ Khong tham gia' }
]

const isValid = computed(() => form.value.topic.trim().length > 0)

// Enforce only 1 AI as coordinator
const updateAIRole = (aiId: string, newRole: AIRole) => {
  if (newRole === 'coordinator') {
    // Reset other coordinators to reviewer
    aiSelections.value.forEach(ai => {
      if (ai.id !== aiId && ai.role === 'coordinator') {
        ai.role = 'reviewer'
      }
    })
  }
  const ai = aiSelections.value.find(a => a.id === aiId)
  if (ai) ai.role = newRole
}

// Enforce only 1 agent as executor
const updateAgentRole = (agentId: string, newRole: AgentRole) => {
  if (newRole === 'executor') {
    // Reset other executors to checker
    agentSelections.value.forEach(agent => {
      if (agent.id !== agentId && agent.role === 'executor') {
        agent.role = 'checker'
      }
    })
  }
  const agent = agentSelections.value.find(a => a.id === agentId)
  if (agent) agent.role = newRole
}

const getAIById = (id: string) => AI_ENTITIES.find(ai => ai.id === id)
const getAgentById = (id: string) => AGENT_ENTITIES.find(agent => agent.id === id)

const handleSubmit = async () => {
  if (!isValid.value || isSubmitting.value) return

  isSubmitting.value = true
  error.value = null

  try {
    // Use Nuxt proxy to avoid CORS (WEB-46)
    const proxyUrl = '/api/directus'

    // Build participant lists from selections
    const coordinator = aiSelections.value.find(ai => ai.role === 'coordinator')
    const reviewers = aiSelections.value.filter(ai => ai.role === 'reviewer').map(ai => ai.id)
    const executor = agentSelections.value.find(agent => agent.role === 'executor')
    const checkers = agentSelections.value.filter(agent => agent.role === 'checker').map(agent => agent.id)

    const response = await $fetch(`${proxyUrl}/items/ai_discussions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        topic: `[${form.value.category.toUpperCase()}] ${form.value.topic}`,
        description: form.value.description,
        // Store coordinator AI as drafter
        drafter_id: coordinator?.id || 'claude',
        // Store reviewers and agents in JSON
        reviewers: JSON.stringify({
          ai_reviewers: reviewers,
          executor: executor?.id || null,
          checkers: checkers
        }),
        status: form.value.autoApprove ? 'pending_human' : 'drafting',
        round: 1,
        max_rounds: 3,
        draft_content: form.value.content || `## ${form.value.topic}\n\n${form.value.description}`,
        // Store full role assignments for reference
        executor_ai_webhook: executor?.id ? `https://ai.incomexsaigoncorp.vn/api/agent-webhook/${executor.id}` : null
      }
    })

    emit('created', (response as any).data)
  } catch (e: any) {
    // S19: Enhanced error message for CORS/network issues
    if (e.message?.includes('fetch') || e.message?.includes('network') || e.message?.includes('Failed')) {
      error.value = '⚠️ Loi ket noi: Trinh duyet dang chan ket noi. Vui long thu lai hoac lien he Claude Code kiem tra Nuxt Proxy.'
    } else {
      error.value = e.message || 'Khong the tao discussion'
    }
  } finally {
    isSubmitting.value = false
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
        <!-- Error Message (S19: Enhanced) -->
        <div v-if="error" class="error-message">
          {{ error }}
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

        <!-- AI Team Selection (WEB-33 Design) -->
        <div class="form-group">
          <label>🤖 Chon AI tham gia</label>
          <p class="form-hint">Chi 1 AI duoc phep "Dieu hanh"</p>
          <div class="entity-selection-grid">
            <div
              v-for="ai in AI_ENTITIES"
              :key="ai.id"
              :class="['entity-card', { inactive: aiSelections.find(a => a.id === ai.id)?.role === 'none' }]"
            >
              <div class="entity-header">
                <span class="entity-icon">{{ ai.icon }}</span>
                <div class="entity-info">
                  <div class="entity-name">{{ ai.name }}</div>
                  <div class="entity-desc">{{ ai.description }}</div>
                </div>
              </div>
              <select
                :value="aiSelections.find(a => a.id === ai.id)?.role"
                @change="updateAIRole(ai.id, ($event.target as HTMLSelectElement).value as AIRole)"
                class="role-select"
              >
                <option v-for="opt in aiRoleOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Agent Team Selection (WEB-33 Design) -->
        <div class="form-group">
          <label>🔧 Chon Agents thuc thi</label>
          <p class="form-hint">Chi 1 Agent duoc phep "Thuc hien"</p>
          <div class="entity-selection-grid">
            <div
              v-for="agent in AGENT_ENTITIES"
              :key="agent.id"
              :class="['entity-card', { inactive: agentSelections.find(a => a.id === agent.id)?.role === 'none' }]"
            >
              <div class="entity-header">
                <span class="entity-icon">{{ agent.icon }}</span>
                <div class="entity-info">
                  <div class="entity-name">{{ agent.name }}</div>
                  <div class="entity-desc">{{ agent.description }}</div>
                </div>
              </div>
              <select
                :value="agentSelections.find(a => a.id === agent.id)?.role"
                @change="updateAgentRole(agent.id, ($event.target as HTMLSelectElement).value as AgentRole)"
                class="role-select"
              >
                <option v-for="opt in agentRoleOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
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
  max-width: 700px;
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
  font-size: 14px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
  color: #374151;
}

.form-hint {
  font-size: 12px;
  color: #6b7280;
  margin: -4px 0 8px 0;
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

/* Entity Selection Grid */
.entity-selection-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.entity-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.2s;
}

.entity-card:hover {
  border-color: #93c5fd;
}

.entity-card.inactive {
  opacity: 0.5;
  background: #f9fafb;
}

.entity-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.entity-icon {
  font-size: 24px;
}

.entity-info {
  flex: 1;
}

.entity-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.entity-desc {
  font-size: 11px;
  color: #6b7280;
}

.role-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
  background: white;
  cursor: pointer;
}

.role-select:focus {
  outline: none;
  border-color: #3b82f6;
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

@media (max-width: 640px) {
  .entity-selection-grid {
    grid-template-columns: 1fr;
  }
}
</style>
