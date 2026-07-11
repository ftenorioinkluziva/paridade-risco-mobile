---
name: paridade-risco
description: "Consulta o portfólio de Paridade de Risco: carteira, preços, rebalanceamento, ativos, fundos, cestas e transações. Usa o MCP tool @paridade-risco/mcp quando disponível, ou o CLI @paridade-risco/cli como fallback."
---

# Paridade de Risco

Ferramentas para consultar o portfólio de investimentos em Paridade de Risco. Expõe as mesmas operações de leitura por **MCP tool** (preferido para agentes) e **CLI** (fallback). O catálogo canônico fica em `packages/shared/src/contracts.mjs`.

## Operações Disponíveis

| Operação | Descrição |
|---|---|
| `portfolio_summary` | Snapshot completo: valor total, posições, alocação, drift, fundos, caixa |
| `prices_status` | Status de atualização de preços por ticker (última atualização, dias defasados) |
| `rebalance_preview` | Preview de rebalanceamento: drift, cesta alvo, ações de aporte/redução |
| `list_assets` | Lista de ativos disponíveis |
| `asset_prices` | Preços atuais dos ativos |
| `funds_summary` | Resumo dos fundos de investimento |
| `list_baskets` | Lista de cestas |
| `basket_detail` | Detalhe de uma cesta por `basketId` UUID |
| `transaction_history` | Histórico recente de transações, com `limit` opcional entre 1 e 100 |

## MCP Tool (preferido)

Quando o MCP server `@paridade-risco/mcp` está conectado na sessão, use os tools diretamente:

- **`portfolio_summary`** — sem argumentos. Retorna envelope JSON com `success: true` e `data.totalValue`, `positions`, `allocation`, `funds`, `cashBalance`.
- **`prices_status`** — sem argumentos. Retorna `data.status[]` com `ticker`, `lastUpdate`, `staleDays`.
- **`rebalance_preview`** — sem argumentos. Retorna `data.driftPercentage`, `targetBasketName`, `actions`.
- **`list_assets`** — sem argumentos. Retorna ativos disponíveis.
- **`asset_prices`** — sem argumentos. Retorna preços atuais e tipo de cálculo por ativo.
- **`funds_summary`** — sem argumentos. Retorna fundos cadastrados.
- **`list_baskets`** — sem argumentos. Retorna cestas cadastradas.
- **`basket_detail`** — argumento obrigatório `basketId` (UUID).
- **`transaction_history`** — argumento opcional `limit` (inteiro de 1 a 100).

O token de sessão é fornecido pelo ambiente do MCP client (configurado no `.mcp.json` ou env vars). Não passe credenciais nos argumentos de tool.

Para MCP remoto, use `POST /mcp` com `Authorization: Bearer <token>`. Não use token em URL; o endpoint legado com credencial no path não existe.

## CLI (fallback)

Quando o MCP server **não** está conectado na sessão, use o CLI `pr` via `npx @paridade-risco/cli`.

### Pré-requisitos

1. **Autenticar** (uma vez):
   ```
   npx @paridade-risco/cli login --email <email> --password <password>
   ```
   Isso salva o token de sessão em `~/.config/paridade-risco/config.json`.

2. **(Opcional) Configurar URL da API**:
   ```
   npx @paridade-risco/cli config set-api-url <url>
   ```
   Default: `https://paridaderisco.blackboxinovacao.com.br`

### Comandos CLI

```bash
# Portfolio summary
npx @paridade-risco/cli portfolio

# Price update status
npx @paridade-risco/cli prices status

# Rebalance preview
npx @paridade-risco/cli rebalance

# Assets and prices
npx @paridade-risco/cli list-assets
npx @paridade-risco/cli asset-prices

# Funds and baskets
npx @paridade-risco/cli funds-summary
npx @paridade-risco/cli list-baskets
npx @paridade-risco/cli basket-detail --id <basket-uuid>

# Transactions
npx @paridade-risco/cli transactions --limit 20

# Show current config
npx @paridade-risco/cli config show
```

### Formato de Saída

Todos os comandos retornam JSON. Exemplo do `portfolio`:
```json
{
  "success": true,
  "data": {
    "totalValue": 100000,
    "positionsValue": 75000,
    "fundsValue": 15000,
    "cashBalance": 10000,
    "positionCount": 5,
    "basketDriftPercentage": 3.2,
    "unrealizedGain": 5200,
    "allocation": [
      { "ticker": "IFRM11", "percentage": 37.5, "targetPercentage": 37.5 }
    ],
    "positions": [
      { "ticker": "IFRM11", "shares": 100, "currentValue": 37500, "gain": 1200 }
    ],
    "funds": []
  }
}
```

## Escolha entre MCP e CLI

- **Prefira MCP** sempre que o `@paridade-risco/mcp` estiver conectado — menor custo de tokens, resposta mais rápida.
- **Use CLI** (via `npx`) quando o MCP server não estiver disponível na sessão atual.

## Erros, validação e idempotência

Falhas retornam envelope canônico:

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

O campo `retryable` indica se a automação pode repetir a chamada. Writes de API em `POST /api/transactions`, `POST /api/funds` e `POST /api/baskets` aceitam `Idempotency-Key`; retries com a mesma chave e o mesmo payload reutilizam a resposta, enquanto payload diferente retorna `IDEMPOTENCY_PAYLOAD_CONFLICT`.

Operações de atualização de preços por comando/tool, como `update_prices_all`, `prices update all` e `prices update one`, não estão disponíveis no runtime atual.
