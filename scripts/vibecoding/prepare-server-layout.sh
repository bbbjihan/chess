#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-chess}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/vibecoding}"

mkdir -p "$DEPLOY_ROOT/$APP_NAME/prod/releases"
mkdir -p "$DEPLOY_ROOT/$APP_NAME/previews"
mkdir -p "$DEPLOY_ROOT/$APP_NAME/artifacts"
mkdir -p "$DEPLOY_ROOT/$APP_NAME/logs"

echo "Prepared server layout under $DEPLOY_ROOT/$APP_NAME"
find "$DEPLOY_ROOT/$APP_NAME" -maxdepth 2 -type d | sort
