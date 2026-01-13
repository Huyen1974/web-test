# ANTIGRAVITY Post-Login API Status Correlation Report

## 1. Executive Summary
- **Symptom**: "Blank page" after login.
- **Root Cause Indication**: **API Authorization Failure (401/403)**.
- **Findings**:
  - Login (`/auth/login`) succeeds with **200 OK**.
  - Immediately after, `/users/me` fails with **401 Unauthorized** (23 errors).
  - Content fetches (`/items/*`) fail with **403 Forbidden** (17 errors).
- **Conclusion**: The frontend is likely **failing to attach the Access Token** to subsequent requests after a successful login. This causes the app to fail loading the user profile (`/users/me`), leading to a blank/broken state.

## 2. Methodology
**Log Query**:
```bash
gcloud logging read 'resource.type="cloud_run_revision" resource.labels.service_name="directus-test" (httpRequest.requestUrl:"/auth/login" OR httpRequest.requestUrl:"/users/me" OR httpRequest.requestUrl:"/items/content_requests" OR httpRequest.requestUrl:"/items/") timestamp>="2025-12-15T09:26:00Z"' --format json
```
**Time Window**: Last 60 minutes (approx).

## 3. Data Table (Status Code Distribution)
| ENDPOINT                                 | STATUS     | COUNT |
| ---------------------------------------- | ---------- | ----- |
| **/auth/login**                          | **200**    | **14**|
| /auth/login                              | 401        | 5     |
| **/users/me?fields=*%2Ccontacts.***      | **401**    | **23**|
| /items/*                                 | **403**    | **17**|
| /items/*                                 | 204        | 11    |

## 4. Analysis
1.  **Login Works**: 14 successful logins (Status 200).
2.  **Profile Load Fails**: 23 attempts to fetch `/users/me` returned `401 Unauthorized`.
    *   **Interpretation**: The server rejected the request as unauthenticated. This strongly implies the **Authorization: Bearer <token>** header was missing or invalid.
3.  **Content Load Fails**: 17 attempts to fetch items returned `403 Forbidden`.
    *   **Interpretation**: The server received the request (likely as "Public" role if token was missing, or "Authenticated" but restricted) and denied access.

## 5. Recommendation
The issue is **Client-Side Token Handling**.
- **Action**: Check the Frontend Code (Firebase/Vue app).
- **Verify**:
  - that the `login` response's `access_token` is being saved.
  - that the Directus SDK (or custom fetcher) is configured to attach this token to EVERY subsequent request.
  - If using Cookies: Check `SameSite=None; Secure` configuration, but Bearer tokens are more reliable for this cross-origin setup.
