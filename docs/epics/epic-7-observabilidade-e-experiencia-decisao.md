# EPIC-7: Observabilidade e experiência de decisão

**Status:** Done — delivery scope closed; Stories 7.4/7.5 follow-ups pending
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
4. Avaliar e, se aprovado, retirar compatibilidade remanescente do Telegram somente após evidência de uso zero e com rollback documental; preservar o CLI de desenvolvimento e o MCP de uso final.

## Fora de escopo

- Alterar fórmula de paridade ou universo dos 9 ETFs.
- Criar nova fila, broker, aplicativo nativo ou infraestrutura externa sem consumidor aprovado.
- Reativar CRUD manual de transações.
- Executar ordens em corretora.

## Critérios de sucesso

- Fluxos críticos Pluggy/rebalanceamento possuem E2E determinístico para estados positivos e de bloqueio.
- O time consegue identificar quota mensal, ciclos do scheduler, idade por fonte e falhas de webhook/fallback a partir de logs/métricas sanitizados.
- Telas críticas mantêm decisão acionável visível em resoluções desktop e mobile sem overflow horizontal.
- Compatibilidade legada do Telegram só é removida após decisão explícita, evidência de uso zero, smoke de não regressão e rollback; CLI de desenvolvimento e MCP permanecem suportados.
- `npm run lint`, `npm run typecheck`, `npm test` e gates E2E permanecem aprovados.

## Stories propostas

| ID | Story | Executor | Quality gate |
|---|---|---|---|
| 7.1 | E2E de Pluggy, rebalanceamento e recuperação | `@dev` | `@qa` |
| 7.2 | Observabilidade de quota, scheduler e frescor | `@devops` | `@architect` |
| 7.3 | Polimento decision-first responsivo | `@ux-design-expert` | `@dev` |
| 7.4 | Avaliação e retirada controlada de compatibilidade Telegram | `@dev` | `@qa` |
| 7.5 | Orientar bloqueios e primeiro aporte na tela de investimentos | `@ux-design-expert` | `@dev` |

## Handoff AIOX

O @sm transformou as fatias em stories completas e o @po validou critérios, dependências, riscos e ausência de invenção. A implementação segue condicionada aos gates indicados em cada story.

O desenvolvimento será executado em ondas pelo workflow `story-development-cycle`, conforme `docs/operations/epic-7-development-waves.md`. A Onda 1 iniciou pela Story 7.1; 7.4 permanece limitada à coleta de telemetria.

O fechamento técnico está consolidado em `docs/qa/epic-7-closure-2026-08-24.md`. O gate local de runtime foi aprovado após a recriação controlada dos serviços; promoção remota não foi executada neste ciclo.

## PO Validation

**Verdict:** NO-GO para execução imediata; GO condicional de backlog — 2026-08-24.

As stories 7.1–7.3 estão suficientemente definidas para desenvolvimento após a conclusão e aceite do Epic 6, agora encerrado como `Done`. A Story 7.4 não remove CLI nem MCP e permanece bloqueada até a decisão explícita sobre Telegram, evidência sanitizada de uso por 30 dias consecutivos e rollback validado.

Para a Story 7.4, o período de avaliação é uma janela contínua de 30 dias imediatamente anterior à decisão sobre Telegram, usando telemetria agregada por `consumer`, rota/evento e `outcome`, complementada por logs operacionais sanitizados. Ausência de dados, consumidor não identificado ou falha no smoke/rollback resulta em NO-GO e adiamento.

## Change Log

- 2026-08-24: Epic criado pelo @pm após o fechamento do Epic 6.
- 2026-08-24: @po revalidou 7.4: CLI de desenvolvimento e MCP permanecem preservados; somente a compatibilidade legada do Telegram pode ser avaliada, condicionada a evidência de uso zero por 30 dias e rollback validado.
- 2026-08-24: Workflow AIOX em ondas iniciado pela Story 7.1.
- 2026-08-24: Stories 7.1–7.3 concluídas; release gate final pendente por indisponibilidade do Docker Desktop e Story 7.4 mantida como follow-up de telemetria.
- 2026-08-25: Docker Desktop recuperado; API, banco, schedulers, worker e serviços auxiliares recriados e saudáveis. Health HTTP 200, migrations aplicadas, logs de observabilidade verificados, E2E crítico 20 passed/1 skipped e E2E responsivo 21 passed. Epic encerrado no escopo entregue; 7.4 segue bloqueada até a janela de 30 dias.
- 2026-08-25: Story 7.5 aceita pelo @pm como follow-up pós-fechamento do epic, sem criação de novo epic; desenvolvimento condicionado ao handoff `Ready` da story.
