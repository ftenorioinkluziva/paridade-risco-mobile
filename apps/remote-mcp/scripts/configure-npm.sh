#!/usr/bin/env bash
set -e
echo '=== Configuring NPM proxy for remote-mcp ==='

echo '--- Preserving Docker volumes and build cache ---'
echo 'No destructive Docker cleanup is performed by this script.'

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

NPM_API_URL="${NPM_API_URL:-http://localhost:81}"
NPM_IDENTITY="${NPM_IDENTITY:-${NPM_EMAIL:-}}"
NPM_SECRET="${NPM_SECRET:-${NPM_PASSWORD:-}}"

if [ -z "$NPM_IDENTITY" ] || [ -z "$NPM_SECRET" ]; then
  echo 'NPM credentials not provided; leaving the existing proxy configuration untouched.'
  echo 'Set NPM_IDENTITY/NPM_SECRET only in the protected server environment for automatic configuration.'
  exit 0
fi

NPM_PAYLOAD=$(NPM_IDENTITY="$NPM_IDENTITY" NPM_SECRET="$NPM_SECRET" python3 -c '
import json, os
print(json.dumps({"identity": os.environ["NPM_IDENTITY"], "scope": "user", "secret": os.environ["NPM_SECRET"]}))
')
NPM_AUTH=$(curl -sf -X POST "$NPM_API_URL/api/tokens" \
  -H 'Content-Type: application/json' \
  --data "$NPM_PAYLOAD" || true)
if [ -z "$NPM_AUTH" ]; then
  echo 'NPM auth failed - configure proxy manually: /mcp -> http://paridade-risco-remote-mcp:3000'
  exit 0
fi

TOKEN=$(echo "$NPM_AUTH" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
echo "NPM authenticated, token: ${TOKEN:0:10}..."

HOSTS=$(curl -sf "$NPM_API_URL/api/nginx/proxy-hosts" -H "Authorization: Bearer $TOKEN")
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

HAS_MCP=$(curl -sf "$NPM_API_URL/api/nginx/proxy-hosts/$HOST_ID" -H "Authorization: Bearer $TOKEN" | python3 -c '
import sys,json
h=json.load(sys.stdin)
print("yes" if any((l.get("path") or l.get("location"))=="/mcp" for l in h.get("locations",[])) else "no")
' 2>/dev/null)

if [ "$HAS_MCP" = "yes" ]; then
  echo "/mcp location already exists"
else
  echo "Adding /mcp location..."
  PAYLOAD=$(curl -sf "$NPM_API_URL/api/nginx/proxy-hosts/$HOST_ID" -H "Authorization: Bearer $TOKEN" | python3 -c '
import sys,json
h=json.load(sys.stdin)
h.setdefault("locations", []).append({"path":"/mcp","forward_scheme":"http","forward_host":"paridade-risco-remote-mcp","forward_port":3000})
print(json.dumps(h))
')
  curl -sf -X PUT "$NPM_API_URL/api/nginx/proxy-hosts/$HOST_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$PAYLOAD" > /dev/null
  echo "/mcp location added"
fi

curl -sf -X POST "$NPM_API_URL/api/nginx/trigger" -H "Authorization: Bearer $TOKEN" > /dev/null
echo 'NPM configured! Remote MCP endpoint: https://paridaderisco.blackboxinovacao.com.br/mcp (Authorization: Bearer)'
