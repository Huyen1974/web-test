# CLI.ANTI.004 – Directus Runtime Repair

**Date:** 2025-11-27
**Workspace:** `/Users/nmhuyen/Documents/Manual Deploy/web-test`

## 1. Summary

-   **Attempted:** Runtime repair of Directus and Cloud SQL configuration.
-   **Result:** **PARTIAL / BLOCKED**.
-   **Details:**
    -   `gcloud` CLI is missing, preventing Cloud SQL instance discovery, proxy connection, and Cloud Run management.
    -   `mysql` CLI is present (`Ver 9.3.0`) but unusable without a connection path (Proxy/IP) to the Cloud SQL instance.
    -   Directus Health Check returned **404 Not Found**, confirming the service is not healthy or reachable at the expected endpoint.

## 2. Checklist

- [ ] Cloud SQL instance `mysql-directus-web-test` status checked. **[SKIPPED - gcloud missing]**
- [ ] Existing databases in `mysql-directus-web-test` listed. **[SKIPPED - No connectivity]**
- [ ] Database `directus` presence verified; created if missing. **[SKIPPED - No connectivity]**
- [ ] Cloud Run service `directus-test` status checked and restarted. **[SKIPPED - gcloud missing]**
- [ ] Recent logs for `directus-test` inspected for DB errors. **[SKIPPED - gcloud missing]**
- [x] External HTTP health check run against the correct Directus URL. **[DONE - 404]**

## 3. Findings – Cloud SQL

-   **Tooling:** `mysql` is installed. `gcloud` is NOT installed.
-   **Connectivity:** Unable to establish connection to `mysql-directus-web-test`.
    -   Missing `gcloud` prevents starting Cloud SQL Auth Proxy.
    -   Missing `gcloud` prevents discovering public IP for direct connection (if authorized).
-   **Database Status:** Unknown. Cannot verify if `directus` database exists.

## 4. Findings – Cloud Run & Logs

-   **Service Status:** Unknown (cannot run `gcloud run services describe`).
-   **Logs:** Inaccessible (cannot run `gcloud logging read`).
-   **Hypothesis:** The `ER_BAD_DB_ERROR` remains the most likely cause of failure if the `directus` database was never created, but this cannot be confirmed without logs.

## 5. Findings – HTTP Health

-   **URL:** `https://directus-test-812872501910.asia-southeast1.run.app/server/health`
-   **Status:** `HTTP/2 404`
-   **Response Headers:**
    ```
    content-length: 272
    content-type: text/html; charset=UTF-8
    date: Thu, 27 Nov 2025 06:39:55 GMT
    ```
-   **Interpretation:** The 404 indicates the request reached a server (likely the Cloud Run load balancer or Directus itself), but the specific path was not found or the application is in a broken state serving a default 404 page.

## 6. Risks / Open Questions

-   **Critical Blocker:** Lack of `gcloud` CLI prevents any operations tasks.
-   **Next Steps:**
    1.  **Install `gcloud` CLI** in the environment.
    2.  **Authorize Network** or **Use Proxy** to allow `mysql` client to connect.
    3.  **Retry CLI.ANTI.004** to create the database and restart the service.
