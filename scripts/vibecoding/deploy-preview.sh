#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-chess}"
PR_NUMBER="${PR_NUMBER:?PR_NUMBER is required}"
DIST_DIR="${DIST_DIR:?DIST_DIR is required}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/vibecoding}"
PREVIEW_ROOT="$DEPLOY_ROOT/$APP_NAME/previews/pr-$PR_NUMBER"
CADDY_SITES_DIR="${CADDY_SITES_DIR:-/etc/caddy/sites-enabled}"
CADDY_RELOAD_CMD="${CADDY_RELOAD_CMD:-caddy reload --config /etc/caddy/Caddyfile}"
DOMAIN_ROOT="${DOMAIN_ROOT:-jihan.kr}"
SITE_DOMAIN="pr-$PR_NUMBER.$APP_NAME.$DOMAIN_ROOT"

mkdir -p "$PREVIEW_ROOT"
rsync -a --delete "$DIST_DIR/" "$PREVIEW_ROOT/"

mkdir -p "$CADDY_SITES_DIR"
cat > "$CADDY_SITES_DIR/$APP_NAME-pr-$PR_NUMBER.caddy" <<EOF
$SITE_DOMAIN {
    root * $PREVIEW_ROOT
    encode gzip zstd
    file_server
    try_files {path} /index.html
}
EOF

sh -c "$CADDY_RELOAD_CMD"

echo "Preview deployed: https://$SITE_DOMAIN"
