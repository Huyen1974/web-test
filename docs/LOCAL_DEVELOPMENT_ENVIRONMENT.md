<!-- 
CRITICAL: DO NOT DELETE THIS FILE
This file is the Single Source of Truth for the Local Development Environment.
It is protected by the "No-Code" protocol.
Any changes must be approved by the project owner.
-->

# LOCAL DEV - HYBRID LEAN

## CHIẾN LƯỢC
| Component | Vị trí | Lý do |
|-----------|--------|-------|
| Directus + Nuxt | **LOCAL** | Tiết kiệm Cloud Run cost |
| Agent Data | **CLOUD** | Đã ổn định, tận dụng internal network |
| Cloud SQL + GCS | **CLOUD** | Data thật, sync real-time |

## ⚠️ PREREQUISITES (Bắt buộc trước khi bắt đầu)

### A. Fix Cloud Run (Một lần duy nhất)
Cloud Run hiện thiếu storage config. Chạy lệnh sau:
```bash
gcloud run services update directus-test \
  --region=asia-southeast1 \
  --set-env-vars="STORAGE_LOCATIONS=gcs,STORAGE_GCS_DRIVER=gcs,STORAGE_GCS_BUCKET=directus-assets-test-20251223"
```

### B. Xác thực Docker Registry
Custom image nằm trên Private Registry, cần xác thực:
```bash
gcloud auth configure-docker asia-southeast1-docker.pkg.dev
```

## 3 BƯỚC DUY NHẤT

### BƯỚC 1: Chuẩn bị môi trường
```bash
# 1.1 Export SA key (KHÔNG tạo mới!)
gcloud iam service-accounts keys create ./dot/config/google-credentials.json \
  --iam-account=chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com

# 1.2 Xác thực Docker Registry (bắt buộc cho custom image)
gcloud auth configure-docker asia-southeast1-docker.pkg.dev

# 1.3 Chặn commit
echo "dot/config/google-credentials.json" >> .gitignore
```

### BƯỚC 2: Tạo file config
**Tạo `docker-compose.local.yml`:**
```yaml
version: '3.8'
services:
  sql-proxy:
    image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.0
    command: ["--credentials-file=/secrets/google-credentials.json", 
              "--address=0.0.0.0", "--port=3306",
              "github-chatgpt-ggcloud:asia-southeast1:mysql-directus-web-test"]
    volumes:
      - ./dot/config/google-credentials.json:/secrets/google-credentials.json:ro
    ports: ["3306:3306"]

  directus:
    image: asia-southeast1-docker.pkg.dev/github-chatgpt-ggcloud/web-test/directus:latest
    depends_on: [sql-proxy]
    environment:
      DB_CLIENT: mysql
      DB_HOST: sql-proxy
      DB_PORT: 3306
      DB_DATABASE: ${DB_DATABASE}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      SECRET: ${DIRECTUS_SECRET}
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      PUBLIC_URL: http://localhost:8055
      STORAGE_LOCATIONS: gcs
      STORAGE_GCS_DRIVER: gcs
      STORAGE_GCS_BUCKET: ${DIRECTUS_STORAGE_BUCKET}
      STORAGE_GCS_KEY_FILENAME: /secrets/google-credentials.json
      CORS_ENABLED: "true"
      CORS_ORIGIN: "http://localhost:3000"
    ports: ["8055:8055"]
    volumes:
      - ./dot/config/google-credentials.json:/secrets/google-credentials.json:ro

  nuxt:
    build: {context: ./web, dockerfile: Dockerfile.local}
    depends_on: [directus]
    environment:
      NUXT_DIRECTUS_URL: http://directus:8055
      NUXT_PUBLIC_DIRECTUS_URL: http://localhost:8055
    ports: ["3000:3000"]
    volumes: [./web:/app, /app/node_modules]
```

**Tạo `.env.local`:**
```env
DB_DATABASE=directus
DB_USER=directus
DB_PASSWORD=<từ Secret Manager>
DIRECTUS_SECRET=<từ Secret Manager>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<từ Secret Manager>
DIRECTUS_STORAGE_BUCKET=directus-assets-test-20251223
```

**Tạo `web/Dockerfile.local`:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]
```

### BƯỚC 3: Chạy & Verify
```bash
# Start
docker-compose -f docker-compose.local.yml up -d

# Verify (sau 30s)
curl http://localhost:8055/server/health   # Directus OK?
curl http://localhost:3000                  # Nuxt OK?
curl http://localhost:8055/items/globals   # Data sync?
# Verify ảnh từ GCS hiển thị đúng
# Mở http://localhost:3000 -> xem ảnh load từ GCS không bị vỡ
```

## CHECKLIST HOÀN THÀNH
- [ ] Directus: http://localhost:8055 ✅
- [ ] Nuxt: http://localhost:3000 ✅
- [ ] Data khớp với Cloud SQL ✅
- [ ] Upload ảnh → Thấy trên GCS ✅

## GHI NHỚ
- Agent Data gọi qua: `https://agent-data-test-pfne2mqwja-as.a.run.app`
- KHÔNG thêm agent-data service vào docker-compose
- Bucket: `directus-assets-test-20251223` (Legacy, đang active)

## ⚠️ GHI CHÚ VẬN HÀNH (QUAN TRỌNG)

### 1. Env Var Drift
Sửa Env ở Local → **PHẢI update ngay lên Cloud Run**.
Không đợi đến lúc deploy mới nhớ.

### 2. Live Database Danger
Local kết nối **trực tiếp Cloud SQL** (không phải DB nháp).
- Xóa Field/Collection ở Local = Mất trên Cloud ngay lập tức
- **Luôn chạy `dot-backup` trước khi sửa Schema**

### 3. CORS Domain
| Môi trường | CORS_ORIGIN |
|------------|-------------|
| Local | `http://localhost:3000` |
| Cloud | `https://ai.incomexsaigoncorp.vn` |

Đảm bảo Cloud Run đã set đúng domain thật.
