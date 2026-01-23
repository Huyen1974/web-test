# DOT Cost Audit

Purpose
- Summarize Cloud Run service configuration that influences cost.

Requirements
- gcloud CLI authenticated

Environment
- GCP_PROJECT (optional, default: github-chatgpt-ggcloud)
- GCP_REGION (optional, default: asia-southeast1)

Usage
```bash
./dot/bin/dot-cost-audit
```

Output
- Service name, CPU, memory, min/max scale.

Notes
- This is a configuration snapshot only; it does not query billing data.
