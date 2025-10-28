#!/usr/bin/env bash
# === POST-REBOOT / NEW-SESSION QUICKCHECK FOR WEB-TEST ===
set -Eeuo pipefail

echo "🚀 Starting web-test bootstrap..."

# === AUTO-RECOVERY LOGIC ===
# Check if auto-restore script exists and run it if needed
if [ -f "auto-restore-bootstrap.sh" ]; then
    echo "🔍 Running auto-recovery check..."
    bash auto-restore-bootstrap.sh
else
    echo "⚠️  Auto-restore script not found, attempting recovery from backup..."
    BACKUP_DIR="$HOME/.cursor-environment-backup"
    if [ -f "$BACKUP_DIR/auto-restore-bootstrap.sh" ]; then
        cp "$BACKUP_DIR/auto-restore-bootstrap.sh" .
        chmod +x auto-restore-bootstrap.sh
        bash auto-restore-bootstrap.sh
    else
        echo "⚠️  No backup found, skipping recovery"
    fi
fi

# Run initial backup after recovery
if [ -f "auto-backup-bootstrap.sh" ]; then
    echo "💾 Creating initial backup..."
    bash auto-backup-bootstrap.sh > /dev/null 2>&1 || echo "⚠️  Backup failed, continuing..."
fi

# Check Node.js and npm
echo "📦 Checking Node.js environment..."
node --version
npm --version

# Check if node_modules exists, install if missing
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ node_modules exists"
fi

# Check Nuxt.js setup
echo "🔧 Checking Nuxt.js setup..."
if [ ! -d ".nuxt" ]; then
    echo "🔧 Preparing Nuxt..."
    npm run postinstall
else
    echo "✅ .nuxt directory exists"
fi

# Check Firebase configuration (if exists)
if [ -f "plugins/firebase.client.ts" ]; then
    echo "🔥 Firebase plugin found"
    # Could add Firebase auth checks here if needed
fi

# Check Directus configuration (if exists)
if [ -f "plugins/directus.ts" ]; then
    echo "🗄️ Directus plugin found"
    # Could add Directus connection checks here if needed
fi

# Create bootstrap marker
MARKER=".cursor/.bootstrap_done"
echo "$(date)" > "$MARKER"

echo "✅ Web-test bootstrap completed successfully!"
echo "🌐 Ready to run: npm run dev"
