# Directus Phase 6 — Final Handover (2025-12-22)

## Scope
Fix: Anonymous/Public access 403 ("Zombie Mapping") + confirm Admin health.
Note: Old file data in `directus_files` was empty; old file IDs are not valid anymore.

## Current Status (Green)
- Directus URL: https://directus-test-pfne2mqwja-as.a.run.app
- Admin URL: https://directus-test-pfne2mqwja-as.a.run.app/admin
- Admin: OK (can read pages /items/pages with auth)
- Public Assets: OK (anonymous 200 confirmed)
- Public API Pages: MUST be verified by smoke test below (expect 200)

## Proof / Smoke Test Artifacts
- Public test file (NEW): cf9f9030-bc76-4b9a-86f9-8e87c42febe6
- Public asset URL:
  https://directus-test-pfne2mqwja-as.a.run.app/assets/cf9f9030-bc76-4b9a-86f9-8e87c42febe6

## Smoke Tests (no secrets)
### Public assets
Open in Incognito:
- /assets/cf9f9030-bc76-4b9a-86f9-8e87c42febe6
Expect: renders/downloads

### Public pages API (curl needs -g)
curl -g -s -o /dev/null -w "%{http_code}\n" \
"https://directus-test-pfne2mqwja-as.a.run.app/items/pages?filter[permalink][_eq]=/"
Expect: 200

## Root Causes (final)
1) Anonymous 403: Directus internal state/cache ("Zombie Mapping") requiring UI save hook.
2) Old file IDs (e.g. a2bc...): data was empty; not a permission bug.

## What fixed it (final decisive step)
UI action in Directus Admin:
Settings → Project Settings → Public Role:
- set to None → Save
- set back to Public → Save
Then refresh.

## Hard Guardrails (DO NOT BREAK)
- Do NOT test or reference old file IDs (a2bc...). Always upload a NEW file for verification.
- Do NOT use `gcloud run services update --set-env-vars` (replace). Only `--update-env-vars` (merge).
- Do NOT perform SQL surgery unless a written change plan + backup exists.
- Any change must include: Snapshot → Change → Smoke tests (assets + pages) → record result in this file.
