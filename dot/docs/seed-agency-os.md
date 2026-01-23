# DOT Seed Agency OS - Schema & Data Hydration

## Overview

`dot-seed-agency-os` creates the missing Agency OS collections in Directus and seeds them with realistic dummy data. This enables the Portal pages to function correctly.

## Collections Created

| Collection | Purpose | Fields |
|------------|---------|--------|
| `contacts` | Customer contacts | first_name, last_name, email, phone, job_title, status |
| `os_projects` | Client projects | name, description, status, start_date, due_date, billing |
| `os_tasks` | Project tasks | name, description, status, due_date, type, is_visible_to_client, project |
| `os_invoices` | Client invoices | invoice_number, status, issue_date, due_date, subtotal, total, amount_paid, amount_due, contact, project |

## Relations Created

- `os_tasks.project` → `os_projects` (Many-to-One)
- `os_projects.tasks` → `os_tasks` (One-to-Many, alias)
- `os_invoices.contact` → `contacts` (Many-to-One)
- `os_invoices.project` → `os_projects` (Many-to-One)

## Usage

```bash
# Full seed (create collections, relations, and data)
./dot/bin/dot-seed-agency-os

# Dry run (show what would be done)
./dot/bin/dot-seed-agency-os --dry-run

# Only create collections and relations, skip data
./dot/bin/dot-seed-agency-os --skip-seed

# Show help
./dot/bin/dot-seed-agency-os --help
```

## Environment Variables

The tool uses credentials from `dot/config/credentials.local.json` or environment variables:

```bash
DIRECTUS_URL=https://directus-test-pfne2mqwja-as.a.run.app
DIRECTUS_ADMIN_EMAIL=admin@example.com
DIRECTUS_ADMIN_PASSWORD=yourpassword
```

## Idempotency

The tool is safe to run multiple times:
- Collections that already exist are skipped
- Relations that already exist are skipped
- Data is only seeded if the collection is empty

## Seed Data

### Contacts (3 items)
- John Smith (CEO)
- Sarah Johnson (Project Manager)
- Michael Chen (CTO)

### Projects (3 items)
- Website Redesign (fixed billing)
- Mobile App Development (hourly billing)
- E-commerce Platform (retainer billing)

### Tasks (5 items)
- Design Mockups (completed milestone)
- Frontend Development (in progress)
- API Integration (pending)
- User Testing (pending milestone)
- Launch Preparation (pending milestone)

### Invoices (3 items)
- INV-2026-001 (paid, $5,500)
- INV-2026-002 (unpaid, $8,250)
- INV-2026-003 (unpaid, $3,300)

## Verification

After running, verify with:

```bash
# Check API access
./dot/bin/dot-fix-permissions

# Check Portal pages
./dot/bin/dot-spider --max-pages 10
```

## Troubleshooting

### "Collection already exists"
This is normal - the tool skips existing collections.

### "Permission denied"
Run `dot-fix-permissions` first to ensure admin access.

### "Relation already exists"
This is normal - the tool skips existing relations.
