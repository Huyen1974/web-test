# Minimum Cost SQL Module (Fixed)

This is a local fork of the `minimum_cost_sql` module from `platform-infra` v1.1.0 with fixes for working with stopped Cloud SQL instances.

## Fixes Applied

### 1. Handle Stopped Instance State (activation_policy = NEVER)

**Problem**: When a Cloud SQL instance has `activation_policy = "NEVER"` (stopped state), Terraform fails during state refresh with error:
```
Error: Invalid request since instance is not running
```

This occurs because Google Cloud SQL API returns HTTP 400 when trying to read `google_sql_user` resource from a stopped instance.

**Solution**: Added `lifecycle.ignore_changes` block to `google_sql_user` resource to prevent Terraform from refreshing the user state when the instance is stopped.

---

Cost-optimized Cloud SQL instance with required security features.

## Cost Optimization Features

- **REQUIRED**: db-f1-micro tier (smallest/cheapest)
- **REQUIRED**: ZONAL availability (not regional)
- **REQUIRED**: NEVER activation policy (start manually)
- **REQUIRED**: Deletion protection enabled
- **REQUIRED**: Backups and binary logging enabled

## Usage

```hcl
module "my_database" {
  source = "../../modules/minimum_cost_sql"

  project_id       = "my-project"
  region           = "asia-southeast1"
  instance_name    = "my-sql-instance"
  database_version = "MYSQL_8_0"
  database_name    = "mydb"

  disk_size = 10
  disk_type = "PD_SSD"

  backup_start_time        = "03:00"
  backup_retained_backups  = 7

  create_user   = true
  user_name     = "myuser"
  user_password = var.db_password  # Use variables for sensitive data
}
```

## Important Notes

- **Activation Policy**: Set to `NEVER` to minimize costs. Instance must be started manually when needed.
- **Deletion Protection**: Always enabled to prevent accidental deletion.
- **Tier**: Fixed at `db-f1-micro` for cost optimization.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| project_id | GCP project ID | string | - | yes |
| instance_name | Cloud SQL instance name | string | - | yes |
| database_name | Database name | string | - | yes |
| database_version | Database version | string | "MYSQL_8_0" | no |
| disk_size | Disk size in GB | number | 10 | no |

## Outputs

| Name | Description |
|------|-------------|
| instance_name | Name of the Cloud SQL instance |
| instance_connection_name | Connection name for Cloud SQL proxy |
| database_name | Name of the database |
