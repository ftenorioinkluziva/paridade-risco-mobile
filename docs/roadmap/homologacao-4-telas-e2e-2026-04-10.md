# Homologacao E2E - 4 Telas (2026-04-10)

## Escopo validado

1. Posicoes
2. Fundos
3. Transacoes
4. Rebalanceamento

## Evidencias de execucao

### Posicoes

- Endpoint: `GET /api/portfolio/summary`
- Resultado:
  - `totalValue`: 11399.400000000001
  - `positionCount`: 6
  - `positions.length`: 6

### Fundos (CRUD)

- Endpoints:
  - `POST /api/funds`
  - `PUT /api/funds/{id}`
  - `DELETE /api/funds/{id}`
- Resultado:
  - Fundo criado: `1f9cd943-06d5-4f25-bacc-9f1f225a24d1`
  - `currentValue` atualizado para `575.25`
  - Exclusao confirmada com `ok=true`

### Transacoes

- Endpoint base: `GET /api/transactions`
- Filtros validados:
  - `type=COMPRA`
  - `from=<ISO>`
- Resultado:
  - `tx_all`: 65
  - `tx_buy`: 59
  - `tx_90d`: 7
  - Campo `tradedAt` presente no payload

### Rebalanceamento

- Endpoints:
  - `GET /api/rebalance/preview?includeCash=true`
  - `GET /api/rebalance/preview?includeCash=false`
- Resultado:
  - `withCash.calculationBaseValue`: 11399.400000000001
  - `withoutCash.calculationBaseValue`: 10708.61
  - Diferenca: 690.790000000001 (igual ao caixa)
  - `summary.totalValue` e `rebalance.portfolioValue` consistentes

## Gates

- `npm run typecheck:api`: PASS
- `npm run typecheck:mobile`: PASS

## Conclusao

Paridade funcional das 4 telas validada na API e no fluxo de tela mobile implementado nesta sprint.