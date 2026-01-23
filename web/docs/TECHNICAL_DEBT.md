# Technical Debt Log

This document tracks known technical debt items that need to be addressed in future development cycles.

---

## TD-001: /portal/help page missing collection

| Field | Value |
|-------|-------|
| **Status** | OPEN |
| **Priority** | LOW |
| **Discovered** | 2026-01-23 (E2 Task #019) |
| **Component** | Portal - Help Page |

### Description

The `/portal/help` page requires a `help_collections` table in Directus CMS to function properly. Currently, this collection does not exist in the production database, causing the page to show an error.

### Impact

- Help page displays error message
- Non-critical functionality - users can access support through other channels
- Does not affect core application functionality

### Proposed Fix

Create a new DOT tool `dot-seed-help` or manually set up the collection with:
- `help_collections` table with appropriate schema
- Public READ permissions for the collection
- Seed data for help topics

### Workaround

Until fixed, users should be directed to alternative support channels.

---

## Template for New Entries

```markdown
## TD-XXX: [Brief Title]

| Field | Value |
|-------|-------|
| **Status** | OPEN / IN PROGRESS / RESOLVED |
| **Priority** | CRITICAL / HIGH / MEDIUM / LOW |
| **Discovered** | YYYY-MM-DD (Context) |
| **Component** | [Area of codebase] |

### Description
[What is the issue]

### Impact
[What does this affect]

### Proposed Fix
[How to resolve]

### Workaround
[Temporary solution if any]
```
