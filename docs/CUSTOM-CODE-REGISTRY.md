# CUSTOM CODE REGISTRY

Danh sách TẤT CẢ file custom (không có trong Agency OS / Nuxt gốc).
Mục đích: Khi upgrade Nuxt/Directus/Agency OS, review từng file này.
Cập nhật: BẮT BUỘC mỗi khi thêm/sửa custom code.

---

## Server Middleware

### strip-knowledge-cookie.ts
- **File:** `web/server/middleware/strip-knowledge-cookie.ts`
- **Loại:** new
- **Mục đích:** Strip set-cookie + vary:cookie headers trên public routes (KHÔNG override cache-control)
- **Phụ thuộc API:** Nitro `defineEventHandler`, `getRequestURL`, `event.node.res.writeHead`
- **Cách verify:** `curl -sI localhost:3000/knowledge | grep set-cookie` (kỳ vọng: trống)
- **Ngày tạo:** 2026-02-12
- **Cập nhật:** 2026-02-16 (P37B — xóa cache-control override, chỉ giữ strip cookie)
- **Tạo bởi:** WEB-70F + P37B

## routeRules (nuxt.config.ts)

### Nuxt ISR (swr: true) — no CDN cache
- **File:** `web/nuxt.config.ts` (section routeRules)
- **Loại:** modified
- **Mục đích:** Dynamic pages: swr:true (Nuxt ISR tiêu chuẩn, không CDN cache). Static assets: immutable.
- **Phụ thuộc API:** Nuxt `routeRules.swr` (core feature)
- **Cách verify:** `curl -sI localhost:3000/knowledge | grep cache-control` (kỳ vọng: không có s-maxage)
- **Ngày tạo:** 2026-02-12
- **Cập nhật:** 2026-02-16 (P37B — swr:true, xóa CDN cache cho dynamic pages)
- **Tạo bởi:** WEB-70B + P37B

## Directus Flows

### Cache Invalidation — Knowledge Update
- **Loại:** Directus config (không phải code)
- **Mục đích:** Trigger event khi knowledge_documents thay đổi (create/update/delete)
- **Cách verify:** Directus Admin > Settings > Flows
- **Ngày tạo:** 2026-02-12
- **Tạo bởi:** WEB-70F
- **Ghi chú:** Hiện chỉ trigger, chưa có webhook operation. Thêm webhook khi cần.
