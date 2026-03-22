# Testing Guide

This document describes the minimal test commands for production validation.

## Quick Checks

- Health check (4-layer):
```bash
pnpm run health
```

- Registry regression suite against the local preview build:
```bash
REGISTRY_E2E_FIXTURES=1 pnpm run test:e2e
```

- E2E smoke tests against production:
```bash
pnpm run test:e2e:prod
```

## DOT Tools

- Schema check:
```bash
pnpm run dot:schema
```

- Cost audit:
```bash
pnpm run dot:cost
```

## Notes
- PR CI runs the registry browser suite against a local preview build.
- `REGISTRY_E2E_FIXTURES=1` enables stable fixtures for registry health/unmanaged endpoints when CI does not have a Directus service token.
- The production smoke suite runs against https://vps.incomexsaigoncorp.vn.
