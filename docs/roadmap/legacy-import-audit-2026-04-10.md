# Auditoria de Importacao Legado -> V2 (2026-04-10)

## Objetivo

Verificar se existe informacao relevante no legado ainda nao importada para a v2 apos a implementacao de Posicoes, Fundos, Transacoes e Rebalanceamento.

## Inventario de entidades

### Legado (Prisma)

- User
- Portfolio
- Cesta
- Ativo
- AtivosEmCestas
- DadoHistorico
- Transacao
- FundoInvestimento
- SimulacaoAposentadoria
- Resource
- Embedding
- Notification
- Chat

### V2 (Drizzle)

- users
- sessions
- assets
- historical_prices
- portfolios
- transactions
- baskets
- basket_allocations
- investment_funds

## Cobertura de import atual

### Ja importado

- User
- Portfolio
- Cesta
- Ativo
- AtivosEmCestas
- DadoHistorico
- Transacao
- FundoInvestimento

### Nao importado

- SimulacaoAposentadoria
- Resource
- Embedding
- Notification
- Chat

## Contagens legadas (evidencia)

- User: 2
- Portfolio: 2
- Cesta: 5
- Ativo: 13
- AtivosEmCestas: 35
- DadoHistorico: 26653
- Transacao: 71
- FundoInvestimento: 2
- SimulacaoAposentadoria: 0
- Resource: 25
- Embedding: 192
- Notification: 0
- Chat: 6

## Ajuste aplicado nesta rodada

Foi identificada uma lacuna funcional relevante para paridade de calculo:

- Campo legado `Ativo.calculationType` nao existia na v2

Acao executada:

1. Adicionado enum `asset_calculation_type` no schema v2
2. Adicionada coluna `assets.calculation_type`
3. Atualizado import de ativos no `migrate-legacy.ts`
4. Aplicada migracao SQL `0003_navy_asset_calculation_type.sql`
5. Re-sync legado -> v2 executado sem historico

Validacao:

- Legado: PRECO=9, PERCENTUAL=4
- V2: PRECO=9, PERCENTUAL=4

## Decisao sobre importacoes pendentes

### Necessario agora para as 4 telas

- Nenhuma nova entidade adicional alem do ajuste de `calculationType` (ja aplicado)

### Nao necessario para o escopo atual (manter no backlog)

- Resource/Embedding (base de conhecimento)
- Chat
- SimulacaoAposentadoria
- Notification

Essas entidades pertencem a modulos de produto fora do escopo funcional imediato das 4 telas financeiras.