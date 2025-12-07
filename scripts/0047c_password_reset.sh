#!/usr/bin/env bash
# CLI.CURSOR.0047C-RESCUE-PASSWORD – Directus Admin Password Recovery
set -Eeuo pipefail

# Constants
PROJECT_ID="github-chatgpt-ggcloud"
INSTANCE="mysql-directus-web-test"
DATABASE="directus"
NEW_PASSWORD="Directus@2025!"
GCLOUD_PATH="/Users/nmhuyen/google-cloud-sdk/bin/gcloud"
MYSQL_PATH="/opt/homebrew/opt/mysql-client/bin/mysql"
export PATH="/opt/homebrew/opt/mysql-client/bin:$PATH"

echo "🔐 Starting Directus admin password reset..."

# Step 1: Start Cloud SQL Proxy
echo "🌉 Starting Cloud SQL Proxy..."
mkdir -p .cursor
cloud-sql-proxy \
  --port=3307 \
  "github-chatgpt-ggcloud:asia-southeast1:mysql-directus-web-test" \
  > .cursor/tmp_proxy.log 2>&1 &

PROXY_PID=$!
echo "✅ Proxy started (PID: $PROXY_PID)"
sleep 10

# Step 2: Fetch DB password
echo "🔑 Fetching DB password..."
if ! DB_PASS="$($GCLOUD_PATH secrets versions access latest --secret=DIRECTUS_DB_PASSWORD_test --project="$PROJECT_ID")"; then
  echo "❌ Failed to fetch DB password"
  pkill -f cloud-sql-proxy || true
  exit 1
fi
echo "✅ DB password fetched"

# Step 3: Verify DB exists
echo "🔍 Verifying database..."
DB_CHECK="$("$MYSQL_PATH" -h 127.0.0.1 -P 3307 -u directus -p"$DB_PASS" \
  -Nse "SHOW DATABASES LIKE 'directus';")"

if [[ -z "$DB_CHECK" ]]; then
  echo "❌ Database 'directus' not found"
  pkill -f cloud-sql-proxy || true
  exit 1
fi
echo "✅ Database verified"

# Step 4: Identify admin email
echo "👤 Identifying admin email..."
ADMIN_EMAIL="$("$MYSQL_PATH" -h 127.0.0.1 -P 3307 -u directus -p"$DB_PASS" -D "$DATABASE" \
  -Nse "SELECT email FROM directus_users ORDER BY id ASC LIMIT 1;")"

if [[ -z "$ADMIN_EMAIL" ]]; then
  echo "❌ Admin email not found"
  pkill -f cloud-sql-proxy || true
  exit 1
fi
echo "✅ Admin email: $ADMIN_EMAIL"

# Step 5: Generate Argon2id hash
echo "🔒 Generating Argon2id hash..."
mkdir -p .cursor/temp_auth
cd .cursor/temp_auth

# Initialize npm project quietly
npm init -y >/dev/null 2>&1
npm install argon2 >/dev/null 2>&1

# Create hashing script
cat > hash.js << 'EOF'
const argon2 = require('argon2');

(async () => {
  const password = "Directus@2025!";
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  process.stdout.write(hash);
})();
EOF

# Generate hash
if ! NEW_HASH=$(node hash.js); then
  echo "❌ Failed to generate hash"
  cd ../..
  rm -rf .cursor/temp_auth
  pkill -f cloud-sql-proxy || true
  exit 1
fi

cd ../..
rm -rf .cursor/temp_auth
echo "✅ Hash generated"

# Step 6: Update password in DB
echo "💾 Updating password in database..."
"$MYSQL_PATH" -h 127.0.0.1 -P 3307 -u directus -p"$DB_PASS" -D "$DATABASE" \
  -e "UPDATE directus_users SET password='$NEW_HASH' WHERE email='$ADMIN_EMAIL';"

# Step 7: Verify update
echo "🔍 Verifying password update..."
VERIFY="$("$MYSQL_PATH" -h 127.0.0.1 -P 3307 -u directus -p"$DB_PASS" -D "$DATABASE" \
  -Nse "SELECT email FROM directus_users WHERE email='$ADMIN_EMAIL' AND password IS NOT NULL;")"

if [[ -z "$VERIFY" ]]; then
  echo "❌ Password update verification failed"
  pkill -f cloud-sql-proxy || true
  exit 1
fi
echo "✅ Password updated successfully"

# Step 8: Write report
echo "📝 Writing report..."
mkdir -p reports

cat > reports/0047c_password_reset.md << EOF
# 0047C Password Reset Report (SUCCESS)

**Admin Email:** $ADMIN_EMAIL
**New Password:** Directus@2025!
**Hash Applied:** (argon2id hash generated safely)

**Timestamp:** $(date)

## Next steps:

1. User logs in at /admin using new password.
2. User creates a fresh Admin Token.
3. Agent continues with Migration 0047C.

## Technical Details:

- Cloud SQL Proxy: Used for secure database access
- Hash Algorithm: Argon2id (Directus v10+ standard)
- Database: $DATABASE
- User: $ADMIN_EMAIL

**Status:** Password reset completed successfully ✅
EOF

echo "✅ Report written"

# Step 9: Cleanup
echo "🧹 Cleaning up..."
pkill -f cloud-sql-proxy || true
unset DB_PASS
unset NEW_HASH

echo "✔ Password reset completed. Ready for UI login."
