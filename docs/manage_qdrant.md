# Qdrant Management Cloud Function

## Overview

The `manage_qdrant` Cloud Function provides automated cluster management for Qdrant Cloud clusters, including backup creation, cluster suspension, and status monitoring.

## Endpoints

**Base URL:** `https://asia-southeast1-github-chatgpt-ggcloud.cloudfunctions.net/manage_qdrant`

### GET ?action=status

Returns current cluster status and endpoint.

**Response:**
```json
{
  "status": "ok",
  "phase": "CLUSTER_PHASE_HEALTHY",
  "endpoint": "https://cluster-id.region.gcp.cloud.qdrant.io"
}
```

**Possible phases:**
- `CLUSTER_PHASE_HEALTHY` - Cluster is running normally
- `CLUSTER_PHASE_SUSPENDED` - Cluster is suspended/stopped

### GET ?action=stop

Creates backup and suspends the cluster.

**Process:**
1. Check current phase (skip if already SUSPENDED)
2. Create backup via Qdrant Backup API
3. Suspend cluster via Cluster Management API
4. Wait for phase to become SUSPENDED (polling with timeout)

**Response:**
```json
{
  "status": "ok",
  "phase": "CLUSTER_PHASE_SUSPENDED",
  "backup_id": "214dffaa-e838-4291-a802-8beb31e43ab3"
}
```

**Error responses:**
```json
{"error": "backup_creation_failed"}
{"error": "suspend_failed"}
```

### GET ?action=touch

Updates the idle marker timestamp in Secret Manager without affecting cluster state.

**Response:**
```json
{
  "status": "ok",
  "action": "touch",
  "last_hit": "1753434833",
  "secret_updated": true
}
```

## Environment Variables

### Required
- `PROJECT_ID` - GCP Project ID
- `QDRANT_ACCOUNT_ID` - Qdrant Cloud account ID
- `QDRANT_CLUSTER_ID` - Target cluster ID
- `QDRANT_MGMT_KEY` - Qdrant management API key (from Secret Manager)

### Optional
- `AUTO_STOP_MINUTES` - Auto-stop timeout (default: 60)
- `QDRANT_API_BASE` - Cluster API base URL (default: cluster v1 API)
- `QDRANT_BACKUP_BASE` - Backup API base URL (default: backup v1 API)

## API Routes

### Cluster Management
- **Base:** `https://api.cloud.qdrant.io/api/cluster/v1`
- **Auth:** `Authorization: apikey <MGMT_KEY>`
- **Operations:**
  - `GET /accounts/{ACC}/clusters/{CLUS}` - Get cluster info
  - `POST /accounts/{ACC}/clusters/{CLUS}/suspend` - Suspend cluster

### Backup Management
- **Base:** `https://api.cloud.qdrant.io/api/cluster/backup/v1`
- **Auth:** `Authorization: apikey <MGMT_KEY>`
- **Operations:**
  - `POST /accounts/{ACC}/backups` - Create backup
  - `GET /accounts/{ACC}/backups` - List backups

## Deployment

```bash
gcloud functions deploy manage_qdrant \
  --gen2 --runtime=python313 \
  --region=asia-southeast1 \
  --source . --trigger-http \
  --allow-unauthenticated \
  --entry-point=handle \
  --service-account=chatgpt-deployer@github-chatgpt-ggcloud.iam.gserviceaccount.com \
  --timeout=900 \
  --set-env-vars "PROJECT_ID=github-chatgpt-ggcloud,QDRANT_ACCOUNT_ID=b7093834-20e9-4206-8ea0-025b6994b319,QDRANT_CLUSTER_ID=529a17a6-01b8-4304-bc5c-b936aec8fca9,AUTO_STOP_MINUTES=60,QDRANT_API_BASE=https://api.cloud.qdrant.io/api/cluster/v1,QDRANT_BACKUP_BASE=https://api.cloud.qdrant.io/api/cluster/backup/v1" \
  --set-secrets "QDRANT_MGMT_KEY=projects/github-chatgpt-ggcloud/secrets/Qdrant_cloud_management_key:latest"
```

## Logging

All operations log structured JSON with:
- `action` - Operation type (backup_completed, stop, touch, etc.)
- `backup_id` - Created backup ID
- `elapsed_ms` - Operation duration
- `phase` - Cluster phase
- `error` - Error details if any

Example logs:
```json
{"action": "backup_completed", "backup_id": "backup-456", "elapsed_ms": 1234}
{"action": "stop", "backup_id": "backup-456", "phase": "CLUSTER_PHASE_SUSPENDED", "ms": 45678}
```

## Manual Cluster Restore

**Note:** Resume/start functionality is intentionally removed. Cluster restoration must be done manually via Qdrant Cloud Console:

1. **Reactivate Cluster:**
   - Login to Qdrant Cloud Console
   - Navigate to suspended cluster
   - Click "Reactivate Cluster"
   - Wait for status to become Healthy

2. **Restore Data:**
   - Go to Backups tab
   - Find desired backup in "Available Backups"
   - Click Actions → Restore
   - Enter cluster name for confirmation: `agent_data_vector_paid_sg`
   - Monitor "Restores" section until status is SUCCEEDED

3. **Verify Data:**
   ```bash
   CLUSTER_ENDPOINT="https://cluster-id.region.gcp.cloud.qdrant.io"
   DATA_KEY=$(gcloud secrets versions access latest --secret="Qdrant_agent_data_N1D8R2vC0_5")
   curl -X POST "$CLUSTER_ENDPOINT/collections/test_documents/points/count" \
     -H "api-key: $DATA_KEY" \
     -H "Content-Type: application/json" -d '{"exact": true}'
   ```

## Preflight Check

Before deployment, run preflight validation:

```bash
python scripts/preflight_check.py
```

Validates:
- Environment variables
- Management key access
- API connectivity (cluster v1 + backup v1)
- Authentication headers

## Testing

Unit tests cover:
- Cluster status retrieval
- Stop operation (backup → suspend)
- Backup base URL selection
- Secret Manager integration

Run tests:
```bash
python -m pytest tests/test_agent_data_unit.py::TestQdrantManagement -v
```

Current test count: **53 tests** (locked in `tests/TEST_COUNT.lock`)

## Error Handling

Common issues:
- **401 Unauthorized** - Invalid MGMT_KEY in secret
- **backup_creation_failed** - API timeout or cluster not ready
- **suspend_failed** - Cluster may already be in transition

Check Cloud Function logs for detailed error information:
```bash
gcloud functions logs read manage_qdrant --region=asia-southeast1 --limit=20
```

## Security

- Management key stored in Secret Manager
- Service account with minimal permissions
- No resume API to prevent unauthorized cluster starts
- Structured logging without secret exposure
