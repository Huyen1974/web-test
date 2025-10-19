#!/bin/bash
# Terraform State Migration Script
# Migrates existing resources to use platform-infra modules

set -e

echo "===================================================================="
echo "Terraform State Migration for web-test"
echo "Migrating to platform-infra@v1.0.0 modules"
echo "===================================================================="
echo ""

# Change to terraform directory
cd "$(dirname "$0")"

echo "Step 1: Migrating Cloud SQL instance..."
terraform state mv \
  'google_sql_database_instance.managed' \
  'module.managed_sql.google_sql_database_instance.instance'

echo "Step 2: Migrating Cloud SQL database..."
terraform state mv \
  'google_sql_database.managed_db' \
  'module.managed_sql.google_sql_database.database' 2>/dev/null || echo "  (database resource may not exist in state)"

echo "Step 3: Migrating GCS buckets..."
terraform state mv \
  'google_storage_bucket.huyen1974_agent_data_artifacts_test' \
  'module.bucket_artifacts.google_storage_bucket.bucket'

terraform state mv \
  'google_storage_bucket.huyen1974_agent_data_knowledge_test' \
  'module.bucket_knowledge.google_storage_bucket.bucket'

terraform state mv \
  'google_storage_bucket.huyen1974_agent_data_logs_test' \
  'module.bucket_logs.google_storage_bucket.bucket'

terraform state mv \
  'google_storage_bucket.huyen1974_agent_data_qdrant_snapshots_test' \
  'module.bucket_qdrant_snapshots.google_storage_bucket.bucket'

terraform state mv \
  'google_storage_bucket.huyen1974_agent_data_source_test' \
  'module.bucket_source.google_storage_bucket.bucket'

terraform state mv \
  'google_storage_bucket.huyen1974_agent_data_tfstate_test' \
  'module.bucket_tfstate.google_storage_bucket.bucket'

echo "Step 4: Migrating Cloud Run service..."
terraform state mv \
  'module.agent_data_service_test.google_cloud_run_v2_service.default' \
  'module.agent_data_service_test.google_cloud_run_v2_service.service'

echo "Step 5: Migrating Artifact Registry..."
terraform state mv \
  'module.agent_data_service_test.google_artifact_registry_repository.repo' \
  'google_artifact_registry_repository.agent_data_test'

echo ""
echo "===================================================================="
echo "Migration complete!"
echo "===================================================================="
echo ""
echo "Next steps:"
echo "1. Run 'terraform plan' to verify no unwanted changes"
echo "2. Review the plan carefully - there should be NO destroys"
echo "3. If plan looks good, proceed with 'terraform apply'"
echo ""
