# EPIC-3: Pluggy como fonte financeira do Paridade de Risco

**Status:** In Progress  
**Owner:** Product / Architecture  
**Created:** 2026-08-04

## Objective

Substituir gradualmente os dados manuais de fundos, transações e caixa por dados financeiros observados pelo Pluggy, preservando o motor de Paridade de Risco como a camada de decisão.

O produto deverá responder, em uma única experiência:

1. Como está a carteira em relação à cesta-alvo?
2. O que deveria ser comprado ou reduzido?
3. Existe liquidez para executar a decisão sem comprometer obrigações?
4. Como cartão, fluxo de caixa e empréstimos afetam a capacidade de investir?

## Product thesis

> Pluggy fornece a realidade financeira observada; o Paridade de Risco interpreta, calcula e orienta.

O app não será um home broker, não executará ordens e não tratará limite de crédito como patrimônio.

## Current baseline

- O Docker local funciona com PostgreSQL, dados manuais e preços Yahoo/BCB.
- O domínio atual possui `transactions`, `investment_funds`, `portfolios.cashBalance`, `assets` e `baskets`.
- O motor de rebalanceamento já está isolado em `packages/shared/src/operations/rebalance.ts`.
- O endpoint de preview ainda depende da projeção local em `apps/api/src/lib/portfolio.ts`.
- Nenhuma credencial Pluggy deve ser commitada ou exposta ao frontend.

## Environment strategy

O primeiro ambiente experimental será o Sandbox da aplicação Pluggy já criada no Dashboard.

- `PLUGGY_ENVIRONMENT=sandbox` é o padrão local.
- Credenciais ficam somente no `.env` local ou no secret manager.
- O item Sandbox é configurado por `PLUGGY_SANDBOX_ITEM_ID`, nunca hardcoded no código.
- Produção exige opt-in explícito com `PLUGGY_ENABLE_PRODUCTION=true`.
- Sandbox, produção e seus dados não serão misturados.

## Domain decisions

- **Carteira de risco:** posições de investimento mapeadas para os ativos da cesta.
- **Patrimônio financeiro:** carteira de risco mais saldos bancários, quando explicitamente solicitado.
- **Liquidez disponível:** saldo bancário menos reserva e obrigações próximas.
- **Limite de cartão:** capacidade de crédito, nunca caixa.
- **Posição não mapeada:** visível e sinalizada; nunca descartada silenciosamente.
- **Custo médio ausente:** cálculo de alocação pode continuar, mas rentabilidade/custo médio deve ser marcado como incompleto.
- **Execução:** o app produz plano e checklist; não envia ordens para corretoras.

## Architecture target

```text
Pluggy API
  -> Pluggy client (auth, request, validation)
  -> connections/accounts/investments/transactions/loans
  -> normalized financial projection
  -> portfolio provider (local | pluggy | dual-read)
  -> risk parity and liquidity rules
  -> decision-first UI, CLI and MCP adapters
```

## Stories and execution waves

