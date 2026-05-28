#!/usr/bin/env pwsh
param(
  [string]$HostName = "135.181.47.220",
  [string]$User = "root",
  [string]$KeyFile = "$env:USERPROFILE\.ssh\hetzner",
  [switch]$SkipBuild
)

$remote = "${User}@${HostName}"
$remoteDir = "/root/paridade-risco-v2"
$codeDir = "$remoteDir/code"

function Run-SSH($cmd) {
  ssh -o StrictHostKeyChecking=no -o BatchMode=yes -i "$KeyFile" $remote $cmd 2>&1
}

function Copy-ToRemote($local, $remotePath) {
  scp -o StrictHostKeyChecking=no -o BatchMode=yes -i "$KeyFile" -r $local "${remote}:${remotePath}" 2>&1
}

Write-Host "=== Creating remote directories ==="
Run-SSH "mkdir -p $codeDir/apps/api/src $codeDir/apps/api/public $codeDir/apps/api/drizzle $codeDir/packages/shared/src"

Write-Host "=== Copying project files ==="
Copy-ToRemote "package.json" "$codeDir/"
Copy-ToRemote "package-lock.json" "$codeDir/"
Copy-ToRemote "apps/api/src" "$codeDir/apps/api/"
Copy-ToRemote "apps/api/public" "$codeDir/apps/api/"
Copy-ToRemote "apps/api/drizzle" "$codeDir/apps/api/"
Copy-ToRemote "apps/api/next.config.ts" "$codeDir/apps/api/"
Copy-ToRemote "apps/api/tsconfig.json" "$codeDir/apps/api/"
Copy-ToRemote "apps/api/package.json" "$codeDir/apps/api/"
Copy-ToRemote "apps/api/Dockerfile" "$codeDir/apps/api/"
Copy-ToRemote "apps/api/docker-compose.hetzner.yml" "$codeDir/apps/api/"
Copy-ToRemote "apps/api/.dockerignore" "$codeDir/apps/api/"
Copy-ToRemote "apps/api/.env.production" "$codeDir/apps/api/"
Copy-ToRemote "packages/shared/package.json" "$codeDir/packages/shared/"
Copy-ToRemote "packages/shared/src" "$codeDir/packages/shared/"

if (-not $SkipBuild) {
  Write-Host "=== Installing deps and building on server ==="
  Run-SSH "cd $codeDir && npm ci && npm run build --workspace=@paridade-risco/api"
  Write-Host "=== Building Docker image ==="
  Run-SSH "cd $codeDir && docker build -f apps/api/Dockerfile -t paridade-risco-api:latest ."
}

Write-Host "=== Deploying container ==="
Run-SSH @"
cd $remoteDir
cp code/apps/api/docker-compose.hetzner.yml docker-compose.yml
cp code/apps/api/.env.production .env 2>/dev/null || true
docker compose down 2>/dev/null || true
docker compose up -d
echo "--- Running migrations ---"
sleep 5
docker compose exec -T app npx drizzle-kit migrate 2>&1 || echo "Migration note"
echo "--- Checking ---"
sleep 3
curl -sf http://127.0.0.1:3000/api/health && echo "Health OK" || echo "Health endpoint not found"
"@

Write-Host "=== Deploy complete ==="
