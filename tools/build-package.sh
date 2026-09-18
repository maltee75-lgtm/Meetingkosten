#!/usr/bin/env bash
# Packt die auslieferbare App als ZIP: dist/meetingkosten-pwa.zip
#
# Verwendung: Das ZIP bei einem Hoster mit Drag-and-drop-Upload einwerfen
# (z. B. Netlify Drop, Cloudflare Pages, Vercel) oder auf einen Webserver
# entpacken. Die Installierbarkeit als App setzt eine https-Adresse voraus.
set -euo pipefail

cd "$(dirname "$0")/.."
TARGET="dist/meetingkosten-pwa.zip"

rm -f "$TARGET"
zip -r -q "$TARGET" \
  index.html manifest.webmanifest sw.js \
  css js icons screenshots \
  -x '*.DS_Store'

echo "$TARGET erzeugt ($(du -h "$TARGET" | cut -f1)):"
unzip -l "$TARGET" | tail -3
