#!/usr/bin/env bash
# === AUTO-BACKUP BOOTSTRAP SCRIPT ===
# Chạy định kỳ để backup files quan trọng vào nơi an toàn
set -Eeuo pipefail

BACKUP_DIR="$HOME/.cursor-environment-backup"
PROJECT_DIR="/Users/nmhuyen/Documents/Manual Deploy/web-test"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Tạo backup directory nếu chưa có
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting automatic backup..."

# Backup bootstrap script
if [ -f "$PROJECT_DIR/CLI.POSTBOOT.250.sh" ]; then
    cp "$PROJECT_DIR/CLI.POSTBOOT.250.sh" "$BACKUP_DIR/CLI.POSTBOOT.250.sh"
    cp "$PROJECT_DIR/CLI.POSTBOOT.250.sh" "$BACKUP_DIR/CLI.POSTBOOT.250.sh.$TIMESTAMP"
    echo "✅ Bootstrap script backed up"
else
    echo "⚠️  Bootstrap script not found!"
fi

# Backup .cursor directory
if [ -d "$PROJECT_DIR/.cursor" ]; then
    rm -rf "$BACKUP_DIR/.cursor"
    cp -r "$PROJECT_DIR/.cursor" "$BACKUP_DIR/.cursor"
    cp -r "$PROJECT_DIR/.cursor" "$BACKUP_DIR/.cursor.$TIMESTAMP"
    echo "✅ .cursor directory backed up"
else
    echo "⚠️  .cursor directory not found!"
fi

# Backup gitignore
if [ -f "$PROJECT_DIR/.gitignore" ]; then
    cp "$PROJECT_DIR/.gitignore" "$BACKUP_DIR/.gitignore"
    echo "✅ .gitignore backed up"
fi

# Backup auto-backup script itself
if [ -f "$PROJECT_DIR/auto-backup-bootstrap.sh" ]; then
    cp "$PROJECT_DIR/auto-backup-bootstrap.sh" "$BACKUP_DIR/auto-backup-bootstrap.sh"
    echo "✅ Auto-backup script backed up"
fi

# Backup auto-restore script
if [ -f "$PROJECT_DIR/auto-restore-bootstrap.sh" ]; then
    cp "$PROJECT_DIR/auto-restore-bootstrap.sh" "$BACKUP_DIR/auto-restore-bootstrap.sh"
    echo "✅ Auto-restore script backed up"
fi

# Log backup completion
echo "$(date): Backup completed successfully" >> "$BACKUP_DIR/backup.log"
echo "✅ Backup completed successfully at $(date)"
echo "📁 Backup location: $BACKUP_DIR"

# Cleanup old backups (giữ lại 10 bản backup gần nhất)
cd "$BACKUP_DIR"
ls -t CLI.POSTBOOT.250.sh.* 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
ls -t .cursor.* 2>/dev/null | tail -n +11 | xargs rm -rf 2>/dev/null || true
echo "🧹 Cleaned up old backups (keeping 10 most recent)"
