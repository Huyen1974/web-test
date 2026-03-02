# Workflow Module (M-002) v1

BPMN 2.0 workflow viewer and editor with annotation-to-comment pipeline.

## Structure

```
modules/workflow-module/
├── WorkflowViewer.vue    # Read-only BPMN diagram (NavigatedViewer)
├── WorkflowModeler.vue   # Full BPMN editor (Modeler) with save/undo/redo
└── README.md             # This file
```

## Usage

```vue
<!-- Read-only viewer -->
<ModulesWorkflowModuleWorkflowViewer :workflow-id="1" />

<!-- Full editor -->
<ModulesWorkflowModuleWorkflowModeler :workflow-id="1" height="700px" />

<!-- With annotation pipeline (parent handles event) -->
<ModulesWorkflowModuleWorkflowModeler
  :workflow-id="1"
  @annotation-added="handleAnnotation"
  @workflow-saved="handleSaved"
/>
```

## WorkflowViewer Props

| Prop         | Type             | Default  | Description              |
|--------------|------------------|----------|--------------------------|
| `workflowId` | `number\|string` | required | Directus workflow ID     |
| `height`     | `string`         | `500px`  | Canvas height            |

## WorkflowViewer Events

| Event             | Payload                        | Description              |
|-------------------|--------------------------------|--------------------------|
| `workflow-loaded` | `{ id: number, title: string}` | Fired after XML imported |

## WorkflowModeler Props

| Prop         | Type             | Default  | Description              |
|--------------|------------------|----------|--------------------------|
| `workflowId` | `number\|string` | required | Directus workflow ID     |
| `height`     | `string`         | `600px`  | Canvas height            |

## WorkflowModeler Events

| Event              | Payload                                                   | Description                     |
|--------------------|-----------------------------------------------------------|---------------------------------|
| `workflow-saved`   | `{ id: number \| string }`                                | Fired after successful XML save |
| `annotation-added` | `{ elementId: string, annotationText: string, workflowId: number \| string }` | Fired when TextAnnotation added/edited |

## Features

- **View mode**: Pan, zoom, fit-viewport (NavigatedViewer)
- **Edit mode**: Full BPMN palette, drag-drop, context pad (Modeler)
- **Undo/Redo**: Toolbar buttons tracking commandStack state
- **Save**: Exports XML and PATCHes `workflows.bpmn_xml` via Directus
- **Annotation pipeline**: Detects `bpmn:TextAnnotation` shape.added + element.changed events
- **Dark mode**: Scoped CSS for canvas, palette, context pad, popup, SVG elements
- **SSR safe**: Wrapped in `<ClientOnly>`, dynamic `import()` for bpmn-js
- **Error boundary**: Parent page wraps in `<NuxtErrorBoundary>` for crash recovery

## Data Source

- Collection: `workflows`
- Composable: `useWorkflow(workflowId)` from `~/composables/useWorkflows`
- Save: `saveWorkflow(id, bpmnXml)` from `~/composables/useWorkflows`
- Permissions: public READ, AI agent READ+UPDATE

## Dependencies

- `bpmn-js` v18.12.1 (pinned exact) — `lib/NavigatedViewer` + `lib/Modeler`
- `~/composables/useWorkflows` (useWorkflow, saveWorkflow)
- `~/types/workflows` (Workflow, WorkflowStatus)

## Integration with CommentModule (M-001)

The annotation pipeline connects M-002 to M-001:

1. User adds `bpmn:TextAnnotation` in Modeler
2. Modeler emits `annotation-added` event
3. Parent page creates `task_comments` record with `workflow_id` + `bpmn_element_id`
4. Parent calls `CommentModule.refresh()` to show the new comment

Fields added to `TaskComment` for this integration:
- `workflow_id?: number` — Links comment to workflow
- `bpmn_element_id?: string` — Links comment to specific BPMN element
