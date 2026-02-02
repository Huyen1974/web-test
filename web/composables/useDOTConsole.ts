/**
 * DOT Console Composable (WEB-45C Part D)
 * Turns Supreme Authority input into a Command Interpreter
 *
 * Features:
 * - S10: /dot-help command shows available commands
 * - S11: Silent execution - commands don't create chat bubbles
 * - S12: Toast notifications for command feedback
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

/dot-help          - Hien thi danh sach lenh nay
/dot-status        - Xem trang thai discussion hien tai
/dot-archive [ly do] - Luu tru discussion (soft delete)
/dot-activate      - Chay ngay (bo qua timer 5 phut)
/dot-approve       - Phe duyet va dong discussion
/dot-reject        - Tu choi discussion
/dot-list          - Xem danh sach tat ca discussions
/dot-refresh       - Lam moi du lieu

Ghi chu:
- Lenh DOT thuc thi ngam (silent), khong tao bong bong chat
- Ket qua lenh hien thi qua toast notification
- Go /help hoac /dot-help de xem lai danh sach nay
`.trim()

    return {
      success: true,
      message: helpText,
      silent: false // Help should display in panel
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
      '/dot-status',
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
