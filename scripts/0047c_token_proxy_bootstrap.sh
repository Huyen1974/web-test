#!/usr/bin/env bash
# CLI.CURSOR.0047C-TOKEN-PROXY – Bootstrap Directus admin token via Cloud SQL Auth Proxy
set -Eeuo pipefail

# Constants
PROJECT_ID="github-chatgpt-ggcloud"
INSTANCE="mysql-directus-web-test"
DATABASE="directus"
ADMIN_EMAIL="admin@example.com"
SECRET_NAME="DIRECTUS_ADMIN_TOKEN_test"
GCLOUD_PATH="/Users/nmhuyen/google-cloud-sdk/bin/gcloud"
MYSQL_PATH="/opt/homebrew/opt/mysql-client/bin/mysql"
export PATH="/opt/homebrew/opt/mysql-client/bin:$PATH"

echo "🔐 Starting Directus admin token bootstrap via Cloud SQL Proxy..."

# Get connection name
CONNECTION_NAME="$($GCLOUD_PATH sql instances describe "$INSTANCE" \
  --project="$PROJECT_ID" \
  --format='value(connectionName)')"

if [[ -z "$CONNECTION_NAME" ]]; then
  echo "❌ Failed to get connection name for instance $INSTANCE"
  exit 1
fi

echo "✅ Connection name: $CONNECTION_NAME"

# Fetch DB password from Secret Manager
echo "🔑 Fetching DB password from Secret Manager..."
if ! DB_PASSWORD="$($GCLOUD_PATH secrets versions access latest \
  --secret="DIRECTUS_DB_PASSWORD_test" \
  --project="$PROJECT_ID")"; then
  echo "❌ Failed to fetch DB password from Secret Manager"
  exit 1
fi
echo "✅ DB password fetched successfully"

# Generate new token (in-memory only)
NEW_TOKEN="$(openssl rand -hex 32)"
echo "✅ Generated new admin token (length: ${#NEW_TOKEN})"

# Start Cloud SQL Auth Proxy
echo "🌉 Starting Cloud SQL Auth Proxy..."
cloud-sql-proxy --address 127.0.0.1 --port 3308 "$CONNECTION_NAME" >/tmp/cloud_sql_proxy_0047C.log 2>&1 &
PROXY_PID=$!
echo "✅ Proxy started (PID: $PROXY_PID)"

# Wait for proxy to be ready
echo "⏳ Waiting for proxy to establish connection..."
sleep 20

# Test proxy connection
echo "🔍 Testing proxy connection..."
if ! "$MYSQL_PATH" -h 127.0.0.1 -P 3308 -u directus -p"$DB_PASSWORD" \
     -D "$DATABASE" \
     -e "SELECT 1;" >/dev/null 2>&1; then
  echo "❌ Proxy connection test failed"
  kill "$PROXY_PID" || true
  exit 1
fi
echo "✅ Proxy connection test successful"

# Update admin token in database
echo "💾 Updating admin token in database..."
if ! "$MYSQL_PATH" -h 127.0.0.1 -P 3308 -u directus -p"$DB_PASSWORD" -D "$DATABASE" <<EOF
UPDATE directus_users
SET token = '$NEW_TOKEN'
WHERE email = '$ADMIN_EMAIL';
EOF
then
  echo "❌ SQL UPDATE failed"
  kill "$PROXY_PID" || true
  exit 1
fi

# Verify token was set (count only, no token value)
TOKEN_COUNT="$("$MYSQL_PATH" -h 127.0.0.1 -P 3308 -u directus -p"$DB_PASSWORD" -D "$DATABASE" -e "
  SELECT COUNT(*) FROM directus_users
  WHERE email = '$ADMIN_EMAIL' AND token IS NOT NULL AND token != '';
" | tail -n 1)"

if [[ "$TOKEN_COUNT" != "1" ]]; then
  echo "❌ Token verification failed (count: $TOKEN_COUNT)"
  kill "$PROXY_PID" || true
  exit 1
fi
echo "✅ Token updated successfully (verification count: $TOKEN_COUNT)"

# Store token in Secret Manager
echo "🔐 Storing token in Secret Manager..."
if "$GCLOUD_PATH" secrets describe "$SECRET_NAME" \
     --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "📝 Secret exists, adding new version..."
  printf '%s' "$NEW_TOKEN" | "$GCLOUD_PATH" secrets versions add "$SECRET_NAME" \
    --project="$PROJECT_ID" \
    --data-file=-
else
  echo "🆕 Creating new secret..."
  printf '%s' "$NEW_TOKEN" | "$GCLOUD_PATH" secrets create "$SECRET_NAME" \
    --project="$PROJECT_ID" \
    --replication-policy=user-managed \
    --locations=asia-southeast1 \
    --data-file=-
fi

echo "✅ Secret Manager update complete"

# Cleanup
echo "🧹 Cleaning up..."
if [[ -n "$PROXY_PID" ]]; then
  kill "$PROXY_PID" || true
  echo "✅ Proxy stopped"
fi

# Clean up sensitive variables
unset DB_PASSWORD
unset NEW_TOKEN

echo "🎉 Directus admin token bootstrap via proxy complete!"
echo "📊 Secret: $SECRET_NAME ready for migration scripts"
