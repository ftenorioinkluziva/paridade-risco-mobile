# Smoke tests multi-interface

Este roteiro valida que API, CLI, MCP local e MCP remoto continuam usando o mesmo contrato canônico definido em `packages/shared/src/contracts.mjs`.

## Contratos disponíveis

Operações de leitura:

- `portfolio_summary`
- `prices_status`
- `rebalance_preview`
- `list_assets`
- `asset_prices`
- `funds_summary`
- `list_baskets`
- `basket_detail` com `basketId` UUID
- `transaction_history` com `limit` opcional entre 1 e 100

Operações de atualização de preços por CLI/MCP, como `update_prices_all`, `prices update all` e `prices update one`, não existem no runtime atual.

## Autenticação

CLI e MCP local usam `Authorization: Bearer <token>` com `PARIDADE_API_KEY` ou a chave salva por `pr auth configure`. A CLI exige os escopos `read` e `sync`; não recebe senha e não chama `/api/auth/login`. Consulte [Autenticação da CLI por chave de API](./cli-api-key-auth.md).

O MCP remoto aceita somente:

```http
POST /mcp
Authorization: Bearer <token>
```

Não use token em URL. O endpoint legado com credencial no path foi removido e deve responder `404`. `x-user-id` não define identidade.

## Erros canônicos

Falhas devem retornar:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "category": "validation",
    "message": "Operation input is invalid",
    "retryable": false
  }
}
```

`error.code` é estável para automações, `category` classifica a falha e `retryable` indica se retry automático é aceitável.

## Idempotência de writes

`POST /api/transactions`, `POST /api/funds` e `POST /api/baskets` aceitam `Idempotency-Key`. A chave é vinculada ao usuário, operação e hash do payload:

- retry com a mesma chave e mesmo payload reutiliza a resposta persistida;
- retry com a mesma chave e payload diferente retorna `409` com `IDEMPOTENCY_PAYLOAD_CONFLICT`;
- sem chave, o endpoint preserva o comportamento legado não idempotente.

## Comandos de smoke

Execute da raiz do monorepo:

```bash
npm test --workspace @paridade-risco/shared
npm test --workspace @paridade-risco/cli
npm test --workspace @paridade-risco/remote-mcp
npm test --workspace @paridade-risco/api
npm run test:integration --workspace @paridade-risco/api
```

Esses testes cobrem:

- descoberta e schema de tools MCP a partir do catálogo canônico;
- paridade observável entre CLI, MCP local e MCP remoto;
- `transaction_history.limit` aplicado como `/api/transactions?limit=<n>`;
- input inválido com erro canônico `INVALID_INPUT`;
- falha externa com preservação de `error.code` e `retryable`;
- autenticação Bearer no MCP remoto, remoção de token em URL e logs redigidos;
- idempotência real contra PostgreSQL para os três fluxos de write.

Para o gate completo do repositório:

```bash
npm run lint
npm run typecheck
npm test
npm run build:api
```

## Verificação manual opcional

CLI:

```bash
PARIDADE_API_KEY=<secret-manager> node packages/cli/src/index.mjs auth configure
node packages/cli/src/index.mjs auth status
node packages/cli/src/index.mjs list-assets
```

MCP remoto:

```bash
curl -i -X POST http://localhost:3000/mcp
curl -i -X POST http://localhost:3000/mcp -H "Authorization: Bearer <token>"
```

O primeiro deve retornar `401` canônico; o segundo deve chegar ao handler MCP quando o token for válido. A regressão do endpoint legado com credencial no path é coberta por `apps/remote-mcp/test/auth.test.mjs`, sem publicar o formato como exemplo operacional.
