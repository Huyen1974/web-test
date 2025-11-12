#!/usr/bin/env bash
# === FIX CLAUDE CODE AUTO-UPDATE SCRIPT ===
# Sử dụng script này khi gặp cảnh báo: "✗ Auto-update failed"
# Script này sẽ không ảnh hưởng đến config/chương trình khác

set -Eeuo pipefail

echo "🔧 Claude Code Auto-Update Fix Script"
echo "======================================="

# Kiểm tra version hiện tại
echo ""
echo "📌 Checking current Claude Code version..."
if command -v claude &> /dev/null; then
    CURRENT_VERSION=$(claude --version 2>/dev/null || echo "Unknown")
    echo "Current version: $CURRENT_VERSION"
else
    echo "⚠️  Claude Code CLI not found!"
    CURRENT_VERSION="Not installed"
fi

# Kiểm tra version mới nhất
echo ""
echo "📌 Checking latest available version..."
LATEST_VERSION=$(npm view @anthropic-ai/claude-code version 2>/dev/null || echo "Unknown")
echo "Latest version: $LATEST_VERSION"

if [ "$CURRENT_VERSION" = "$LATEST_VERSION (Claude Code)" ]; then
    echo ""
    echo "✅ Claude Code is already up to date!"
    exit 0
fi

# Xác nhận với user
echo ""
echo "🔄 This script will:"
echo "  1. Remove old temp directories (if any)"
echo "  2. Uninstall current Claude Code"
echo "  3. Reinstall latest Claude Code"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted by user"
    exit 1
fi

# Bước 1: Xóa temp directories cũ
echo ""
echo "🧹 Step 1: Cleaning old temp directories..."
NPM_PREFIX=$(npm config get prefix 2>/dev/null || echo "/opt/homebrew")
CLAUDE_DIR="${NPM_PREFIX}/lib/node_modules/@anthropic-ai"

if [ -d "$CLAUDE_DIR" ]; then
    echo "Checking for temp directories in: $CLAUDE_DIR"
    TEMP_DIRS=$(find "$CLAUDE_DIR" -maxdepth 1 -name ".claude-code-*" 2>/dev/null || true)

    if [ -n "$TEMP_DIRS" ]; then
        echo "Found temp directories:"
        echo "$TEMP_DIRS"
        rm -rf "$CLAUDE_DIR"/.claude-code-* 2>/dev/null || true
        echo "✓ Temp directories removed"
    else
        echo "✓ No temp directories found"
    fi
else
    echo "✓ Claude directory not found (fresh install)"
fi

# Bước 2: Uninstall
echo ""
echo "🗑️  Step 2: Uninstalling current Claude Code..."
npm uninstall -g @anthropic-ai/claude-code 2>/dev/null || echo "⚠️  Package not installed or already removed"
echo "✓ Uninstall completed"

# Bước 3: Reinstall
echo ""
echo "📦 Step 3: Installing latest Claude Code..."
npm install -g @anthropic-ai/claude-code@latest

# Verify
echo ""
echo "✅ Installation completed!"
echo ""
NEW_VERSION=$(claude --version 2>/dev/null || echo "Error getting version")
echo "New version: $NEW_VERSION"

# Kiểm tra npm config
echo ""
echo "🔍 Verifying auto-update configuration..."
UPDATE_NOTIFIER=$(npm config get update-notifier 2>/dev/null || echo "unknown")
echo "  update-notifier: $UPDATE_NOTIFIER"

if [ "$UPDATE_NOTIFIER" != "true" ]; then
    echo "⚠️  Auto-update notifier is disabled!"
    echo "To enable: npm config set update-notifier true"
else
    echo "✅ Auto-update notifier is enabled"
fi

echo ""
echo "======================================="
echo "✅ Claude Code auto-update fix completed!"
echo ""
echo "💡 Future auto-updates should work properly now."
echo "If you still see 'Auto-update failed', run this script again."
echo ""
