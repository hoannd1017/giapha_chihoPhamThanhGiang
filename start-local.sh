#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "=== Gia Pha OS - Start Local Web ==="
echo "Working dir: $ROOT"

# Check node
if ! command -v node &> /dev/null; then
  echo "Node.js not installed. Install at https://nodejs.org/"
  exit 1
fi
echo "Node: $(node --version)"

# Create .env.local
if [ ! -f .env.local ]; then
  if [ -f .env.example ]; then
    cp .env.example .env.local
    echo "Created .env.local from .env.example"
    echo "Update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in .env.local"
  else
    echo ".env.example not found"
    exit 1
  fi
else
  echo ".env.local exists"
fi

# Install deps
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm i --no-audit --no-fund
fi

# Open browser
URL="http://localhost:3000"
if command -v xdg-open &> /dev/null; then
  xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open &> /dev/null; then
  open "$URL" >/dev/null 2>&1 &
fi

echo ""
echo "Starting dev server at http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""
npx --yes next dev --port 3000
