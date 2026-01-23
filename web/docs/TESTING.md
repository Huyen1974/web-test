# Testing Guide

This document describes the minimal test commands for production validation.

## Quick Checks

- Health check (4-layer):
```bash
npm run health
```

- E2E login tests against production:
```bash
npm run test:e2e:prod
```

## DOT Tools

- Schema check:
```bash
npm run dot:schema
```

- Cost audit:
```bash
npm run dot:cost
```

## Notes
- The E2E production tests run against https://ai.incomexsaigoncorp.vn.
- Use production credentials only when required by the test.
