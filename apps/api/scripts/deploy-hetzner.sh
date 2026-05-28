#!/usr/bin/env bash
set -euo pipefail

SSH_HOST="${1:-hetzner}"
REMOTE_DIR="/root/paridade-risco-v2"

echo "=== Building image locally ==="
docker build -f apps/api/Dockerfile -t paridade-risco-api:latest .

echo "=== Saving image ==="
docker save paridade-risco-api:latest | gzip > /tmp/paridade-risco-api.tar.gz

echo "=== Copying to server ==="
scp /tmp/paridade-risco-api.tar.gz "$SSH_HOST:$REMOTE_DIR/image.tar.gz"
scp apps/api/docker-compose.hetzner.yml "$SSH_HOST:$REMOTE_DIR/docker-compose.yml"
scp apps/api/.env.production "$SSH_HOST:$REMOTE_DIR/.env" 2>/dev/null || true

echo "=== Deploying on server ==="
ssh "$SSH_HOST" << 'EOF'
  cd /root/paridade-risco-v2
  echo "Loading image..."
  gunzip -c image.tar.gz | docker load
  rm -f image.tar.gz

  echo "Stopping old container..."
  docker compose down 2>/dev/null || true

  echo "Starting new container..."
  docker compose up -d

  echo "Running database migrations..."
  docker compose exec -T app npx drizzle-kit migrate

  echo "Checking health..."
  sleep 5
  curl -sf http://127.0.0.1:3000/api/health && echo " - OK" || echo " - WARN: health check failed"
EOF

echo "=== Cleaning up ==="
rm -f /tmp/paridade-risco-api.tar.gz

echo "=== Done ==="
