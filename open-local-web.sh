#!/bin/bash
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
URL="http://localhost:3000"
if command -v xdg-open &> /dev/null; then
  xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open &> /dev/null; then
  open "$URL" >/dev/null 2>&1 &
fi
echo "Opened http://localhost:3000"
