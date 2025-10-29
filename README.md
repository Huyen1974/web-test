# Web Application V7 (Stack A+)

This repository contains the new web application built with Nuxt, Directus, Kestra, and Chatwoot.

## Technology Stack

- **Frontend**: Nuxt 3 (Vue.js framework)
- **Backend CMS**: Directus
- **Workflow Orchestration**: Kestra
- **Customer Support**: Chatwoot

## Getting Started

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Infrastructure

The infrastructure is managed with Terraform in the `terraform/` directory.

**Status**: ✅ Production Ready (v0.1.0-infra-ready)

### Deployed Services
- **Directus** (CMS) - Cloud Run + Cloud SQL MySQL
- **Kestra** (Workflow Orchestration) - Cloud Run + Cloud SQL PostgreSQL
- **Chatwoot** (Customer Support) - Cloud Run + Cloud SQL PostgreSQL + Redis

All services are deployed, verified, and ready for application development.

For complete infrastructure documentation, see [docs/infrastructure.md](./docs/infrastructure.md).
