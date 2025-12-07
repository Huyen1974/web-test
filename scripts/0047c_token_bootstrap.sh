#!/usr/bin/env bash
# CLI.CURSOR.0047C-TOKEN-SQL – Bootstrap Directus admin static token
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

echo "🔐 Starting Directus admin token bootstrap..."

# Generate new token (in-memory only)
NEW_TOKEN="$(openssl rand -hex 32)"
echo "✅ Generated new admin token (length: ${#NEW_TOKEN})"

# Fetch DB password from Secret Manager
echo "🔑 Fetching DB password from Secret Manager..."
if ! DB_PASSWORD="$("$GCLOUD_PATH" secrets versions access latest \
  --secret="DIRECTUS_DB_PASSWORD_test" \
  --project="$PROJECT_ID")"; then
  echo "❌ Failed to fetch DB password from Secret Manager"
  exit 1
fi
echo "✅ DB password fetched successfully"

# Get instance IP
echo "🌐 Discovering Cloud SQL instance IP..."
if ! INSTANCE_IP="$("$GCLOUD_PATH" sql instances describe "$INSTANCE" \
  --project="$PROJECT_ID" \
  --format='value(ipAddresses[0].ipAddress)')"; then
  echo "❌ Failed to get instance IP"
  exit 1
fi
echo "✅ Instance IP: $INSTANCE_IP"

# Discover working DB user
echo "👤 Discovering DB user..."
CANDIDATE_USERS="$("$GCLOUD_PATH" sql users list \
  --instance="$INSTANCE" \
  --project="$PROJECT_ID" \
  --format='value(name)')"

DB_USER=""
for U in $CANDIDATE_USERS; do
  # Skip system users
  if [[ "$U" == "mysql.sys" || "$U" == "mysql.session" ]]; then
    continue
  fi

  echo "Testing user: $U"
  if "$MYSQL_PATH" -h "$INSTANCE_IP" -u "$U" -p"$DB_PASSWORD" \
       -D "$DATABASE" \
       -e "SELECT 1;" >/dev/null 2>&1; then
    DB_USER="$U"
    echo "✅ Found working DB user: $DB_USER"
    break
  fi
done

if [[ -z "$DB_USER" ]]; then
  echo "❌ No working DB user found"
  exit 1
fi

# Update admin token in database
echo "💾 Updating admin token in database..."
"$MYSQL_PATH" -h "$INSTANCE_IP" -u "$DB_USER" -p"$DB_PASSWORD" -D "$DATABASE" <<EOF
UPDATE directus_users
SET token = '$NEW_TOKEN'
WHERE email = '$ADMIN_EMAIL';
EOF

# Verify token was set
echo "🔍 Verifying token update..."
TOKEN_STATUS="$("$MYSQL_PATH" -h "$INSTANCE_IP" -u "$DB_USER" -p"$DB_PASSWORD" -D "$DATABASE" -e "
  SELECT id, email,
         CASE WHEN token IS NULL OR token = '' THEN 'EMPTY'
              ELSE 'SET'
         END AS token_status
  FROM directus_users
  WHERE email = '$ADMIN_EMAIL';
" | tail -n 1)"

if [[ "$TOKEN_STATUS" != *"SET"* ]]; then
  echo "❌ Token update verification failed"
  exit 1
fi
echo "✅ Token status: SET"

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
    --replication-policy="automatic" \
    --data-file=-
fi

echo "✅ Directus admin token bootstrap complete!"
echo "🔒 Token stored in Secret Manager: $SECRET_NAME"
echo "📊 Token prefix: ${NEW_TOKEN:0:8}***"

# Clean up sensitive variables
unset NEW_TOKEN
unset DB_PASSWORD



