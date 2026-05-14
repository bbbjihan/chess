#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-chess}"
PR_NUMBER="${PR_NUMBER:?PR_NUMBER is required}"
DIST_DIR="${DIST_DIR:?DIST_DIR is required}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/vibecoding}"
DOMAIN_ROOT="${DOMAIN_ROOT:-jihan.kr}"
CADDYFILE="${CADDYFILE:-/opt/homebrew/etc/Caddyfile}"

if [[ ! "$PR_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "PR_NUMBER must be numeric: $PR_NUMBER" >&2
  exit 2
fi

SITE_DOMAIN="pr-$PR_NUMBER.$APP_NAME.$DOMAIN_ROOT"
PREVIEW_ROOT="$DEPLOY_ROOT/$APP_NAME/previews/pr-$PR_NUMBER"
CADDY_SNIPPET_DIR="$DEPLOY_ROOT/$APP_NAME/caddy/previews"
CADDY_SNIPPET="$CADDY_SNIPPET_DIR/pr-$PR_NUMBER.caddy"

mkdir -p "$PREVIEW_ROOT" "$CADDY_SNIPPET_DIR"
rsync -a --delete "$DIST_DIR/" "$PREVIEW_ROOT/"

cat > "$CADDY_SNIPPET.tmp" <<EOF
$SITE_DOMAIN {
	root * $PREVIEW_ROOT
	encode gzip zstd
	try_files {path} /index.html
	file_server
}
EOF
mv "$CADDY_SNIPPET.tmp" "$CADDY_SNIPPET"

caddy validate --config "$CADDYFILE"
caddy reload --config "$CADDYFILE"

echo "Preview deployed: https://$SITE_DOMAIN"
echo "Preview root: $PREVIEW_ROOT"
echo "Caddy snippet: $CADDY_SNIPPET"
