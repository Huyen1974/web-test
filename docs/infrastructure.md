# Infrastructure Documentation

**Status**: ✅ Production Ready
**Last Updated**: 2025-10-29
**Version**: v0.1.0-infra-ready

---

## 🎯 Overview

This document describes the complete Infrastructure as Code (IaC) setup for the web-test project, covering all infrastructure components deployed across Sprints 1, 2, and 3.

**Infrastructure Status**: All services are deployed, verified, and ready for application development.

---

## 🏗️ Architecture Summary

### Deployed Services (Cloud Run)

| Service | Sprint | Database | Region | Status |
|---------|--------|----------|--------|--------|
| **Directus** | Sprint 1 | Cloud SQL MySQL | asia-southeast1 | ✅ Ready |
| **Kestra** | Sprint 2 | Cloud SQL PostgreSQL | asia-southeast1 | ✅ Ready |
| **Chatwoot** | Sprint 3 | Cloud SQL PostgreSQL | asia-southeast1 | ✅ Ready |

### Database Instances

| Instance | Type | Version | Purpose | Status | Activation Policy |
|----------|------|---------|---------|--------|-------------------|
| mysql-directus-web-test | MySQL | 8.0 | Directus CMS data | ✅ Ready | NEVER (Manual start) |
| postgres-kestra-web-test | PostgreSQL | 15 | Kestra workflow metadata | ✅ Ready | NEVER (Manual start) |
| postgres-chatwoot-web-test | PostgreSQL | 15 | Chatwoot customer data | ✅ Ready | NEVER (Manual start) |

---

## 📦 Sprint 1: Directus + MySQL

### Components
- **Cloud Run Service**: `directus-test`
  - Image: `directus/directus:latest`
  - Port: 8080
  - Resources: 2 CPU, 2Gi Memory
  - Authentication: Public access (allUsers)

- **Cloud SQL MySQL**: `mysql-directus-web-test`
  - Database: `directus`
  - User: `directus` (Cloud SQL type)
  - Disk: 10GB SSD (auto-resize to 30GB)
  - Backup: Daily at 03:00

### Environment Variables
- `DB_CLIENT=mysql`
- `DB_HOST=127.0.0.1` (via Cloud SQL Proxy sidecar)
- `DB_PORT=3306`
- `DB_DATABASE=directus`
- `DB_USER=directus`
- `DB_PASSWORD` (from Secret Manager: `DIRECTUS_DB_PASSWORD_test`)
- `KEY` (from Secret Manager: `DIRECTUS_KEY_test`)
- `SECRET` (from Secret Manager: `DIRECTUS_SECRET_test`)

### Infrastructure Files
- `terraform/directus_service.tf` - Cloud Run service definition
- `terraform/directus_db.tf` - MySQL instance configuration

### Pull Requests
- Initial deployment: Various PRs in Sprint 1
- Database fixes: PRs #14-18

---

## 🔄 Sprint 2: Kestra + PostgreSQL

### Components
- **Cloud Run Service**: `kestra-test`
  - Image: `kestra/kestra:latest`
  - Port: 8080 (consolidated from 8080/8081)
  - Resources: 2 CPU, 4Gi Memory
  - Command: `server standalone`
  - Authentication: Public access (allUsers)

- **Cloud SQL PostgreSQL**: `postgres-kestra-web-test`
  - Database: `kestra`
  - User: `kestra` (Cloud SQL type)
  - Disk: 10GB SSD (auto-resize to 30GB)
  - Backup: Daily at 03:00

### Environment Variables
- `MICRONAUT_ENVIRONMENTS=google`
- `KESTRA_CONFIGURATION=/app/confs/application-prod.yaml`
- `KESTRA_DATASOURCES_POSTGRES_URL=jdbc:postgresql://127.0.0.1:5432/kestra`
- `KESTRA_DATASOURCES_POSTGRES_USERNAME=kestra`
- `KESTRA_DATASOURCES_POSTGRES_PASSWORD` (from Secret Manager)
- `KESTRA_ENCRYPTION_SECRET_KEY` (from Secret Manager)
- `KESTRA_SECRET_KEY` (from Secret Manager)

