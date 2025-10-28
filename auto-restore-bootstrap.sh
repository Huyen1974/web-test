#!/usr/bin/env bash
# === AUTO-RESTORE BOOTSTRAP SCRIPT ===
# Khôi phục files từ backup khi phát hiện files bị mất
set -Eeuo pipefail

BACKUP_DIR="$HOME/.cursor-environment-backup"
PROJECT_DIR="/Users/nmhuyen/Documents/Manual Deploy/web-test"

echo "🔍 Checking for missing files..."

RESTORED=0

# Restore bootstrap script if missing
if [ ! -f "$PROJECT_DIR/CLI.POSTBOOT.250.sh" ]; then
    if [ -f "$BACKUP_DIR/CLI.POSTBOOT.250.sh" ]; then
        cp "$BACKUP_DIR/CLI.POSTBOOT.250.sh" "$PROJECT_DIR/CLI.POSTBOOT.250.sh"
        chmod +x "$PROJECT_DIR/CLI.POSTBOOT.250.sh"
        echo "✅ Bootstrap script restored from backup"
        RESTORED=1
    else
        echo "❌ No backup found for bootstrap script!"
        exit 1
    fi
else
    echo "✅ Bootstrap script exists"
fi

# Restore .cursor directory if missing
if [ ! -d "$PROJECT_DIR/.cursor" ]; then
    if [ -d "$BACKUP_DIR/.cursor" ]; then
        cp -r "$BACKUP_DIR/.cursor" "$PROJECT_DIR/.cursor"
        echo "✅ .cursor directory restored from backup"
        RESTORED=1
    else
        echo "⚠️  No backup found for .cursor directory, creating new one..."
        mkdir -p "$PROJECT_DIR/.cursor"
        echo "$(date): Auto-created by restore script" > "$PROJECT_DIR/.cursor/.bootstrap_done"
        RESTORED=1
    fi
else
    echo "✅ .cursor directory exists"
fi

# Restore auto-backup script if missing
if [ ! -f "$PROJECT_DIR/auto-backup-bootstrap.sh" ]; then
    if [ -f "$BACKUP_DIR/auto-backup-bootstrap.sh" ]; then
        cp "$BACKUP_DIR/auto-backup-bootstrap.sh" "$PROJECT_DIR/auto-backup-bootstrap.sh"
        chmod +x "$PROJECT_DIR/auto-backup-bootstrap.sh"
        echo "✅ Auto-backup script restored from backup"
        RESTORED=1
    fi
fi

if [ $RESTORED -eq 1 ]; then
    echo "🔄 Files restored successfully!"
    echo "$(date): Restore completed" >> "$BACKUP_DIR/restore.log"
else
    echo "✅ All files present, no restore needed"
fi

echo "✅ Recovery check completed"
