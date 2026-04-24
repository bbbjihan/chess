#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-chess}"
PR_NUMBER="${PR_NUMBER:?PR_NUMBER is required}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/vibecoding}"
PREVIEW_ROOT="$DEPLOY_ROOT/$APP_NAME/previews/pr-$PR_NUMBER"
CADDY_SITES_DIR="${CADDY_SITES_DIR:-/etc/caddy/sites-enabled}"
CADDY_RELOAD_CMD="${CADDY_RELOAD_CMD:-caddy reload --config /etc/caddy/Caddyfile}"

if [ -d "$PREVIEW_ROOT" ]; then
  rm -rf "$PREVIEW_ROOT"
fi

if [ -f "$CADDY_SITES_DIR/$APP_NAME-pr-$PR_NUMBER.caddy" ]; then
  rm -f "$CADDY_SITES_DIR/$APP_NAME-pr-$PR_NUMBER.caddy"
fi

sh -c "$CADDY_RELOAD_CMD"

echo "Preview cleaned: pr-$PR_NUMBER"
