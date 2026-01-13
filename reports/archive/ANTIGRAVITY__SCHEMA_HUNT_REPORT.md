# ANTIGRAVITY Schema Hunt Report

## 1. Executive Summary
- **Status**: **NOT FOUND**.
- **Evidence**:
  - `web/package.json`: No Directus scripts.
  - `sql/`: Only contains `0047c_antigravity_proposal.sql` (a specific migration proposal for `knowledge_documents`, unrelated to pages/nav).
  - `terraform/main.tf`: Provisions Cloud Run + DB but uses a standard Docker image without volume-mounted schema seeds.
  - No `snapshot.yaml` or `migrations` folder found in repo root or subfolders.
- **Conclusion**: The repository does NOT contain an authoritative schema definition for `pages` or `navigation`.

## 2. Findings Detail
- **File System Search**:
  - `*snapshot*` -> 0 results.
  - `*schema*` -> Node modules only.
  - `*migrations*` -> Node modules only.
- **Project Structure**:
  - Monorepo with `web` (Nuxt) and `terraform` (Infra).
  - Missing a dedicated `backend` or `directus` folder.

## 3. Next Steps (Plan B)
Since we cannot restore from a snapshot, we must **reverse engineer** the schema requirements from the Frontend code and create the collections manually (via API).

**Proposed Plan**:
1.  **Analyze Frontend**: grep usage of `items/pages` and `items/navigation` in `web/` to list required fields.
2.  **Generate Schema API Calls**: Construct `POST /collections` and `POST /fields` requests to create:
    *   `pages` (title, slug, content, blocks, etc.)
    *   `navigation` (location, items, etc.)
    *   `navigation_items` (label, url, parent, etc.)
3.  **Execute**: Run these calls via CLI into the `directus-test` environment.
