# CUSTOM CODE REGISTRY

Danh sách TẤT CẢ file custom (không có trong Agency OS / Nuxt gốc).
Mục đích: Khi upgrade Nuxt/Directus/Agency OS, review từng file này.
Cập nhật: BẮT BUỘC mỗi khi thêm/sửa custom code.

---

## Server Middleware

### strip-knowledge-cookie.ts
- **File:** `web/server/middleware/strip-knowledge-cookie.ts`
- **Loại:** new
- **Mục đích:** Strip set-cookie + vary:cookie headers, override cache-control s-maxage for CDN
- **Phụ thuộc API:** Nitro `defineEventHandler`, `getRequestURL`, `event.node.res.writeHead`
- **Cách verify:** `curl -sI localhost:3000/knowledge | grep -E 'set-cookie|s-maxage|vary'` (kỳ vọng: không set-cookie, s-maxage=31536000, vary không chứa cookie)
- **Ngày tạo:** 2026-02-12
- **Cập nhật:** 2026-02-15 (P34 — thêm cache-control override + vary:cookie strip)
- **Tạo bởi:** WEB-70F + P34

## routeRules (nuxt.config.ts)

### SWR Cache (ISR 1s + CDN permanent)
- **File:** `web/nuxt.config.ts` (section routeRules)
- **Loại:** modified
- **Mục đích:** Nitro ISR swr=1 (luôn fresh từ Directus), CDN s-maxage override trong middleware
- **Phụ thuộc API:** Nuxt `routeRules.swr` (core feature)
- **Cách verify:** `curl -sI localhost:3000/knowledge | grep cache-control` (kỳ vọng: s-maxage=31536000, stale-while-revalidate)
- **Ngày tạo:** 2026-02-12
- **Cập nhật:** 2026-02-15 (P34 — swr 31536000→1, CDN override trong middleware)
- **Tạo bởi:** WEB-70B + P34

## Directus Flows

### Cache Invalidation — Knowledge Update
- **Loại:** Directus config (không phải code)
- **Mục đích:** Trigger event khi knowledge_documents thay đổi (create/update/delete)
- **Cách verify:** Directus Admin > Settings > Flows
- **Ngày tạo:** 2026-02-12
- **Tạo bởi:** WEB-70F
- **Ghi chú:** Hiện chỉ trigger, chưa có webhook operation. Thêm webhook khi cần.