### Infrastructure Files
- `terraform/kestra_service.tf` - Cloud Run service with PostgreSQL proxy sidecar
- `terraform/kestra_db.tf` - PostgreSQL instance configuration

### Pull Requests
- Initial deployment: PR #17
- Sprint 2 integration: PR #19
- Port consolidation fix: PR #21
- Comprehensive startup fixes: PR #20

---

## 💬 Sprint 3: Chatwoot + PostgreSQL

### Components
- **Cloud Run Service**: `chatwoot-test`
  - Image: `chatwoot/chatwoot:latest`
  - Port: 8080
  - Resources: 2 CPU, 2Gi Memory
  - Command: Rails server with database migrations
  - Authentication: Public access (allUsers)
  - Sidecars: Cloud SQL Proxy (PostgreSQL), Redis

- **Cloud SQL PostgreSQL**: `postgres-chatwoot-web-test`
  - Database: `chatwoot`
  - User: `chatwoot` (Cloud SQL type)
  - Disk: 10GB SSD (auto-resize to 30GB)
  - Backup: Daily at 03:00

### Environment Variables
- `RAILS_ENV=production`
- `NODE_ENV=production`
- `FRONTEND_URL=https://chatwoot-test-{project}.run.app`
- `POSTGRES_HOST=127.0.0.1` (via Cloud SQL Proxy)
- `POSTGRES_PORT=5432`
- `POSTGRES_USERNAME=chatwoot`
- `POSTGRES_DATABASE=chatwoot`
- `DATABASE_URL` (from Secret Manager with URL-encoded password)
- `REDIS_URL` (from Secret Manager with URL-encoded password)
- `SECRET_KEY_BASE` (from Secret Manager)
- `ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY` (from Secret Manager)
- `ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY` (from Secret Manager)
- `ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT` (from Secret Manager)
- `MAILER_SENDER_EMAIL=noreply@chatwoot-test.local`

### Critical Features
1. **Database Migrations**: Auto-runs `bundle exec rails db:chatwoot_prepare` on startup
2. **Redis Sidecar**: Embedded Redis container for caching/queues
3. **URL-Encoded Passwords**: Passwords properly encoded in connection strings
4. **Extended Startup Probe**: 50 failure threshold (~8.3 min timeout) for migrations

### Infrastructure Files
- `terraform/chatwoot_service.tf` - Cloud Run service with multi-container setup
- `terraform/chatwoot_db.tf` - PostgreSQL instance configuration

### Pull Requests
- Initial deployment: PR #22
- Comprehensive fixes (migrations, Redis URL, probes, env vars): PR #23
- URL encoding security fix: Commit 4f4778a on PR #23

---

## 🔐 Secret Manager

### Secrets Created

#### Directus
- `DIRECTUS_KEY_test` - Encryption key
- `DIRECTUS_SECRET_test` - Session secret
- `DIRECTUS_DB_PASSWORD_test` - MySQL password

#### Kestra
- `kestra-db-password-test` - PostgreSQL password
- `kestra-encryption-key-test` - Data encryption key
- `kestra-secret-key-test` - Application secret

#### Chatwoot
- `CHATWOOT_SECRET_KEY_BASE_test` - Rails secret key base
- `CHATWOOT_POSTGRES_PASSWORD_test` - PostgreSQL password
- `CHATWOOT_REDIS_PASSWORD_test` - Redis password
- `CHATWOOT_REDIS_URL_test` - Full Redis connection string (URL-encoded)
- `CHATWOOT_DATABASE_URL_test` - Full PostgreSQL connection string (URL-encoded)
- `CHATWOOT_ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY_test`
- `CHATWOOT_ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY_test`
- `CHATWOOT_ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT_test`

