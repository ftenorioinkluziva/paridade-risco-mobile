---
name: paridade-risco
description: "Consulta o portfólio de Paridade de Risco: resumo da carteira, status de preços e preview de rebalanceamento. Usa o MCP tool @paridade-risco/mcp quando disponível, ou o CLI @paridade-risco/cli como fallback."
---

# Paridade de Risco

Ferramentas para consultar o portfólio de investimentos em Paridade de Risco. Expõe as mesmas operações de duas formas: **MCP tool** (preferido para agentes) e **CLI** (fallback).

## Operações Disponíveis

| Operação | Descrição |
|---|---|
| `portfolio_summary` | Snapshot completo: valor total, posições, alocação, drift, fundos, caixa |
| `prices_status` | Status de atualização de preços por ticker (última atualização, dias defasados) |
| `rebalance_preview` | Preview de rebalanceamento: drift, cesta alvo, ações de aporte/redução |
| `update_prices_all` | Gatilho para atualizar preços de todos os ativos (incremental ou full) |

## MCP Tool (preferido)

Quando o MCP server `@paridade-risco/mcp` está conectado na sessão, use os tools diretamente:

- **`portfolio_summary`** — sem argumentos. Retorna JSON com totalValue, positions, allocation, funds, cashBalance.
- **`prices_status`** — sem argumentos. Retorna JSON com ticker, lastUpdate, staleDays.
- **`rebalance_preview`** — sem argumentos. Retorna JSON com driftPercentage, targetBasketName, actions.
- **`update_prices_all`** — argumento opcional `incremental` (boolean, default true). Retorna JSON com resultados por ativo.

O bot token / sessão é fornecido pelo ambiente do MCP client (configurado no `.mcp.json` ou env vars).
Não é necessário passar credenciais nos argumentos.

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

# Trigger full price update (incremental)
npx @paridade-risco/cli prices update all

# Trigger full price update (complete refresh)
npx @paridade-risco/cli prices update all --full

# Update single asset
npx @paridade-risco/cli prices update one --ticker IFRM11

# Rebalance preview
npx @paridade-risco/cli rebalance

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
- **Para `update_prices_all`**: prefira MCP quando disponível. Use CLI com `npx @paridade-risco/cli prices update all --full` para refresh completo.