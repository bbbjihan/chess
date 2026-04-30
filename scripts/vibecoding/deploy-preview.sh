#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-chess}"
PR_NUMBER="${PR_NUMBER:?PR_NUMBER is required}"
DIST_DIR="${DIST_DIR:?DIST_DIR is required}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/vibecoding}"
PREVIEW_ROOT="$DEPLOY_ROOT/$APP_NAME/previews/pr-$PR_NUMBER"
DOMAIN_ROOT="${DOMAIN_ROOT:-jihan.kr}"
SITE_DOMAIN="pr-$PR_NUMBER.$APP_NAME.$DOMAIN_ROOT"

mkdir -p "$PREVIEW_ROOT"
rsync -a --delete "$DIST_DIR/" "$PREVIEW_ROOT/"

echo "Preview deployed: https://$SITE_DOMAIN"
echo "Preview root: $PREVIEW_ROOT"