### IAM Permissions
All secrets grant `roles/secretmanager.secretAccessor` to:
- Service Account: `{project-number}-compute@developer.gserviceaccount.com`

---

## 🌍 Regional Configuration

### Primary Region
- **Region**: `asia-southeast1` (Singapore)
- **Zone**: Multi-zone deployment for Cloud SQL
- **Reason**: Optimal latency for Southeast Asian users

### SQL Region
- **SQL Region**: `asia-southeast1`
- **Backup Region**: Same region (asia-southeast1)

---

## 💾 Database Management

### Cost Optimization Strategy

All databases use `activation_policy = NEVER` (manual start/stop) to minimize costs when not in use.

#### Starting Databases
```bash
# Start Directus MySQL
gcloud sql instances patch mysql-directus-web-test \
  --activation-policy=ALWAYS \
  --project=web-test-449003

# Start Kestra PostgreSQL
gcloud sql instances patch postgres-kestra-web-test \
  --activation-policy=ALWAYS \
  --project=web-test-449003

# Start Chatwoot PostgreSQL
gcloud sql instances patch postgres-chatwoot-web-test \
  --activation-policy=ALWAYS \
  --project=web-test-449003
```

#### Stopping Databases
```bash
# Stop all databases
gcloud sql instances patch mysql-directus-web-test \
  --activation-policy=NEVER \
  --project=web-test-449003

gcloud sql instances patch postgres-kestra-web-test \
  --activation-policy=NEVER \
  --project=web-test-449003

gcloud sql instances patch postgres-chatwoot-web-test \
  --activation-policy=NEVER \
  --project=web-test-449003
```

### Backup Configuration
- **Frequency**: Daily
- **Start Time**: 03:00 (regional time)
- **Retained Backups**: 7 days
- **Transaction Log Retention**: 7 days (PostgreSQL)
- **Binary Log**: Enabled (MySQL)

---

## 🚀 Deployment

### Terraform Commands

#### Plan
```bash
cd terraform
terraform init
terraform plan \
  -var="project_id=web-test-449003" \
  -var="env=test"
```

#### Apply
```bash
terraform apply \
  -var="project_id=web-test-449003" \
  -var="env=test"
```

#### Destroy (Caution!)
```bash
terraform destroy \
  -var="project_id=web-test-449003" \
  -var="env=test"
```

### CI/CD Pipeline

**Workflow**: `.github/workflows/deploy.yml`

**Triggers**:
- Push to `main` branch
- Pull request (plan only)

**Jobs**:
1. **Pass Gate** - Nuxt type check
2. **Quality Gate** - ESLint, package.json validation
3. **E2E Smoke Test** - Nuxt build verification
4. **Guard Bootstrap Scaffold** - Terraform structure validation
5. **Terraform Deploy** - Format, init, validate, plan/apply

**Terraform Plan** runs on all PRs and comments the plan output automatically.

---

## ✅ Verification & Health Checks

### Service URLs

Access the deployed services at:

```bash
# Get service URLs
gcloud run services describe directus-test \
  --region=asia-southeast1 \
  --project=web-test-449003 \
  --format="value(status.url)"

gcloud run services describe kestra-test \
  --region=asia-southeast1 \
  --project=web-test-449003 \
  --format="value(status.url)"

gcloud run services describe chatwoot-test \
  --region=asia-southeast1 \
  --project=web-test-449003 \
  --format="value(status.url)"
```

### Health Check Endpoints

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| Directus | `/server/health` | 200 OK |
| Kestra | `/health` | 200 OK (JSON status) |
| Chatwoot | `/` | 200 OK (Rails app) |

### Verification Checklist

