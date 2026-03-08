#!/usr/bin/env sh
set -eu

CONTAINER_NAME="${DB_CONTAINER_NAME:-some-mysql}"

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker is not installed or not in PATH"
  exit 1
fi

if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  docker stop "$CONTAINER_NAME" >/dev/null
  echo "✅ MySQL container stopped: $CONTAINER_NAME"
else
  echo "ℹ️  MySQL container is not running: $CONTAINER_NAME"
fi
