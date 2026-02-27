# WEB-88G: Checkpoint Schema + Seed + Flow

## Summary

Created a 3-layer Checkpoint system in Directus for task quality verification. 100% Directus config — zero code files modified.

## Deliverables

### Phase 1: Collections (4 created)

| Collection | Fields | Purpose |
|---|---|---|
| `checkpoint_types` | 11 fields (id, code, name, description, layer, domain, category, requires_evidence, auto_verifiable, sort, status) | Checkpoint definitions |
| `checkpoint_rules` | 7 fields (id, target_collection, target_filter, layer, domain, is_blocking, status) | Auto-assembly rules |
| `checkpoint_instances` | 12 fields (id, checkpoint_type_id, target_collection, target_item_id, layer, status, verified_by_type, verified_by_id, evidence, notes, date_created, date_updated) | Per-task checkpoint records |
| `checkpoint_type_overrides` | 9 fields (id, task_id, code, name, description, is_blocking, sort, source, date_created) | Per-task dynamic overrides |

Relation: `checkpoint_instances.checkpoint_type_id` → `checkpoint_types.id`

### Phase 2: Seed Data

| Data | Count | Details |
|---|---|---|
| L0 types (universal) | 11 | Applied to all tasks regardless of type |
| L1 types (domain) | 20 | 4 per domain: code-change, schema-change, module, flow-config, infrastructure |
| Rules | 7 | 5 domain-specific L1 rules + 2 wildcard L0 rules |
| **Total** | **38** | |

### Phase 3: Permissions

| Policy | Collections | Actions | Count |
|---|---|---|---|
| AI Agent (`e81a70bc`) | 4 collections | CRUD (create, read, update, delete) | 16 |
| Public (`abf8a154`) | 4 collections | read | 4 |
| **Total** | | | **20** |

### Phase 4: Directus Flow

- **Flow**: "Auto-Checkpoint Layer 0" (`8b597089-5dc6-4c01-b36b-dd23390d15ad`)
- **Trigger**: `items.create` on `tasks` collection
- **Operations**: 12 (1 gate_log + 11 item-create chained)
- **Behavior**: On task create, auto-creates 11 L0 checkpoint instances with `status=pending`

**Architecture note**: Uses `item-create` operations (not `request` type) because Directus 11.5.1 request operations with Liquid templates in JSON body fail silently. Chained item-create operations resolve `{{$trigger.key}}` correctly.

### Phase 5: E2E Test Results

```
=== E2E-1: Schema Verification ===
  [PASS] L0 types count = 11
  [PASS] L1 types count = 20
  [PASS] Total types = 31
  [PASS] L1 domains complete (code-change, schema-change, module, flow-config, infrastructure)
  [PASS] Rules count = 7
  [PASS] Overrides collection accessible

=== E2E-2: Flow Auto-Checkpoint ===
  [PASS] Task 7 has 11 L0 instances
  [PASS] All pending
  [PASS] Type IDs 1-11
  [PASS] Flow fires for new task (11 instances)

=== E2E-3: Public Read Permissions ===
  [PASS] Public read checkpoint_types
  [PASS] Public read checkpoint_rules
  [PASS] Public read checkpoint_instances
  [PASS] Public read checkpoint_type_overrides

=== E2E-4: AI Agent Permissions ===
  [PASS] AI CRUD on checkpoint_types
  [PASS] AI CRUD on checkpoint_rules
  [PASS] AI CRUD on checkpoint_instances
  [PASS] AI CRUD on checkpoint_type_overrides
  [PASS] AI perms all fields=[*] (16 perms)
  [PASS] Public read perm (4 collections)

=== E2E-5: CRUD Functional Tests ===
  [PASS] Update instance to verified
  [PASS] Verify status change
  [PASS] Create override
  [PASS] Delete override
  [PASS] Create L2 instance

RESULTS: 29/29 PASS
```

## 3-Layer Architecture

```
Layer 0 (Universal) ─── 11 checkpoints ─── ALL tasks
Layer 1 (Domain)    ─── 4 per domain   ─── Matched by task_type + rules
Layer 2 (Dynamic)   ─── AI-generated   ─── Per-task overrides
```

## Flow Limitation Report

Directus 11.5.1 Flow limitations discovered:

1. **No isolated-vm**: `exec` operations fail silently — cannot run JS code
2. **Request body templates**: Liquid `{{$trigger.key}}` in request operation JSON body doesn't resolve properly when body is stored as JSON object (array). Resolved by using `item-create` operation type instead.
3. **No iteration**: Cannot loop over `item-read` results to dynamically create items. Workaround: hardcode 11 chained item-create operations for fixed L0 types.
4. **L1 domain-based assembly**: Current flow only creates L0 instances. L1 assembly (matching `task_type` to domain rules) would require either:
   - A `condition` operation per domain (5 branches, each with 4 item-creates = 20+ ops)
   - An external webhook/API endpoint called by the flow
   - A server-side trigger (not Directus Flow)

**Recommendation**: L1 assembly should be handled by an external service (Agent Data API or a custom Directus extension) that the flow calls via a single request operation, since the logic exceeds Flow capabilities.

## Test Artifacts

- Task 7: Persistent test task with 11 L0 checkpoint instances
- Flow: Active, tested with multiple task creates

## Key Decisions

1. `item-create` over `request` type for reliable Liquid template resolution
2. Chained operations (not batch request) for Directus 11.5.1 compatibility
3. Static admin KEY for flow auth (no session expiry)
4. `*` wildcard in rules for catch-all L0 matching
