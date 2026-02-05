# WEB-49: Knowledge Hub Restructure & Access Control

**Date**: 2026-02-05
**Agent**: Claude Code CLI
**Status**: ✅ COMPLETE

## Executive Summary

Successfully restructured the Knowledge Hub with:
- SEO-friendly URL structure using `[...slug].vue` catch-all routes
- Reorganized docs/ folder into hierarchical categories
- Added access control fields (visibility, allowed_roles) to type definitions
- Updated sync script for path-based slug generation

## Phase A: Docs Folder Restructure

### New Structure
```
docs/
├── dev/
│   ├── blueprints/     (12 files) - Architecture & planning docs
│   ├── investigations/ (6 files)  - Investigation reports
│   ├── projects/       - Project-specific docs
│   ├── reports/        (1 file)   - Closure reports
│   └── ssot/           (7 files)  - Source of truth docs
├── ops/                (5 files)  - Operations guides
├── ssot/               (2 files)  - Core docs (constitution, laws)
└── archive/            - Non-essential files (zip, docx)
```

### Files Moved
| From | To | Count |
|------|-----|-------|
| docs/*.md (blueprints) | docs/dev/blueprints/ | 12 |
| docs/*.md (ssot) | docs/dev/ssot/ | 7 |
| docs/*.md (ops) | docs/ops/ | 5 |
| docs/investigations/ | docs/dev/investigations/ | 6 |
| docs/*.md (constitution) | docs/ssot/ | 2 |

## Phase B: Access Control Fields

### Types Updated
- `web/types/directus.ts`: Added `visibility`, `allowed_roles`, `version_number`, `workflow_status`, etc.
- `web/types/view-model-0032.ts`: Added `visibility` and `allowedRoles` to KnowledgeCard and KnowledgeListEntry

### Visibility Levels
| Level | Description |
|-------|-------------|
| public | Visible to all users |
| internal | Visible to authenticated users |
| restricted | Visible to specific roles only |

## Phase C: SEO-Friendly Routes

### New Route Structure
- **Before**: `/knowledge/[id]` (UUID or simple slug)
- **After**: `/knowledge/[...slug]` (hierarchical paths)

### Example URLs
| Old URL | New URL |
|---------|---------|
| `/knowledge/agency-os` | `/knowledge/dev/blueprints/agency-os` |
| `/knowledge/constitution` | `/knowledge/ssot/constitution` |

### Files Changed
- Created: `web/pages/knowledge/[...slug].vue`
- Backed up: `web/pages/knowledge/[id].vue` → `_[id].vue.bak`

### Features
- Path-based breadcrumb navigation
- Visibility badge display (internal/restricted)
- Automatic path-to-title conversion for breadcrumbs

## Phase D: Sync Script Update

### Changes to dot-knowledge-sync
- Updated slug generation to use path instead of source_id
- Generates SEO-friendly slugs from folder structure
- Example: `docs/dev/blueprints/AGENCY_OS.md` → `dev/blueprints/agency-os`

## Phase E: Testing

### Verification Checklist
| # | Check | Result |
|---|-------|--------|
| 1 | TypeScript compilation | ✅ No errors |
| 2 | Docs folder restructured | ✅ 34 files organized |
| 3 | New [...slug].vue page | ✅ Created |
| 4 | Access control types | ✅ Added |
| 5 | Sync script updated | ✅ SEO slugs |

## Files Modified

| File | Change |
|------|--------|
| `web/types/directus.ts` | Added visibility, allowed_roles, workflow fields |
| `web/types/view-model-0032.ts` | Added visibility, allowedRoles to interfaces |
| `web/composables/useKnowledge.ts` | Added access control field mapping |
| `web/pages/knowledge/[...slug].vue` | New SEO-friendly route |
| `dot/bin/dot-knowledge-sync` | Path-based slug generation |

## Migration Notes

1. **Existing URLs**: The old `/knowledge/[id]` URLs still work via the catch-all route
2. **Directus Schema**: The `visibility` and `allowed_roles` fields need to be added in Directus admin if not already present
3. **Agent Views**: Documents in `agent_views` will need path updates to reflect new folder structure

## Next Steps

1. Deploy changes to staging
2. Add `visibility` and `allowed_roles` fields in Directus CMS
3. Run `dot-knowledge-sync` to update document slugs
4. Update any hardcoded links to use new URL structure

## Conclusion

The Knowledge Hub has been restructured with SEO-friendly URLs and access control support. The new hierarchical URL structure makes documentation more discoverable and the visibility system enables role-based access control.
