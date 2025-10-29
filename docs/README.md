# Web-Test Documentation

Welcome to the web-test project documentation. This directory contains comprehensive guides for setting up and maintaining the bilingual student/job portal system.

## 📚 Documentation Index

### Setup & Configuration
- **[Directus Schema Definitions](./directus-schemas.md)** - Complete guide for setting up CMS collections (Students, Jobs, Affiliate) with bilingual support
- **[Infrastructure Documentation](./infrastructure.md)** - Complete IaC setup for all services (Directus, Kestra, Chatwoot) ✅ **NEW**

### Architecture
- **Technology Stack**:
  - Frontend: Nuxt 3 + Vue 3
  - CMS: Directus (Cloud Run + MySQL)
  - Workflow Engine: Kestra (Cloud Run + PostgreSQL)
  - Customer Support: Chatwoot (Cloud Run + PostgreSQL + Redis)
  - Database: Cloud SQL (MySQL, 2x PostgreSQL)
  - Auth: Firebase Authentication
  - API: FastAPI Agent Data
  - i18n: @nuxtjs/i18n (Vietnamese/Japanese)
  - Infrastructure: Terraform (IaC)

### Quick Links
- [Nuxt.js Documentation](https://nuxt.com/docs)
- [Directus Documentation](https://docs.directus.io/)
- [Firebase Auth](https://firebase.google.com/docs/auth)

## 🚀 Getting Started

### Prerequisites
1. Node.js 18+ installed
2. Access to GCP project: `github-chatgpt-ggcloud`
3. Firebase project configured
4. Directus instance running (Cloud Run)

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:3000
```

### Environment Variables

Create a `.env` file with:

```bash
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_DIRECTUS_URL=https://directus-test-xxx.run.app
```

## 📖 Infrastructure Sprints Status

### ✅ Sprint 1: Directus + MySQL (Completed)
- [x] Nuxt 3 project setup
- [x] Firebase Authentication integration
- [x] Directus SDK integration
- [x] i18n configuration (Vietnamese/Japanese)
- [x] Terraform infrastructure (Cloud Run, Cloud SQL MySQL)
- [x] Schema documentation (Students, Jobs, Affiliate)

### ✅ Sprint 2: Kestra + PostgreSQL (Completed)
- [x] Kestra Cloud Run service deployment
- [x] PostgreSQL Cloud SQL instance
- [x] Cloud SQL Proxy sidecar pattern
- [x] Workflow orchestration platform ready

### ✅ Sprint 3: Chatwoot + PostgreSQL (Completed)
- [x] Chatwoot Cloud Run service deployment
- [x] PostgreSQL Cloud SQL instance for Chatwoot
- [x] Redis sidecar for caching/queues
- [x] Database migration automation
- [x] URL-encoded password security fixes
- [x] Multi-container Cloud Run setup

### 🎉 Infrastructure Milestone
**Status**: ✅ **Production Ready** (v0.1.0-infra-ready)

All infrastructure components deployed, tested, and verified. Ready for application feature development.

See [infrastructure.md](./infrastructure.md) for complete details.

### 🔄 Next Phase: Application Development
- [ ] Directus collection setup (manual via UI)
- [ ] Kestra workflow definitions
- [ ] Chatwoot widget integration
- [ ] Frontend-backend integration
- [ ] Sample data creation

## 🌐 Internationalization (i18n)

The application supports two languages:

- **Vietnamese (vi)** - Default language
- **Japanese (ja)** - Available via `/ja` prefix

### Language Files
- `locales/vi.json` - Vietnamese translations
- `locales/ja.json` - Japanese translations

### Usage in Components

```vue
<template>
  <div>
    <h1>{{ $t('common.welcome') }}</h1>
    <p>{{ $t('students.title') }}</p>
  </div>
</template>
```

### Language Switcher

```vue
<template>
  <NuxtLink
    v-for="locale in availableLocales"
    :key="locale.code"
    :to="switchLocalePath(locale.code)"
  >
    {{ locale.name }}
  </NuxtLink>
</template>
```

## 🗄️ CMS Collections

### Students
Bilingual student profiles with academic information.

**Key Fields**: full_name, email, major, bio (all with VN/JA translations)

### Jobs
Employment opportunities for students and alumni.

**Key Fields**: job_title, company_name, description, requirements (bilingual)

### Affiliate
Partner organizations and institutions.

**Key Fields**: name, type, description, partnership_type (bilingual)

**Full Schema Details**: See [directus-schemas.md](./directus-schemas.md)

## 🔗 API Integration

### Directus SDK

```javascript
import { createDirectus, rest, readItems } from '@directus/sdk';

const directus = createDirectus(process.env.VITE_DIRECTUS_URL).with(rest());

// Fetch published jobs
const jobs = await directus.request(
  readItems('jobs', {
    filter: { status: { _eq: 'published' } },
    fields: ['*', 'job_title_translations.*']
  })
);
```

### Firebase Auth

```javascript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();
await signInWithEmailAndPassword(auth, email, password);
```

## 📊 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### CI/CD
Deployments are automated via GitHub Actions:
- On push to `main`: Deploy to production
- On PR: Run tests and quality checks

## 🛠️ Troubleshooting

### Common Issues

**Issue**: i18n routes not working
**Solution**: Ensure `strategy: 'prefix_except_default'` in nuxt.config.ts

**Issue**: Directus connection fails
**Solution**: Check VITE_DIRECTUS_URL is correct and instance is running

**Issue**: Firebase auth errors
**Solution**: Verify all Firebase env variables are set correctly

## 📞 Support

For questions or issues:
1. Check existing documentation
2. Review [Directus Schema Guide](./directus-schemas.md)
3. Contact development team

---

**Last Updated**: 2025-10-29
**Project**: web-test
**Phase**: Infrastructure Complete (Sprints 1-3)
**Next Phase**: Application Development
