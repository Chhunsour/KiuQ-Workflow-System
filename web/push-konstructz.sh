#!/usr/bin/env bash
# Push the master catalog (KiuQ Image Dashboard / team_folders) to the local
# Konstructz e-commerce site via the real receiver. Use while everything is
# local (no domain). Once the site has a public domain, use KiuQ → Product
# Sync → Sync Center instead and this script is no longer needed.
#
#   cd "Wordpress prompt System/web" && bash push-konstructz.sh
set -e
KONST="/Users/sour/Documents/Konstructz Project Website"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "Starting local receiver…"
SYNC_TOKEN=localdev php -S 127.0.0.1:8787 -t "$KONST/static" >/tmp/kz_recv.log 2>&1 &
RCV=$!
trap 'kill $RCV 2>/dev/null' EXIT
sleep 1.5

echo "Pushing catalog through the receiver…"
RECV_URL="http://127.0.0.1:8787/api/receiver.php" RECV_TOKEN="localdev" node "$HERE/sync-local.mjs"

echo "Done. Catalog written to $KONST/static/data/products.json"
