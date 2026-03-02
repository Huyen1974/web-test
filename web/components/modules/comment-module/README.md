# Comment Module (M-001) v2

Reusable chat-style comment/discussion component with 3-tier checkpoint system.

## Structure

```
modules/comment-module/
├── CommentModule.vue             # Entry point
├── CommentThread.vue             # Chat-style message list
├── CommentInput.vue              # Input form with agent/action selectors
├── composables/useComments.ts    # Data layer (wraps useTasks)
├── partials/CheckpointPanel.vue  # 3-tier checkpoint display (L0/L1/L2)
├── types.ts                      # Module types + display config
└── README.md                     # This file
```

## Usage

```vue
<!-- Basic flat list -->
<ModulesCommentModule :task-id="4" />

<!-- With checkpoints -->
<ModulesCommentModule :task-id="4" show-checkpoints />

<!-- Fixed tab scope -->
<ModulesCommentModule :task-id="4" tab-scope="planning" title="Planning Discussion" />

<!-- Inline tab bar -->
<ModulesCommentModule :task-id="4" :tabs="TAB_DEFINITIONS" default-tab="targets" />

<!-- Readonly mode -->
<ModulesCommentModule :task-id="4" :readonly="true" />
```

## Props

| Prop              | Type              | Default       | Description                           |
|-------------------|-------------------|---------------|---------------------------------------|
| `taskId`          | `number\|string`  | **required**  | Directus task ID                      |
| `tabScope`        | `TabScope`        | `undefined`   | Fixed tab scope filter                |
| `readonly`        | `boolean`         | `false`       | Hide input form                       |
| `title`           | `string`          | `'Discussion'`| Section header title                  |
| `tabs`            | `TabDefinition[]` | `undefined`   | Show inline tab bar (omit = flat list)|
| `defaultTab`      | `string`          | first tab key | Initial active tab                    |
| `showCheckpoints` | `boolean`         | `false`       | Show 3-tier checkpoint panel          |

## Events

| Event            | Payload | Description                  |
|------------------|---------|------------------------------|
| `comment-added`  | comment | Fired after successful create|

## Exposed Methods

| Method    | Description                      |
|-----------|----------------------------------|
| `refresh` | Re-fetch comments from Directus  |

## Slots

| Slot      | Description                        |
|-----------|------------------------------------|
| `#header` | Override title/header area         |
| `#empty`  | Override empty state message       |
| `#input`  | Override input form                |

## Data Source

- Collection: `task_comments`
- Composable: `useComments(taskId, tabScope)` wrapping `useTasks`
- Permissions: public READ, AI agent READ+CREATE+UPDATE

## CheckpointPanel (v2)

3-tier progress display embedded via `show-checkpoints` prop:
- **L0 System**: CI/CD automated checks (blue)
- **L1 AI Review**: AI agent verification (purple)
- **L2 User Approval**: Human sign-off (green, locked when L1 incomplete)

Collection: `task_checkpoints`, Composable: `useCheckpoints(taskId)`

## Dependencies

- `@directus/sdk` (readItems, createItem, updateItem)
- `~/composables/useTasks` (createTaskComment, useTaskComments)
- `~/composables/useCheckpoints` (when showCheckpoints enabled)
- `~/types/tasks` (TaskComment, TabScope, AgentType)
- `~/types/checkpoints` (TaskCheckpoint, LayerProgress)

## Agent Types

AI: `claude_ai`, `gpt`, `gemini`
Agents: `claude_code`, `codex`, `antigravity`
Other: `user`, `system`

## Upgrade Notes

- v1 → v2: Added `showCheckpoints` prop + `partials/CheckpointPanel.vue`. No breaking changes.
- v2 added `workflow_id` and `bpmn_element_id` fields to TaskComment for annotation integration.
- Exposed `refresh()` method via `defineExpose` for external triggers.
