#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-chess}"
DIST_DIR="${DIST_DIR:?DIST_DIR is required}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/vibecoding}"
RELEASE_ID="${RELEASE_ID:-$(date +%Y%m%d-%H%M%S)}"
PROD_RELEASES="$DEPLOY_ROOT/$APP_NAME/prod/releases"
TARGET_DIR="$PROD_RELEASES/$RELEASE_ID"
CURRENT_LINK="$DEPLOY_ROOT/$APP_NAME/prod/current"

mkdir -p "$TARGET_DIR"
rsync -a --delete "$DIST_DIR/" "$TARGET_DIR/"
ln -sfn "$TARGET_DIR" "$CURRENT_LINK"

echo "Production deployed: $CURRENT_LINK -> $TARGET_DIR"