- [x] All Cloud Run services deployed and Ready
- [x] All database instances created with correct users
- [x] Database instances in NEVER/STOPPED state (cost optimization)
- [x] All secrets created in Secret Manager
- [x] IAM permissions configured for service accounts
- [x] Health check probes configured (startup, liveness)
- [x] Sidecar containers working (Cloud SQL Proxy, Redis)
- [x] Database migrations run successfully (Chatwoot)
- [x] Public access configured (allUsers invoker role)
- [x] Monitoring dashboard created
- [x] CI/CD pipeline operational

---

## 📊 Monitoring

### Cloud Monitoring Dashboard
- **Dashboard ID**: `3a118b21-726c-4cf7-bf54-168136b180bb`
- **Name**: web_test_services_dashboard

### Metrics Tracked
- Service request count
- Service request latencies
- Service error rate
- Database connections
- Container resource utilization (CPU, Memory)

### Logs
View logs for each service:
```bash
# Directus logs
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="directus-test"' --limit=50 --project=web-test-449003

# Kestra logs
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="kestra-test"' --limit=50 --project=web-test-449003

# Chatwoot logs
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="chatwoot-test"' --limit=50 --project=web-test-449003
```

---

## 🔧 Troubleshooting

### Common Issues

#### Service Not Starting
1. Check Cloud Run logs: `gcloud run services logs read {service-name}`
2. Verify database is running: `gcloud sql instances describe {instance-name}`
3. Check secrets exist: `gcloud secrets list --project=web-test-449003`
4. Verify IAM permissions on secrets

#### Database Connection Failed
1. Ensure Cloud SQL Proxy sidecar is running
2. Verify database user exists: `gcloud sql users list --instance={instance-name}`
3. Check password in Secret Manager
4. For Chatwoot: Verify URL-encoded passwords in connection strings

#### Startup Probe Timeout
- **Directus**: Should start within ~60s
- **Kestra**: May take 2-3 minutes (complex initialization)
- **Chatwoot**: May take 5-8 minutes (database migrations on first start)

#### Chatwoot-Specific Issues
- **Migration errors**: Check Rails logs for schema issues
- **Redis connection**: Verify Redis sidecar is healthy
- **URL encoding**: Passwords with special chars must use URL-encoded secrets

---

## 🎯 Next Steps

### Infrastructure Ready For:

1. **Application Development**
   - Frontend integration with Directus CMS
   - Kestra workflow definitions
   - Chatwoot widget embedding

2. **Data Migration**
   - Import existing student/job data to Directus
   - Configure Kestra pipelines
   - Set up Chatwoot accounts and inboxes

3. **Integration Testing**
   - End-to-end API tests
   - Workflow execution tests
   - Customer support flow tests

4. **Production Preparation**
   - Custom domains setup
   - SSL certificates
   - Performance tuning
   - Security hardening

---

## 📝 Infrastructure Changes Log

### Sprint 1 (Directus)
- Initial Terraform setup
- Directus Cloud Run service
- MySQL Cloud SQL instance
- Secret Manager integration

### Sprint 2 (Kestra)
- Kestra Cloud Run service with PostgreSQL
- Cloud SQL Proxy sidecar pattern
- Port consolidation (8080 only)
- Configuration file mounting

### Sprint 3 (Chatwoot)
- Multi-container Cloud Run (Rails + Proxy + Redis)
- Database migration automation
- URL-encoded connection strings
- Extended startup probes
- Comprehensive environment variables

### Post-Sprint 3 Fixes
- URL encoding security fix for passwords (PR #23, commit 4f4778a)
- Database user creation enabled
- Monitoring dashboard updates

---

## 🏆 Milestone: Infrastructure Complete

**Tag**: `v0.1.0-infra-ready`
**Commit**: `931a8f4`
**Date**: 2025-10-29

All infrastructure components for Sprints 1-3 are deployed, tested, and verified as production-ready. The platform is now ready for application feature development.

---

**Document Maintained By**: Infrastructure Team
**Contact**: Via GitHub Issues in `Huyen1974/web-test` repository
