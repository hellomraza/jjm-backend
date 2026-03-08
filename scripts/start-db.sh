#!/usr/bin/env sh
set -eu

CONTAINER_NAME="${DB_CONTAINER_NAME:-some-mysql}"
MYSQL_PASSWORD="${MYSQL_ROOT_PASSWORD:-12345}"
MYSQL_DATABASE="${MYSQL_DATABASE:-jjm_work_monitoring}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_IMAGE="${MYSQL_IMAGE:-mysql:8.0}"

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker is not installed or not in PATH"
  exit 1
fi

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  docker start "$CONTAINER_NAME" >/dev/null
  echo "✅ MySQL container started: $CONTAINER_NAME"
else
  docker run \
    --name "$CONTAINER_NAME" \
    -e "MYSQL_ROOT_PASSWORD=$MYSQL_PASSWORD" \
    -e "MYSQL_DATABASE=$MYSQL_DATABASE" \
    -p "$MYSQL_PORT:3306" \
    -d "$MYSQL_IMAGE" >/dev/null
  echo "✅ MySQL container created and started: $CONTAINER_NAME"
fi

echo "ℹ️  MySQL is available on localhost:$MYSQL_PORT"
