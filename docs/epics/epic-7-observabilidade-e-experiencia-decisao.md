# EPIC-7: Observabilidade e experiência de decisão

**Status:** Ready for Development (conditional)  
**Owner:** Product / Engineering  
**Created:** 2026-08-24  
**Depends on:** Epic 6 (Done)

## Epic Goal

Consolidar a base operacional do Epic 6 para que frescor, quota, erros de sincronização e decisões de rebalanceamento sejam observáveis, testáveis e fáceis de entender em desktop e mobile, sem reabrir superfícies legadas nem alterar a fórmula de paridade.

## Contexto

O produto já opera com 9 ETFs, scheduler de 7 minutos, Pluggy como fonte operacional de contas, posições, transações e empréstimos, webhook imediato com fallback de 30 minutos e rebalanceamento acionável. O próximo ciclo deve reduzir incerteza operacional e melhorar a leitura da próxima decisão financeira.

## Escopo proposto

1. Expandir E2E dos fluxos Pluggy/rebalanceamento para estados de sucesso, sem ação, stale, erro e recuperação.
2. Expor observabilidade operacional de quota, scheduler, frescor, webhook, fallback, skip e falha sem registrar dados sensíveis.
3. Polir hierarquia, densidade, espaçamento e estados de loading/empty/error nas telas críticas para desktop e mobile.
4. Retirar compatibilidade remanescente de sessões CLI/Telegram somente após evidência de ausência de consumidores ativos e com rollback documental.

## Fora de escopo

- Alterar fórmula de paridade ou universo dos 9 ETFs.
- Criar nova fila, broker, aplicativo nativo ou infraestrutura externa sem consumidor aprovado.
- Reativar CRUD manual de transações.
- Executar ordens em corretora.

## Critérios de sucesso

- Fluxos críticos Pluggy/rebalanceamento possuem E2E determinístico para estados positivos e de bloqueio.
- O time consegue identificar quota mensal, ciclos do scheduler, idade por fonte e falhas de webhook/fallback a partir de logs/métricas sanitizados.
- Telas críticas mantêm decisão acionável visível em resoluções desktop e mobile sem overflow horizontal.
- Compatibilidade legada só é removida com evidência de uso zero e smoke de não regressão.
- `npm run lint`, `npm run typecheck`, `npm test` e gates E2E permanecem aprovados.

## Stories propostas

| ID | Story | Executor | Quality gate |
|---|---|---|---|
| 7.1 | E2E de Pluggy, rebalanceamento e recuperação | `@dev` | `@qa` |
| 7.2 | Observabilidade de quota, scheduler e frescor | `@devops` | `@architect` |
| 7.3 | Polimento decision-first responsivo | `@ux-design-expert` | `@dev` |
| 7.4 | Retirada final de compatibilidade CLI/Telegram | `@dev` | `@qa` |

## Handoff AIOX

O @sm transformou as fatias em stories completas e o @po validou critérios, dependências, riscos e ausência de invenção. A implementação segue condicionada aos gates indicados em cada story.

## PO Validation

**Verdict:** NO-GO para execução imediata; GO condicional de backlog — 2026-08-24.

As stories 7.1–7.3 estão suficientemente definidas para desenvolvimento após a conclusão e aceite do Epic 6, agora encerrado como `Done`. A Story 7.4 permanece bloqueada até existir evidência sanitizada de uso zero por 30 dias consecutivos e rollback validado.

Para a Story 7.4, o período aprovado pelo PO é uma janela contínua de 30 dias imediatamente anterior à decisão de remoção, e a fonte é a telemetria agregada existente por `consumer`, rota/evento e `outcome`, complementada pelos logs operacionais sanitizados de API/CLI/Telegram. Ausência de dados, qualquer chamada legada na janela ou falha no smoke/rollback resulta em NO-GO e adiamento.

## Change Log

- 2026-08-24: Epic criado pelo @pm após o fechamento do Epic 6.
- 2026-08-24: @po validou 7.1–7.3 condicionalmente; 7.4 ficou bloqueada até evidência de uso zero por 30 dias e rollback validado.
