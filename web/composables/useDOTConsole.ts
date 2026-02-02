/**
 * DOT Console Composable (WEB-45C Part D, WEB-46 S18, S22, S23)
 * Turns Supreme Authority input into a Command Interpreter
 *
 * Features:
 * - S10: /dot-help command shows available commands
 * - S11: Silent execution - commands don't create chat bubbles
 * - S12: Toast notifications for command feedback
 * - S18: /dot-create command for quick discussion creation
 * - S22: Parameterized commands (--coordinator, --reviewers, --executors)
 * - S23: /dot-diag self-diagnostics command
 */

export interface DOTCommand {
  name: string
  description: string
  usage: string
  handler: (args: string[], context: DOTContext) => Promise<DOTResult>
}

export interface DOTContext {
  discussionId: string | null
  currentRound: number
  status: string
  archiveDiscussion: (id: string, reason?: string) => Promise<boolean>
  activateNow: (id: string) => Promise<boolean>
  fetchDiscussions: () => Promise<any[]>
  fetchDiscussion: (id: string) => Promise<any>
  // S18/S22: Create discussion from command with full params
  createDiscussion?: (topic: string, options?: {
    drafter?: string
    coordinator?: string
    reviewers?: string[]
    executors?: string[]
    description?: string
  }) => Promise<any>
  // S23: Activity log callback for showing DOT results
  addActivityLogEntry?: (entry: ActivityLogEntry) => void
}

// S23: Activity log entry for DOT command results
export interface ActivityLogEntry {
  id: string
  timestamp: string
  type: 'dot_command' | 'status_change' | 'ai_response' | 'human_action' | 'timer_event' | 'error' | 'system'
  message: string
  command?: string
  success?: boolean
  actor?: string
  metadata?: Record<string, any>
}

export interface DOTResult {
  success: boolean
  message: string
  data?: any
  silent?: boolean // S11: If true, don't show in chat thread
}

// Toast notification types
export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastNotification {
  id: string
  type: ToastType
  message: string
  duration: number
}

