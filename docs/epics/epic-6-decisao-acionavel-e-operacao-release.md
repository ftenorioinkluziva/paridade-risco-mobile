# EPIC-6: Decisão acionável e operação de release

**Status:** Ready for Development  
**Owner:** Product / Architecture  
**Created:** 2026-08-24  
**Depends on:** Epic 5 (Done)

## Objetivo

Transformar a estabilidade obtida no Epic 5 em valor operacional recorrente: o investidor deve entender a próxima ação de rebalanceamento baseada nas posições Pluggy, manter contas/posições/transações/empréstimos atualizados sem sobrecarregar o provedor e a equipe deve conseguir publicar ou reverter releases com procedimento reproduzível.

## Contexto e baseline

- O produto passa a operar sobre 9 ETFs vigentes; `BOVV11`, `SMAL11` e `SPXI11` ficam fora do monitoramento.
- A lista canônica dos 9 ETFs é: `B5P211`, `BOVA11`, `DOLA11`, `FIXA11`, `IB5M11`, `IMAB11`, `IRFM11`, `LFTS11` e `XFIX11`.
- O scheduler de cotações será recalibrado para 7 minutos.
- A experiência principal prioriza decisão financeira antes da exploração de detalhes.
- Os fluxos críticos contam com E2E Chromium desktop/mobile e execução em Docker Compose.
- O roadmap existente define, para o ciclo de 61–90 dias, recomendação acionável de rebalanceamento, fluxo rápido de transação e runbook de release/rollback.

## Decisões confirmadas

- O limite de 15.000 requisições/mês refere-se ao plano utilizado para cotações de mercado. Com 9 ETFs e cron `*/7 10-16`, são aproximadamente 62 ciclos intraday + 1 captura final por dia: 12.474 chamadas em 22 dias úteis e 14.175 em 25 dias úteis, antes de retries. A margem será preservada em relação a uma cadência de 6 minutos.
- Pluggy permanece fonte operacional para contas, investimentos/posições, transações e empréstimos.
- O caminho de atualização será webhook imediato + fallback de verificação a cada 30 minutos, com coalescência/skip para evitar sincronização duplicada do mesmo item.
- O CRUD manual de transações será desativado completamente e não participará dos cálculos.
- O dimensionamento inicial considera até 20 usuários/conexões Pluggy simultâneos.

## Escopo proposto

1. **Universo e orçamento de cotações:** operar os 9 ETFs canônicos, remover os três ETFs fora de escopo, recalcular fixtures/cestas e operar o scheduler em 7 minutos com contador mensal e margem observável.
2. **Frescor Pluggy:** manter contas, posições, transações e empréstimos; sincronizar imediatamente por webhook e usar fallback de 30 minutos com deduplicação, lock e limite por item.
3. **Rebalanceamento acionável:** apresentar recomendação de compra/venda, quantidade/valor e motivo com base exclusivamente nas posições Pluggy e na cesta ativa, preservando os cálculos compartilhados.
4. **Desativação completa do CRUD manual:** retirar telas, mutations e contratos de escrita de transações manuais, mantendo apenas o que for necessário para leitura histórica técnica ou dados Pluggy.
5. **Release operacional:** documentar e validar checklist de release, smoke pós-deploy, observabilidade e rollback controlado.

## Resultado esperado

- O usuário identifica e executa a próxima ação sem interpretar dados brutos.
- Dados de transações Pluggy permanecem atualizados e consultáveis sem reabrir um CRUD manual.
- Um release pode ser promovido ou revertido com evidências e passos reproduzíveis.

## Propostas de stories para decomposição pelo @sm

| ID provisório | Fatia | Executor previsto | Quality gate previsto |
|---|---|---|---|
| 6.1 | Cotações: 9 ETFs, scheduler de 7 minutos e orçamento mensal | `@dev` | `@qa` |
| 6.2 | Pluggy: webhook imediato + fallback de 30 minutos para dados completos | `@dev` | `@architect` |
| 6.3 | Rebalanceamento baseado exclusivamente em posições Pluggy | `@dev` | `@architect` |
| 6.4 | Desativação completa do CRUD manual de transações | `@dev` | `@qa` |
| 6.5 | Runbook de release, smoke e rollback | `@devops` | `@qa` |

