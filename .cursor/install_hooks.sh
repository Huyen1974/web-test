#!/usr/bin/env bash
set -e
cat > .git/hooks/pre-push <<'EOS'
#!/usr/bin/env bash
set -e
remote=$(git remote get-url origin)
pwd_current=$(pwd)
[[ "$remote" == *"/agent-data-test.git"* ]] || { echo "❌ Wrong remote: $remote"; exit 1; }
[[ "$pwd_current" == */Manual\ Deploy/agent-data-langroid ]] || { echo "❌ Wrong folder: $pwd_current"; exit 1; }
echo "✅ Pre-push self-check passed"
EOS
chmod +x .git/hooks/pre-push
echo "Hook re-installed."