export function useDOTConsole() {
  // S12: Toast notifications state
  const toasts = ref<ToastNotification[]>([])

  /**
   * Check if input is a DOT command
   */
  const isDOTCommand = (input: string): boolean => {
    const trimmed = input.trim()
    return trimmed.startsWith('/') || trimmed.startsWith('dot-')
  }

  /**
   * Parse command from input
   */
  const parseCommand = (input: string): { command: string; args: string[] } => {
    const trimmed = input.trim()
    // Remove leading / or dot-
    const normalized = trimmed.replace(/^\//, '').replace(/^dot-/, '')
    const parts = normalized.split(/\s+/)
    const command = parts[0]?.toLowerCase() || ''
    const args = parts.slice(1)
    return { command, args }
  }

  /**
   * S10: Help command - shows all available DOT commands
   */
  const helpHandler = async (_args: string[], _context: DOTContext): Promise<DOTResult> => {
    const helpText = `
DOT Console - Danh sach lenh kha dung:

QUAN LY DISCUSSION:
/dot-help          - Hien thi danh sach lenh nay
/dot-status        - Xem trang thai discussion hien tai
/dot-list          - Xem danh sach tat ca discussions
/dot-refresh       - Lam moi du lieu

CHAN DOAN (S23):
/dot-diag          - Tu chan doan ket noi (Browser->Proxy->Directus->Agent Data)

TAO MOI (S18/S22):
/dot-create --topic:"Tieu de" --coordinator:claude --reviewers:gemini,chatgpt --executors:claude-code
  Tao discussion moi sieu toc voi day du tham so

HANH DONG:
/dot-archive [ly do] - Luu tru discussion (soft delete)
/dot-activate      - Chay ngay (bo qua timer 5 phut)
/dot-approve       - Phe duyet va dong discussion
/dot-reject        - Tu choi discussion

Ghi chu:
- Lenh DOT thuc thi ngam (silent), khong tao bong bong chat
- Ket qua lenh hien thi qua toast notification va Activity Log
- Go /help hoac /dot-help de xem lai danh sach nay
`.trim()

    return {
      success: true,
      message: helpText,
      silent: false // Help should display in panel
    }
  }

  /**
   * S23: Diagnostics command - Check system connectivity
   * Browser -> Nuxt Proxy -> Directus -> Agent Data
   */
  const diagHandler = async (_args: string[], context: DOTContext): Promise<DOTResult> => {
    const results: { name: string; status: 'ok' | 'error'; detail?: string }[] = []

    // Step 1: Browser -> Nuxt (always OK if we're running)
    results.push({ name: 'Browser -> Nuxt', status: 'ok' })

    // Step 2: Nuxt -> Directus via proxy
    try {
      const directusResponse = await fetch('/api/directus/server/health')
      if (directusResponse.ok) {
        results.push({ name: 'Nuxt -> Directus', status: 'ok', detail: 'ping /server/health' })
      } else {
        results.push({
          name: 'Nuxt -> Directus',
          status: 'error',
          detail: `HTTP ${directusResponse.status}`
        })
      }
    } catch (e) {
      results.push({
        name: 'Nuxt -> Directus',
        status: 'error',
        detail: (e as Error).message
      })
    }

    // Step 3: Nuxt -> Agent Data (if configured)
    const config = useRuntimeConfig()
    if (config.public?.agentData?.enabled && config.public?.agentData?.baseUrl) {
      try {
        // Try the info endpoint on agent-data
        const agentDataResponse = await fetch('/api/agent-data/info')
        if (agentDataResponse.ok) {
          results.push({ name: 'Nuxt -> Agent Data', status: 'ok', detail: 'ping /info' })
        } else {
          results.push({
            name: 'Nuxt -> Agent Data',
            status: 'error',
            detail: `HTTP ${agentDataResponse.status}`
          })
        }
      } catch (e) {
        results.push({
          name: 'Nuxt -> Agent Data',
          status: 'error',
          detail: (e as Error).message
        })
      }
    } else {
      results.push({
        name: 'Nuxt -> Agent Data',
        status: 'ok',
        detail: 'Disabled (not configured)'
      })
    }

    // Build diagnostic output
    const allOk = results.every(r => r.status === 'ok')
    const diagLines = results.map((r, i) => {
      const prefix = i === results.length - 1 ? '└──' : '├──'
      const icon = r.status === 'ok' ? '✅' : '❌'
      const detail = r.detail ? ` (${r.detail})` : ''
      return `${prefix} ${r.name}: ${icon} ${r.status.toUpperCase()}${detail}`
    })

    const output = `
🔍 DOT System Diagnostics
${diagLines.join('\n')}
└── Overall: ${allOk ? '🟢 HEALTHY' : '🔴 ISSUES DETECTED'}
`.trim()

    // Add to activity log if callback provided
    if (context.addActivityLogEntry) {
      context.addActivityLogEntry({
        id: `diag-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'dot_command',
        command: '/dot-diag',
        message: allOk ? 'System healthy' : 'System issues detected',
        success: allOk,
        actor: 'DOT Console',
        metadata: { results }
      })
    }

    return {
      success: allOk,
      message: output,
      data: { results },
      silent: false // Show in DOT output panel
    }
  }

  /**
   * Status command - show current discussion status
   */
  const statusHandler = async (_args: string[], context: DOTContext): Promise<DOTResult> => {
    if (!context.discussionId) {
      return {
        success: false,
        message: 'Chua chon discussion nao. Vui long chon truoc.',
        silent: true
      }
    }

    const discussion = await context.fetchDiscussion(context.discussionId)
    if (!discussion) {
      return {
        success: false,
        message: 'Khong the tai thong tin discussion.',
        silent: true
      }
    }

    return {
      success: true,
      message: `Discussion #${discussion.id}
Topic: ${discussion.topic}
Status: ${discussion.status}
Round: ${discussion.round}/${discussion.max_rounds}
Updated: ${discussion.date_updated}`,
      silent: true
    }
  }

  /**
   * Archive command
   */
  const archiveHandler = async (args: string[], context: DOTContext): Promise<DOTResult> => {
    if (!context.discussionId) {
      return {
        success: false,
        message: 'Chua chon discussion nao de luu tru.',
        silent: true
      }
    }

    const reason = args.join(' ') || undefined
    const success = await context.archiveDiscussion(context.discussionId, reason)

    return {
      success,
      message: success
        ? `Da luu tru discussion #${context.discussionId}`
        : 'Loi: Khong the luu tru discussion.',
      silent: true
    }
  }

  /**
   * Activate Now command
   */
  const activateHandler = async (_args: string[], context: DOTContext): Promise<DOTResult> => {
    if (!context.discussionId) {
      return {
        success: false,
        message: 'Chua chon discussion nao de kich hoat.',
        silent: true
      }
    }

    if (context.status !== 'pending_human') {
      return {
        success: false,
        message: 'Chi co the kich hoat khi status la pending_human.',
        silent: true
      }
    }

    const success = await context.activateNow(context.discussionId)

    return {
      success,
      message: success
        ? `Da kich hoat ngay discussion #${context.discussionId}`
        : 'Loi: Khong the kich hoat discussion.',
      silent: true
    }
  }

  /**
   * List discussions command
   */
  const listHandler = async (_args: string[], context: DOTContext): Promise<DOTResult> => {
    const discussions = await context.fetchDiscussions()

    if (!discussions || discussions.length === 0) {
      return {
        success: true,
        message: 'Khong co discussion nao.',
        silent: true
      }
    }

    const list = discussions.slice(0, 10).map((d: any) =>
      `#${d.id} [${d.status}] ${d.topic.substring(0, 40)}...`
    ).join('\n')

    return {
      success: true,
      message: `Danh sach discussions (10 gan nhat):\n${list}`,
      silent: true
    }
  }

  /**
   * Refresh command
   */
  const refreshHandler = async (_args: string[], context: DOTContext): Promise<DOTResult> => {
    await context.fetchDiscussions()
    if (context.discussionId) {
      await context.fetchDiscussion(context.discussionId)
    }

    return {
      success: true,
      message: 'Da lam moi du lieu.',
      silent: true
    }
  }

  /**
   * S18/S22: Create command - Quick create discussion from DOT console
   * Enhanced with full parameterized syntax (S22)
   * Usage: /dot-create --topic:"Tieu de" --coordinator:claude --reviewers:gemini,chatgpt --executors:claude-code
   */
  const createHandler = async (args: string[], context: DOTContext): Promise<DOTResult> => {
    if (!context.createDiscussion) {
      return {
        success: false,
        message: 'Chuc nang tao discussion chua duoc cau hinh.',
        silent: true
      }
    }

    // Parse arguments with enhanced syntax (S22)
    let topic = ''
    let description = ''
    let coordinator = 'claude' // Default coordinator (drafter)
    let reviewers: string[] = []
    let executors: string[] = []

    // Join args and parse
    const fullArgs = args.join(' ')

    // S22: Parse --param:"value" or --param:value syntax
    // Support both --topic:"Tieu de" and "Tieu de" (legacy)
    const topicParamMatch = fullArgs.match(/--topic:"([^"]+)"/)
    if (topicParamMatch) {
      topic = topicParamMatch[1]
    } else {
      // Legacy: Extract quoted topic without --topic prefix
      const legacyTopicMatch = fullArgs.match(/"([^"]+)"/)
      if (legacyTopicMatch) {
        topic = legacyTopicMatch[1]
      } else if (args.length > 0 && !args[0].startsWith('--')) {
        // If no quotes, take first arg as topic
        topic = args[0]
      }
    }

    // Parse description
    const descMatch = fullArgs.match(/--description:"([^"]+)"/)
    if (descMatch) {
      description = descMatch[1]
    } else {
      const descShortMatch = fullArgs.match(/--desc:"([^"]+)"/)
      if (descShortMatch) {
        description = descShortMatch[1]
      }
    }

    if (!topic) {
      return {
        success: false,
        message: `Thieu tieu de. Cu phap:
/dot-create --topic:"Tieu de" --coordinator:claude --reviewers:gemini,chatgpt --executors:claude-code`,
        silent: false
      }
    }

    // S22: Parse all options from args
    for (const arg of args) {
      // Coordinator (alias for drafter in team terminology)
      if (arg.startsWith('--coordinator:')) {
        coordinator = arg.replace('--coordinator:', '')
      }
      // Legacy drafter support
      else if (arg.startsWith('--drafter:')) {
        coordinator = arg.replace('--drafter:', '')
      }
      // Reviewers (comma-separated)
      else if (arg.startsWith('--reviewers:')) {
        reviewers = arg.replace('--reviewers:', '').split(',').map(r => r.trim()).filter(Boolean)
      }
      // Executors (comma-separated) - AI agents who execute tasks
      else if (arg.startsWith('--executors:')) {
        executors = arg.replace('--executors:', '').split(',').map(e => e.trim()).filter(Boolean)
      }
      // Short description without quotes
      else if (arg.startsWith('--desc:') && !description) {
        description = arg.replace('--desc:', '')
      }
    }

    try {
      const result = await context.createDiscussion(topic, {
        coordinator,
        drafter: coordinator, // Keep backward compatibility
        reviewers,
        executors,
        description
      })

      // Refresh list after creation
      await context.fetchDiscussions()

      // Build success message with team composition
      const teamParts = [`Coordinator: ${coordinator}`]
      if (reviewers.length > 0) teamParts.push(`Reviewers: ${reviewers.join(', ')}`)
      if (executors.length > 0) teamParts.push(`Executors: ${executors.join(', ')}`)

      const successMessage = `✅ Da tao discussion: "${topic}"
📋 ${teamParts.join(' | ')}
🆔 ID: ${result?.id || 'N/A'}`

      // Add to activity log if callback provided
      if (context.addActivityLogEntry) {
        context.addActivityLogEntry({
          id: `create-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'dot_command',
          command: '/dot-create',
          message: `Created: ${topic}`,
          success: true,
          actor: 'DOT Console',
          metadata: { topic, coordinator, reviewers, executors, discussionId: result?.id }
        })
      }

      return {
        success: true,
        message: successMessage,
        data: result,
        silent: false // Show success in output panel
      }
    } catch (e) {
      return {
        success: false,
        message: `❌ Loi khi tao discussion: ${(e as Error).message}`,
        silent: false
      }
    }
  }

  // Command registry
  const commands: Record<string, DOTCommand> = {
    help: {
      name: 'help',
      description: 'Hien thi danh sach lenh DOT',
      usage: '/dot-help',
      handler: helpHandler
    },
    'dot-help': {
      name: 'dot-help',
      description: 'Hien thi danh sach lenh DOT',
      usage: '/dot-help',
      handler: helpHandler
    },
    // S23: Diagnostics command
    diag: {
      name: 'diag',
      description: 'Tu chan doan ket noi he thong',
      usage: '/dot-diag',
      handler: diagHandler
    },
    'dot-diag': {
      name: 'dot-diag',
      description: 'Tu chan doan ket noi he thong',
      usage: '/dot-diag',
      handler: diagHandler
    },
    status: {
      name: 'status',
      description: 'Xem trang thai discussion hien tai',
      usage: '/dot-status',
      handler: statusHandler
    },
    'dot-status': {
      name: 'dot-status',
      description: 'Xem trang thai discussion hien tai',
      usage: '/dot-status',
      handler: statusHandler
    },
    archive: {
      name: 'archive',
      description: 'Luu tru discussion',
      usage: '/dot-archive [ly do]',
      handler: archiveHandler
    },
    'dot-archive': {
      name: 'dot-archive',
      description: 'Luu tru discussion',
      usage: '/dot-archive [ly do]',
      handler: archiveHandler
    },
    activate: {
      name: 'activate',
      description: 'Kich hoat ngay (bo qua timer)',
      usage: '/dot-activate',
      handler: activateHandler
    },
    'dot-activate': {
      name: 'dot-activate',
      description: 'Kich hoat ngay (bo qua timer)',
      usage: '/dot-activate',
      handler: activateHandler
    },
    list: {
      name: 'list',
      description: 'Xem danh sach discussions',
      usage: '/dot-list',
      handler: listHandler
    },
    'dot-list': {
      name: 'dot-list',
      description: 'Xem danh sach discussions',
      usage: '/dot-list',
      handler: listHandler
    },
    refresh: {
      name: 'refresh',
      description: 'Lam moi du lieu',
      usage: '/dot-refresh',
      handler: refreshHandler
    },
    'dot-refresh': {
      name: 'dot-refresh',
      description: 'Lam moi du lieu',
      usage: '/dot-refresh',
      handler: refreshHandler
    },
    // S18: Create command
    create: {
      name: 'create',
      description: 'Tao discussion moi sieu toc',
      usage: '/dot-create "Tieu de" --drafter:claude --reviewers:gemini,chatgpt',
      handler: createHandler
    },
    'dot-create': {
      name: 'dot-create',
      description: 'Tao discussion moi sieu toc',
      usage: '/dot-create "Tieu de" --drafter:claude --reviewers:gemini,chatgpt',
      handler: createHandler
    }
  }

  /**
   * Execute a DOT command
   */
  const executeCommand = async (
    input: string,
    context: DOTContext
  ): Promise<DOTResult> => {
    const { command, args } = parseCommand(input)

    // Check if command exists
    const cmd = commands[command]
    if (!cmd) {
      return {
        success: false,
        message: `Lenh khong hop le: ${command}. Go /dot-help de xem danh sach lenh.`,
        silent: true
      }
    }

    try {
      const result = await cmd.handler(args, context)

      // S12: Show toast notification
      showToast(
        result.success ? 'success' : 'error',
        result.message.split('\n')[0] // First line only for toast
      )

      return result
    } catch (e) {
      const errorMsg = `Loi khi thuc thi lenh: ${(e as Error).message}`
      showToast('error', errorMsg)
      return {
        success: false,
        message: errorMsg,
        silent: true
      }
    }
  }

  /**
   * S12: Show toast notification
   */
  const showToast = (type: ToastType, message: string, duration: number = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const toast: ToastNotification = { id, type, message, duration }

    toasts.value.push(toast)

    // Auto-remove after duration
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  /**
   * Remove toast by ID
   */
  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  /**
   * Get list of available commands (for autocomplete)
   */
  const getAvailableCommands = (): string[] => {
    return [
      '/dot-help',
      '/dot-diag',
      '/dot-status',
      '/dot-create',
      '/dot-archive',
      '/dot-activate',
      '/dot-approve',
      '/dot-reject',
      '/dot-list',
      '/dot-refresh'
    ]
  }

  return {
    // Methods
    isDOTCommand,
    parseCommand,
    executeCommand,
    getAvailableCommands,

    // Toast management (S12)
    toasts,
    showToast,
    removeToast
  }
}
