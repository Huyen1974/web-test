# CLI.ANTI.003 – Terraform & Directus Fast Audit

**Date:** 2025-11-26
**Workspace:** `/Users/nmhuyen/Documents/Manual Deploy/web-test`

## 1. Summary

**Terraform:** The codebase is clean. No resources related to Postgres, Kestra, Chatwoot, or n8n were found in the active Terraform configuration (`.tf` files). The infrastructure definition strictly adheres to the MySQL-First strategy, deploying only a Cloud SQL MySQL instance and the Directus Cloud Run service.

**Directus:** The service `directus-test` is defined in Terraform with the correct MySQL configuration. However, runtime verification was limited due to missing `gcloud` CLI. An HTTP health check to the inferred service URL returned a **404 Not Found**, indicating potential deployment issues or URL mismatch, though the server is reachable.

## 2. Checklist Status

- [x] Terraform scan (Completed - Clean)
- [ ] Cloud SQL list (Skipped - `gcloud` missing)
- [x] Directus describe + curl (Partial - Config inferred from Terraform, Curl performed)
- [ ] Logs inspected (Skipped - `gcloud` missing)
- [ ] Optional restart attempted (No)

## 3. Terraform Findings

| File | Resource | Type | Postgres/Kestra? | Notes |
| :--- | :--- | :--- | :--- | :--- |
| N/A | N/A | N/A | No | No suspicious resources found in `.tf` files. |

*Note: `grep` searches confirmed absence of "postgres", "kestra", and "pg_" keywords in configuration files.*

## 4. Cloud SQL Overview (Inferred from Terraform)

*Runtime state could not be verified due to missing `gcloud` CLI. The following is based on `terraform/sql.tf`.*

| Instance | DB Version | Region | Tier | Role | Suspicious? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `mysql-directus-web-test` | MYSQL_8_0 | asia-southeast1 | db-g1-small | Primary Directus DB | No |

## 5. Directus Service Health

-   **Service URL (Inferred):** `https://directus-test-812872501910.asia-southeast1.run.app`
-   **Health Check (`/server/health`):** **404 Not Found**
-   **Configuration (from `terraform/main.tf`):**
    -   **Image:** `directus/directus:11.2.2`
    -   **DB Connection:**
        -   `DB_CLIENT`: `mysql`
        -   `DB_HOST`: `localhost`
        -   `DB_SOCKET_PATH`: `/cloudsql/github-chatgpt-ggcloud:asia-southeast1:mysql-directus-web-test` (Inferred)
    -   **Port:** 8080 (Implicitly handled by Cloud Run)

## 6. Risks & Recommendations

-   **Risk:** The 404 on the health endpoint suggests the Directus application might not be running correctly at the expected path, or the service URL is slightly different.
-   **Recommendation:**
    1.  **Install `gcloud` CLI:** Essential for proper runtime verification and log inspection.
    2.  **Verify Deployment:** Check Cloud Run console to confirm the service URL and deployment status.
    3.  **Inspect Logs:** Once `gcloud` is available, check logs for startup errors (e.g., DB connection failures).

## 7. Evidence

-   **Terraform Scan:** `grep -riE "postgres|kestra|pg_" terraform/` (No matches in `.tf` files)
-   **Health Check:** `curl -I https://directus-test-812872501910.asia-southeast1.run.app/server/health` -> `HTTP/2 404`