Os IDs e limites acima são uma proposta de planejamento; nenhum arquivo de story será criado ou implementado antes da geração pelo `@sm` e validação formal pelo `@po`.

## Fora de escopo

- Alterar a fórmula de paridade.
- Reintroduzir `BOVV11`, `SMAL11` ou `SPXI11` no monitoramento.
- Aumentar a cadência acima do orçamento aprovado sem nova medição de quota.
- Reintroduzir sessões legadas de CLI/Telegram.
- Reativar telas manuais desativadas como área principal.
- Criar aplicativo nativo ou execução de ordens em corretora.

## Dependências e integrações

- `packages/shared`: cálculos de carteira, rebalanceamento, schemas e idempotência.
- `apps/api`: contratos de transação, resumo e prévia de rebalanceamento.
- `apps/api/src/app`: telas de resumo, investimentos e transações.
- Playwright E2E, Docker Compose e workflows de deploy existentes.

## Critérios de sucesso do epic

- A recomendação acionável é derivada do core compartilhado e coberta por testes de domínio e E2E.
- O fluxo de transação preserva autenticação, validação, idempotência e atualização do resumo.
- O runbook permite executar smoke, verificar logs/scheduler e reverter o deploy com segurança.
- `npm run lint`, `npm run typecheck`, `npm test`, build Docker e E2E crítico permanecem aprovados.
- Não há regressão nos 9 ETFs, no scheduler de 7 minutos, no Pluggy ou nas interfaces CLI/Telegram.
- O cenário de até 20 usuários Pluggy não produz sincronizações duplicadas ou concorrentes para o mesmo item.
- O CRUD manual não possui caminho de escrita acessível na UI, API, CLI ou MCP.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Recomendação divergir do cálculo de paridade | Manter regra no core compartilhado e validar contra fixtures determinísticas. |
| Posições desatualizadas ou sincronizações duplicadas | Webhook como gatilho principal, fallback condicionado à idade do último sync, coalescência por item e lock existente. |
| Transação manual duplicada ou resumo desatualizado | Remover o caminho manual e validar que o resumo deriva das posições Pluggy persistidas. |
| Release sem recuperação operacional | Smoke obrigatório, logs capturados, checklist e rollback testado antes do deploy. |

## Handoff AIOX

1. `@sm` deve decompor este epic em stories completas, com critérios de aceite, dependências, arquivos prováveis e quality gates.
2. `@po` deve validar as stories e emitir GO/NO-GO antes de qualquer implementação.
3. Após aprovação, a execução seguirá SDC por story e ondas AIOX, com `@devops` responsável por push, merge e deploy.

## PO Validation

**Verdict:** GO — 2026-08-24

O escopo está coerente para decomposição e implementação: nove ETFs canônicos, scheduler de 7 minutos, orçamento de 12.474 chamadas em 22 pregões e 14.175 em 25 pregões antes de retries, Pluggy como fonte operacional para contas/posições/transações/empréstimos, webhook imediato com fallback de 30 minutos, limite inicial de 20 conexões simultâneas e CRUD manual completamente desativado. As cinco stories foram validadas individualmente e estão `Ready for Development`.

## Change Log

- 2026-08-24: Epic criado por @pm a partir do roadmap 61–90 dias e dos resultados validados do Epic 5.
- 2026-08-24: Escopo ajustado: 9 ETFs, scheduler de 7 minutos, Pluggy como fonte única operacional, webhook + fallback de 30 minutos, CRUD manual desativado e limite inicial de 20 usuários.
- 2026-08-24: @po ratificou a lista canônica de 9 ETFs e aprovou as stories 6.1–6.5 para desenvolvimento.