| ID | Title | Priority | Status | Depends on |
|---|---|---|---|---|
| [3.1](../stories/3.1.pluggy-sandbox-client-foundation.story.md) | Fundação do cliente Pluggy e Sandbox | Critical | Done | - |
| [3.2](../stories/3.2.pluggy-persistence-initial-sync.story.md) | Persistência Pluggy e sincronização inicial Sandbox | Critical | Done | 3.1 |
| [3.3](../stories/3.3.pluggy-normalized-projection.story.md) | Contrato e projeção normalizada dos investimentos Pluggy | Critical | Done | 3.2 |
| [3.4](../stories/3.4.pluggy-continuous-sync-freshness.story.md) | Conexões, contas e sincronização contínua | Critical | Done | 3.2, 3.3 |
| [3.5](../stories/3.5.pluggy-webhooks-idempotency.story.md) | Webhooks e reconciliação idempotente | High | Done | 3.4 |
| [3.6](../stories/3.6.pluggy-investment-mapping.story.md) | Investimentos Pluggy e mapeamento estratégico | Critical | Done | 3.3 |
| [3.7](../stories/3.7.pluggy-portfolio-provider-dual-read.story.md) | PortfolioProvider Pluggy e dual-read | Critical | Done | 3.3, 3.6 |
| [3.8](../stories/3.8.pluggy-rebalance-liquidity.story.md) | Rebalanceamento com liquidez real | Critical | Done | 3.7 |
| [3.9](../stories/3.9.pluggy-card-cashflow-obligations.story.md) | Cartão, fluxo de caixa e obrigações | High | Done | 3.4, 3.7 |
| [3.10](../stories/3.10.pluggy-loans-health.story.md) | Empréstimos e alertas de saúde financeira | High | Done | 3.9 |
| [3.11](../stories/3.11.pluggy-migration-readiness.story.md) | Migração e retirada gradual do CRUD manual | Medium | Done | 3.8, 3.10 |
| [3.12](../stories/3.12.pluggy-mapping-review-ui.story.md) | Revisão de mapeamentos Pluggy na interface | High | Done | 3.6, 3.11 |
| [3.13](../stories/3.13.pluggy-outside-strategy-decision.story.md) | Decisão de investimento fora da estratégia | High | Done | 3.6, 3.11, 3.12 |
| [3.14](../stories/3.14.pluggy-rebalance-ui-coverage.story.md) | Prévia de rebalanceamento Pluggy com cobertura | High | Done | 3.8, 3.13 |
| [3.15](../stories/3.15.pluggy-sandbox-ignore-fictional-manual-baseline.story.md) | Sandbox sem baseline manual fictício | High | Done | 3.11, 3.14 |
| [3.16](../stories/3.16.pluggy-explicit-source-switch.story.md) | Troca explícita da fonte da carteira para Pluggy | Critical | Done | 3.11, 3.14, 3.15 |
| [3.17](../stories/3.17.pluggy-financial-health-ui.story.md) | Painel de saúde financeira Pluggy | High | Done | 3.9, 3.10, 3.16 |
| [3.18](../stories/3.18.pluggy-connection-lifecycle.story.md) | Ciclo de vida e reautorização Pluggy | High | Done | 3.5, 3.17 |
| [3.19](../stories/3.19.pluggy-webhook-observability.story.md) | Observabilidade e reprocessamento de eventos Pluggy | High | Done | 3.5, 3.18 |
| [3.20](../stories/3.20.pluggy-public-webhook-activation.story.md) | Ativação operacional do webhook Pluggy | Medium | Pending | 3.5, 3.19 |

## First vertical slice

Conectar Sandbox -> consultar item -> importar investimentos -> preservar a origem -> preparar o mapeamento -> deixar o adapter pronto para alimentar a projeção real.

A primeira slice não altera ainda o resumo da carteira nem remove as telas manuais. Ela cria a fronteira segura para as próximas stories.

## Quality gates

