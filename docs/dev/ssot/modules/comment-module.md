# SSOT Assembly: Comment Module (M-001)

> Version: 2.0 | Updated: 2026-03-03 | Status: Commercial Grade

## Overview

Reusable chat-style comment/discussion component with 3-tier checkpoint system. Designed for embedding in any task-centric page.

## Component Inventory

| File | Role | Lines |
|------|------|-------|
| `CommentModule.vue` | Entry point — orchestrates thread, input, tabs, checkpoints | ~150 |
| `CommentThread.vue` | Chat-style message list with agent avatars | ~120 |
| `CommentInput.vue` | Input form with agent/action selectors | ~100 |
| `partials/CheckpointPanel.vue` | 3-tier (L0/L1/L2) progress display | ~150 |
| `composables/useComments.ts` | Data layer wrapping useTasks | ~60 |
| `types.ts` | Module types + display config | ~40 |

## Directus Collections

### `task_comments`
| Field | Type | Description |
|-------|------|-------------|
| `id` | integer (PK) | Auto-increment |
| `task_id` | integer (FK → tasks) | Parent task |
| `tab_scope` | string | Filter scope: general, planning, verify |
| `agent_type` | string | Who wrote it: user, system, claude_ai, gpt, etc. |
| `content` | text | Message content |
| `workflow_id` | integer (nullable) | Links to workflow for annotation |
| `bpmn_element_id` | string (nullable) | Links to BPMN element for annotation |
| `date_created` | timestamp | Auto |

### `task_checkpoints`
| Field | Type | Description |
|-------|------|-------------|
| `id` | integer (PK) | Auto-increment |
| `task_id` | integer (FK → tasks) | Parent task |
| `checkpoint_key` | string | Unique key within task+layer |
| `layer` | string | L0, L1, or L2 |
| `status` | string | pending, passed, failed, skipped |
| `verified_by` | string (nullable) | Agent or user who verified |
| `comment_id` | integer (nullable) | Link to related comment |
| `date_created` | timestamp | Auto |
| `date_updated` | timestamp | Auto |

## Composables

### `useComments(taskId, tabScope)` — from `~/composables/useTasks`
- `useTaskComments(taskId, tabScope)` — reactive list with auto-refresh
- `createTaskComment({ task_id, tab_scope, agent_type, content, workflow_id?, bpmn_element_id? })` — create comment

### `useCheckpoints(taskId)` — from `~/composables/useCheckpoints`
- Returns: `{ checkpoints, layers, overallProgress, loading, error, refresh }`
- `layers`: Array of `LayerProgress` grouped by L0/L1/L2
- `overallProgress`: `{ total, passed, percent }`

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `taskId` | `number\|string` | **required** | Directus task ID |
| `tabScope` | `TabScope` | `undefined` | Fixed tab scope filter |
| `readonly` | `boolean` | `false` | Hide input form |
| `title` | `string` | `'Discussion'` | Section header |
| `tabs` | `TabDefinition[]` | `undefined` | Inline tab bar |
| `defaultTab` | `string` | first tab key | Initial active tab |
| `showCheckpoints` | `boolean` | `false` | Show 3-tier checkpoint panel |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `comment-added` | comment object | Fired after successful create |

## Exposed Methods

| Method | Description |
|--------|-------------|
| `refresh()` | Re-fetch comments from Directus (used by annotation pipeline) |

## Slots

| Slot | Description |
|------|-------------|
| `#header` | Override title/header area |
| `#empty` | Override empty state message |
| `#input` | Override input form |

## Checkpoint System (v2)

3-tier progressive verification:

| Layer | Label | Color | Description |
|-------|-------|-------|-------------|
| L0 | System | Blue | CI/CD automated checks |
| L1 | AI Review | Purple | AI agent verification |
| L2 | User Approval | Green | Human sign-off (locked when L1 incomplete) |

L2 checkpoints are locked (disabled) until all L1 checkpoints pass.

## Permissions

| Policy | Access |
|--------|--------|
| Public | READ task_comments, READ task_checkpoints |
| AI Agent | READ + CREATE + UPDATE task_comments, READ + CREATE + UPDATE task_checkpoints |
| Admin | Full access |

## OPS Proxy Endpoints

```
GET  /items/task_comments?filter[task_id][_eq]=X
POST /items/task_comments
GET  /items/task_checkpoints?filter[task_id][_eq]=X
POST /items/task_checkpoints
PATCH /items/task_checkpoints/:id
```

## Agent Types

| Category | Values |
|----------|--------|
| AI Models | `claude_ai`, `gpt`, `gemini` |
| AI Agents | `claude_code`, `codex`, `antigravity` |
| Other | `user`, `system` |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-02 | Initial: CommentModule + CommentThread + CommentInput |
| v2.0 | 2026-03 | Added CheckpointPanel, exposed refresh(), workflow_id/bpmn_element_id fields |
