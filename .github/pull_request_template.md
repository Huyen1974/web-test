## Ops Safety Checklist (MANDATORY)

- [ ] I did NOT use `gcloud run services update --set-env-vars` (replace mode). I used `--update-env-vars`.
- [ ] If I changed Directus or Nuxt URLs, I updated `docs/ops/DIRECTUS_GOLDEN_STATE.md`.
- [ ] Ops Smoke Test (`ops-smoke`) is GREEN.
- [ ] I have verified any new config changes against `docs/ops/DIRECTUS_GOLDEN_STATE.md`.
