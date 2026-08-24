# Epic 6 — Validação formal do Product Owner

**Data:** 2026-08-24  
**Agente:** @po (Pax)  
**Decisão:** GO para desenvolvimento  
**Escopo:** Epic 6, stories 6.1–6.5

## Decisões ratificadas

- Universo de cotações: exatamente 9 ETFs — `B5P211`, `BOVA11`, `DOLA11`, `FIXA11`, `IB5M11`, `IMAB11`, `IRFM11`, `LFTS11` e `XFIX11`.
- Fora do monitoramento: `BOVV11`, `SMAL11` e `SPXI11`.
- Scheduler: cadência de 7 minutos, mantendo a janela de mercado e a captura final existentes.
- Orçamento: 12.474 chamadas estimadas em 22 pregões e 14.175 em 25 pregões, antes de retries, contra limite de 15.000/mês.
- Pluggy: fonte operacional para contas, posições, transações e empréstimos; webhook imediato e fallback a cada 30 minutos.
- Concorrência: até 20 usuários/conexões Pluggy, com coalescência, lock e limite por item.
- Transações: CRUD manual desativado completamente em UI, API, CLI e MCP; leituras de transações Pluggy permanecem.
- Release: promoção controlada, smoke, observabilidade e rollback reproduzível sob autoridade do @devops.

## Matriz de validação

| Story | Escopo e critérios | Dependências | Testabilidade | Veredicto |
|---|---|---|---|---|
| 6.1 | 9 ETFs, exclusões, scheduler, quota, retries e lock | Epic 5, 4.7 | Unitário, integração, Compose e smoke | **GO** |
| 6.2 | Webhook completo, fallback 30 min, frescor, deduplicação e 20 conexões | Stories Pluggy 3.4/3.5/3.18/3.19/3.20 | Replay, concorrência, worker e estados | **GO** |
| 6.3 | Rebalanceamento exclusivamente Pluggy, ação/não ação e bloqueios de frescor | 6.1, 6.2, 4.1, 4.3, 3.14 | Core, API/CLI/MCP e E2E | **GO** |
| 6.4 | Ausência de escrita manual em todos os canais, preservando leitura Pluggy | 6.2, 4.2, 4.3 | Auditoria negativa, contratos e E2E | **GO** |
| 6.5 | Runbook, smoke, quota, Pluggy, deploy controlado e rollback | 6.1–6.4, 5.9 | Checklist, CI/CD, Compose e dry-run | **GO** |

## Ajustes realizados durante a validação

1. A lista canônica de 9 ETFs foi explicitada no Epic e na Story 6.1.
2. A Story 6.1 foi renomeada de “oito ETFs” para “9 ETFs”.
3. O resultado esperado do Epic foi alinhado à desativação completa do CRUD manual.
4. Epic 6 e stories 6.1–6.5 foram marcados como `Ready for Development`.

## Limites da decisão

Este GO aprova o planejamento e não autoriza implementação, push, merge ou deploy. Cada story ainda precisa cumprir seus gates e obter a aprovação do executor de qualidade designado antes do merge.
