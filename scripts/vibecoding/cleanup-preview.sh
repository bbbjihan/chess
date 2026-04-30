#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-chess}"
PR_NUMBER="${PR_NUMBER:?PR_NUMBER is required}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/vibecoding}"
PREVIEW_ROOT="$DEPLOY_ROOT/$APP_NAME/previews/pr-$PR_NUMBER"

if [ -d "$PREVIEW_ROOT" ]; then
  rm -rf "$PREVIEW_ROOT"
fi

echo "Preview cleaned: pr-$PR_NUMBER"
