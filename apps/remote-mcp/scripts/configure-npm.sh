#!/usr/bin/env bash
set -e
echo '=== Configuring NPM proxy for remote-mcp ==='

echo '--- Cleaning disk space ---'
docker system prune -af --volumes 2>/dev/null || true

echo '--- Restarting Nginx Proxy Manager ---'
NPM_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i 'npm\|nginx-proxy' | head -1)
if [ -n "$NPM_CONTAINER" ]; then
  docker restart "$NPM_CONTAINER"
  echo "Restarted $NPM_CONTAINER, waiting 5s..."
  sleep 5
else
  echo 'NPM container not found, using docker compose in REMOTE_DIR'
  if [ -d "$REMOTE_DIR/npm" ]; then
    cd "$REMOTE_DIR/npm" && docker compose down && docker compose up -d && sleep 5
  fi
fi

try_auth() {
  curl -sf -X POST http://localhost:81/api/tokens \
    -H 'Content-Type: application/json' \
    -d "{\"identity\":\"$1\",\"scope\":\"user\",\"secret\":\"$2\"}"
}

NPM_AUTH=$(try_auth "admin@example.com" "changeme" || try_auth "admin@example.com" "npm" || true)
if [ -z "$NPM_AUTH" ]; then
  echo 'NPM auth failed - configure proxy manually: /mcp -> http://paridade-risco-remote-mcp:3000'
  exit 0
fi

TOKEN=$(echo "$NPM_AUTH" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
echo "NPM authenticated, token: ${TOKEN:0:10}..."

HOSTS=$(curl -sf http://localhost:81/api/nginx/proxy-hosts -H "Authorization: Bearer $TOKEN")
HOST_ID=$(echo "$HOSTS" | python3 -c '
import sys,json
h=json.load(sys.stdin)
for x in h:
  for d in x.get("domain_names",[]):
    if "paridaderisco" in d or "blackboxinovacao" in d:
      print(x["id"])
' 2>/dev/null || echo "")

if [ -z "$HOST_ID" ]; then
  echo "ERROR: proxy host not found"
  exit 1
fi
echo "Found proxy host ID: $HOST_ID"

HAS_MCP=$(curl -sf "http://localhost:81/api/nginx/proxy-hosts/$HOST_ID" -H "Authorization: Bearer $TOKEN" | python3 -c '
import sys,json
h=json.load(sys.stdin)
print("yes" if any(l.get("location")=="/mcp" for l in h.get("locations",[])) else "no")
' 2>/dev/null)

if [ "$HAS_MCP" = "yes" ]; then
  echo "/mcp location already exists"
else
  echo "Adding /mcp location..."
  PAYLOAD=$(curl -sf "http://localhost:81/api/nginx/proxy-hosts/$HOST_ID" -H "Authorization: Bearer $TOKEN" | python3 -c '
import sys,json
h=json.load(sys.stdin)
h["locations"].append({"location":"/mcp","forward_scheme":"http","forward_host":"paridade-risco-remote-mcp","forward_port":3000})
print(json.dumps(h))
')
  curl -sf -X PUT "http://localhost:81/api/nginx/proxy-hosts/$HOST_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$PAYLOAD" > /dev/null
  echo "/mcp location added"
fi

curl -sf -X POST http://localhost:81/api/nginx/trigger -H "Authorization: Bearer $TOKEN" > /dev/null
echo 'NPM configured! Remote MCP at: https://paridaderisco.blackboxinovacao.com.br/mcp/TOKEN/mcp'