Cada story deve atualizar sua File List e passar:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build:api`

As stories de integração também terão testes com fetch mockado, fixtures sanitizadas e smoke opcional contra o Sandbox configurado localmente.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Cobertura varia por instituição | Diferenciar `unavailable`, `not-consented`, `stale` e valor zero |
| API Key expira | Cache server-side com renovação e retry controlado |
| Webhook local inacessível | Usar túnel HTTPS ou staging; processar após resposta 2xx |
| Duplicação de sincronizações | IDs Pluggy únicos, `sync_runs` e idempotência por evento |
| Posição sem identificador confiável | Mapping explícito com revisão do usuário |
| Mistura de crédito com caixa | Projeções separadas para patrimônio, risco e liquidez |
| Falta de histórico de investimento | Sinalizar custo médio/rentabilidade incompletos |

## Definition of Done for the epic

- [ ] Sandbox conectado e validado por smoke test.
- [ ] Carteira Pluggy disponível em projeção normalizada.
- [ ] Dual-read compara dados manuais e Pluggy sem divergência não explicada.
- [ ] Rebalanceamento usa posições reais e política explícita de liquidez.
- [ ] Cartão, fluxo de caixa e empréstimos não são confundidos com patrimônio.
- [ ] Webhooks e reconciliação são idempotentes.
- [ ] CRUD manual foi retirado somente após período de compatibilidade.
- [ ] Documentação, stories e runtime refletem o mesmo contrato.

## Integration references

- [Pluggy authentication](https://docs.pluggy.ai/reference/auth)
- [Create Connect Token](https://docs.pluggy.ai/reference/connect-token-create)
- [Investments list](https://docs.pluggy.ai/reference/investments-list)
- [Transactions by cursor](https://docs.pluggy.ai/reference/transactions-list-by-cursor)
- [Sandbox](https://docs.pluggy.ai/docs/sandbox)
- [Webhooks](https://docs.pluggy.ai/docs/webhooks)

## Change Log

- 2026-08-04: Epic criado como plano canônico de implementação Pluggy, com Sandbox como ambiente experimental.
- 2026-08-04: Story 3.3 concluída com projeção normalizada somente leitura, classificação por risco, estados de mapeamento, CLI e endpoint autenticado.
- 2026-08-04: Story 3.6 concluída com vínculos estratégicos persistidos, aprovação idempotente, remoção reversível e contrato inicial de `PortfolioProvider`.
- 2026-08-04: Story 3.7 concluída com provider Pluggy mapeado, caixa/cartão separados, dual-read por ticker e CLI/endpoint somente leitura.
- 2026-08-04: Story 3.8 concluída com prévia de rebalanceamento Pluggy, regras explícitas de liquidez e endpoint/CLI protegidos.
- 2026-08-04: Story 3.9 concluída com visão de cartão, fluxo de caixa, obrigações e proteção contra dupla contagem de pagamentos.
- 2026-08-04: Story 3.10 concluída com empréstimos sanitizados, estados de completude e alertas explicáveis de saúde financeira.
- 2026-08-04: Story 3.11 concluída com gate de prontidão para migração, modo manual preservado e bloqueio seguro enquanto o dual-read divergir.
- 2026-08-04: Story 3.12 concluída com tela autenticada de revisão, aprovação explícita e remoção reversível de mapeamentos Pluggy.
- 2026-08-04: Story 3.13 concluída com decisão reversível `FORA_DA_ESTRATEGIA`, motivo persistido, separação patrimonial e bloqueio somente para pendências sem decisão.
- 2026-08-04: Story 3.14 concluída com prévia Pluggy no rebalanceamento, cobertura da análise e separação visual de patrimônio fora da estratégia.
- 2026-08-04: Story 3.15 concluída com política Sandbox explícita para desconsiderar o baseline manual fictício, mantendo divergência observável e proteção contra ativação em produção.
- 2026-08-04: Story 3.16 concluída com aprovação persistida da fonte Pluggy, leitura ativa no resumo/rebalanceamento e CRUD manual preservado para compatibilidade.
- 2026-08-04: Story 3.4 concluída com sincronização manual/autônoma Pluggy, frescor `FRESH`/`STALE`/`UNAVAILABLE`, proteção contra concorrência e scheduler Docker no Sandbox.
- 2026-08-04: Story 3.5 concluída com endpoint de webhook autenticado, deduplicação por `eventId`, fila durável, worker de reconciliação e retries limitados; cadastro no Dashboard aguarda URL HTTPS pública.
- 2026-08-04: Story 3.17 concluída com painel autenticado de saúde financeira, cartões, obrigações, fluxo de caixa, empréstimos e alertas explicáveis.
- 2026-08-04: Stories 3.18 e 3.19 concluídas com ciclo de vida de conexão, orientação de reautorização, observabilidade de eventos e retry controlado.
- 2026-08-04: Story 3.20 registrada como pendência para ativação do webhook em URL HTTPS pública e cadastro no Dashboard Pluggy.
