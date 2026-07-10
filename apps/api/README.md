# Paridade Risco API

Aplicacao Next.js do monorepo `paridade-risco-mobile`.

## Desenvolvimento

Execute o servidor local:

```bash
npm run dev --workspace @paridade-risco/api
```

Ou, a partir da raiz do monorepo:

```bash
npm run dev:api
```

A aplicacao fica disponivel em [http://localhost:3000](http://localhost:3000).

## Banco de dados

Configure `DATABASE_URL` em `apps/api/.env` e rode as migracoes:

```bash
npm run db:migrate --workspace @paridade-risco/api
```

Para popular dados de exemplo:

```bash
npm run db:seed --workspace @paridade-risco/api
```

## Build

```bash
npm run build --workspace @paridade-risco/api
```

## Deploy

O deploy atual e feito em servidor Hetzner com Docker Compose.

Scripts disponiveis:

```bash
apps/api/scripts/deploy-hetzner.sh
apps/api/scripts/deploy.ps1
apps/api/scripts/setup-server.sh
```

Arquivos relacionados:

```bash
apps/api/Dockerfile
apps/api/docker-compose.hetzner.yml
apps/api/.env.production
```
