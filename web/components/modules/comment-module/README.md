# Comment Module (M-001)

Reusable chat-style comment/discussion component for tasks.

## Structure

```
modules/comment-module/
├── CommentModule.vue          # Entry point
├── CommentThread.vue          # Chat-style message list
├── CommentInput.vue           # Input form with agent/action selectors
├── composables/useComments.ts # Data layer (wraps useTasks)
├── types.ts                   # Module types + display config
└── README.md                  # This file
```

## Usage

```vue
<!-- Basic -->
<ModulesCommentModuleCommentModule :task-id="4" />

<!-- With tab scope and custom title -->
<ModulesCommentModuleCommentModule :task-id="4" tab-scope="planning" title="Planning Discussion" />

<!-- Readonly mode -->
<ModulesCommentModuleCommentModule :task-id="4" :readonly="true" />
```

## Props

| Prop       | Type             | Default       | Description                     |
|------------|------------------|---------------|---------------------------------|
| `taskId`   | `number\|string` | **required**  | Directus task ID                |
| `tabScope` | `TabScope`       | `undefined`   | Filter by tab scope             |
| `readonly` | `boolean`        | `false`       | Hide input form                 |
| `title`    | `string`         | `'Discussion'`| Section header title            |

## Slots (v2 readiness)

| Slot      | Description                        |
|-----------|------------------------------------|
| `#header` | Override title/header area         |
| `#empty`  | Override empty state message       |
| `#input`  | Override input form                |

## Events

| Event            | Payload | Description                  |
|------------------|---------|------------------------------|
| `comment-added`  | comment | Fired after successful create|

## Agent Types

AI: `claude_ai`, `gpt`, `gemini`
Agents: `claude_code`, `codex`, `antigravity`
Other: `user`, `system`

## Roadmap

- **v2**: Orchestration slots ("Waiting: [AI name]" indicator), workflow signals
- **v3**: Threading, reactions, plan status transitions
