#!/bin/bash

echo "🔥 Bắt đầu khởi tạo Firebase với cấu hình tự động..."

# Tạo file cấu hình trả lời tự động
expect << 'EXPECT_EOF'
spawn firebase init

# Features: Chọn Hosting
expect "Which Firebase features do you want to set up for this directory?"
send "\033\[B\r"  # Di chuyển xuống Hosting và chọn
send " \r"        # Chọn Hosting
send "\r"         # Xác nhận

# Project Setup: Chọn Use an existing project
expect "Please select an option:"
send "\r"         # Chọn "Use an existing project"

# Project ID: Chọn github-chatgpt-ggcloud
expect "Select a default Firebase project for this directory:"
send "github-chatgpt-ggcloud\r"

# Public directory: Chấp nhận mặc định public
expect "What do you want to use as your public directory?"
send "\r"         # Chấp nhận mặc định "public"

# Configure as a single-page app?: Trả lời Yes
expect "Configure as a single-page app (rewrite all urls to /index.html)?"
send "y\r"        # Yes

# Set up automatic builds with GitHub?: Trả lời No
expect "Set up automatic builds and deploys with GitHub?"
send "n\r"        # No

expect eof
EXPECT_EOF

echo "✅ Hoàn thành khởi tạo Firebase"
