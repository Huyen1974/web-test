# SSOT Assembly: Workflow Module (M-002)

> Version: 1.0 | Updated: 2026-03-03 | Status: Commercial Grade

## Overview

BPMN 2.0 workflow viewer and editor for process visualization. Supports read-only viewing (NavigatedViewer) and full editing (Modeler) with annotation-to-comment pipeline connecting to M-001.

## Component Inventory

| File | Role | Lines |
|------|------|-------|
| `WorkflowViewer.vue` | Read-only BPMN diagram with pan/zoom | ~140 |
| `WorkflowModeler.vue` | Full BPMN editor with save, undo/redo, annotation detection | ~275 |

## Directus Collections

### `workflows`
| Field | Type | Description |
|-------|------|-------------|
| `id` | integer (PK) | Auto-increment |
| `title` | string | Workflow name |
| `description` | text (nullable) | Workflow description |
| `bpmn_xml` | text | BPMN 2.0 XML content |
| `status` | string | draft, active, archived |
| `task_id` | integer (nullable, FK → tasks) | Links workflow to a task/module |
| `version` | integer | Incremented on save |
| `user_created` | string | Directus user UUID |
| `date_created` | timestamp | Auto |
| `date_updated` | timestamp | Auto |

## Composables

### `useWorkflow(workflowId)` — from `~/composables/useWorkflows`
- Returns: `{ workflow, bpmnXml, loading, error, refresh }`
- `bpmnXml`: Computed string extracted from `workflow.bpmn_xml`
- Reactive: watches `workflowId` ref for changes

### `saveWorkflow(id, bpmnXml)` — from `~/composables/useWorkflows`
- PATCHes `workflows` collection via `updateItem`
- Called by Modeler's Save button

### `useWorkflowsList(taskId?)` — from `~/composables/useWorkflows`
- Fetches workflow list, optionally filtered by `task_id`
- Used by parent pages to find linked workflows

## Type Definitions

```typescript
// ~/types/workflows.ts
type WorkflowStatus = 'draft' | 'active' | 'archived';

interface Workflow {
  id: number;
  title: string;
  description?: string;
  bpmn_xml: string;
  status: WorkflowStatus;
  task_id?: number;
  version: number;
  user_created?: string;
  date_created?: string;
  date_updated?: string;
}
```

## WorkflowViewer API

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `workflowId` | `number\|string` | **required** | Directus workflow ID |
| `height` | `string` | `500px` | Canvas height |

### Events
| Event | Payload | Description |
|-------|---------|-------------|
| `workflow-loaded` | `{ id, title }` | After XML imported successfully |

## WorkflowModeler API

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `workflowId` | `number\|string` | **required** | Directus workflow ID |
| `height` | `string` | `600px` | Canvas height |

### Events
| Event | Payload | Description |
|-------|---------|-------------|
| `workflow-saved` | `{ id }` | After XML saved to Directus |
| `annotation-added` | `{ elementId, annotationText, workflowId }` | TextAnnotation created/edited |

### Toolbar
| Button | State | Description |
|--------|-------|-------------|
| Undo | Enabled when `canUndo` | Calls `commandStack.undo()` |
| Redo | Enabled when `canRedo` | Calls `commandStack.redo()` |
| Save | Enabled when `dirty && !saving` | Exports XML, calls `saveWorkflow()` |

## Technical Details

### bpmn-js Integration
- **Version**: 18.12.1 (pinned exact, no caret)
- **Viewer**: `bpmn-js/lib/NavigatedViewer` — read-only with pan/zoom
- **Modeler**: `bpmn-js/lib/Modeler` — full palette, context pad, drag-drop
- **Import**: Dynamic `import()` for SSR safety, wrapped in `<ClientOnly>`
- **Lifecycle**: `viewer.destroy()` called in `onBeforeUnmount` to prevent memory leaks

### Dark Mode CSS
Scoped styles using `:root.dark` + `:deep()` for bpmn-js internals:
- Canvas background: `#111827`
- Palette/context pad: `#1f2937` with `#374151` borders
- Popup menus: `#1f2937` background, `#e5e7eb` text
- Direct editing: `#1f2937` background, `#3b82f6` border
- SVG strokes: `#9ca3af`, text fill: `#e5e7eb`

### Error Handling
- `NuxtErrorBoundary` wraps both Viewer and Modeler on parent page
- Internal `viewerError`/`modelerError` ref for BPMN parse failures
- Loading state with spinner during data fetch

### Annotation Pipeline (M-002 → M-001)
1. User adds `bpmn:TextAnnotation` element in Modeler
2. `shape.added` event fires → emit `annotation-added`
3. User edits annotation text → `element.changed` fires → emit again
4. Parent page catches event → creates `task_comments` with `workflow_id` + `bpmn_element_id`
5. Parent calls `CommentModule.refresh()` to display new comment

## Permissions

| Policy | Access |
|--------|--------|
| Public | READ workflows |
| AI Agent | READ + UPDATE workflows |
| Admin | Full access |

## OPS Proxy Endpoints

```
GET /items/workflows?filter[task_id][_eq]=X
GET /items/workflows/:id
```

Read-only — AI agents cannot create workflows via OPS proxy.

## Page Integration

Used on `pages/knowledge/modules/[id].vue`:
- View/Edit toggle switches between Viewer and Modeler
- Wrapped in `<NuxtErrorBoundary>` with fallback error display
- Annotation events handled by parent page
- Linked workflows discovered via `readItems('workflows', { filter: { task_id } })`

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-03 | Initial: WorkflowViewer + WorkflowModeler, dark mode, undo/redo, annotation pipeline |
