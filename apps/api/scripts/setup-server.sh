#!/usr/bin/env bash
# Run on the Hetzner server to set up deployment
set -euo pipefail

APP_DIR="/root/paridade-risco-v2"
CODE_DIR="$APP_DIR/code"
mkdir -p "$CODE_DIR"

# Copy code via tar over SSH (run from local machine)
# tar czf - --exclude='node_modules' --exclude='.next' --exclude='.git' \
#   --exclude='apps/mobile' --exclude='.aiox-core' --exclude='docs' \
#   -C /path/to/monorepo . | ssh hetzner "tar xzf - -C $CODE_DIR"

# On server: build and deploy
cd "$CODE_DIR"

echo "=== Installing dependencies ==="
npm ci

echo "=== Building API ==="
npm run build --workspace=@paridade-risco/api

echo "=== Building Docker image ==="
docker build -f apps/api/Dockerfile -t paridade-risco-api:latest .

echo "=== Setting up docker-compose ==="
cp apps/api/docker-compose.hetzner.yml "$APP_DIR/docker-compose.yml"
cp apps/api/.env.production "$APP_DIR/.env"

echo "=== Starting container ==="
cd "$APP_DIR"
docker compose down 2>/dev/null || true
docker compose up -d

echo "=== Running migrations ==="
sleep 5
docker compose exec -T app npx drizzle-kit migrate

echo "=== Health check ==="
sleep 3
curl -sf http://127.0.0.1:3000/api/health && echo " - OK" || echo " - WARN: no health endpoint"

echo "=== Done ==="
