#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-chess}"
PR_NUMBER="${PR_NUMBER:?PR_NUMBER is required}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/vibecoding}"
CADDYFILE="${CADDYFILE:-/opt/homebrew/etc/Caddyfile}"

if [[ ! "$PR_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "PR_NUMBER must be numeric: $PR_NUMBER" >&2
  exit 2
fi

PREVIEW_ROOT="$DEPLOY_ROOT/$APP_NAME/previews/pr-$PR_NUMBER"
CADDY_SNIPPET="$DEPLOY_ROOT/$APP_NAME/caddy/previews/pr-$PR_NUMBER.caddy"

rm -rf "$PREVIEW_ROOT"
rm -f "$CADDY_SNIPPET"

caddy validate --config "$CADDYFILE"
caddy reload --config "$CADDYFILE"

echo "Preview cleaned: pr-$PR_NUMBER"
