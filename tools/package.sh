#!/usr/bin/env bash
# Builds one ZIP file for the Firefox and the Chrome upload.
set -euo pipefail

cd "$(dirname "$0")/.."

# Only these paths go into the ZIP file. Everything else stays out.
PAYLOAD=(manifest.json popup.html src icons)

node --test >/dev/null
node tools/check-files.js

VERSION=$(node -p "require('./manifest.json').version")
OUT="dist/yt-auto-miniplayer-${VERSION}.zip"

mkdir -p dist
rm -f "$OUT"
zip -q -r -X "$OUT" "${PAYLOAD[@]}" -x '*.DS_Store'

echo ""
echo "Built $OUT ($(du -h "$OUT" | cut -f1))"
unzip -Z1 "$OUT" | sed 's/^/  /'
