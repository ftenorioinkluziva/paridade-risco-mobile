# EPIC-4: Experiência Pluggy e decisão financeira

**Status:** In Progress  
**Owner:** Product / Architecture  
**Created:** 2026-08-04

## Objetivo

Reposicionar a experiência principal do Paridade de Risco em torno dos dados observados pelo Pluggy e das decisões que o usuário precisa tomar, reduzindo a exposição das telas manuais legadas.

## Resultado esperado

- Uma tela de investimentos combina carteira observada e rebalanceamento.
- Fundos, Transações e Rebalancear deixam de aparecer como áreas principais.
- O Resumo passa a priorizar patrimônio, caixa, obrigações, alertas e próxima decisão.
- O legado permanece preservado nas APIs e no banco para compatibilidade.

## Stories

| ID | Título | Prioridade | Status | Depende de |
|---|---|---|---|---|
| [4.1](../stories/4.1.investimentos-pluggy-rebalanceamento.story.md) | Carteira de investimentos Pluggy com rebalanceamento | Critical | Done | Epic 3 |
| [4.2](../stories/4.2.desativacao-telas-legadas.story.md) | Desativação controlada das telas legadas | High | Done | 4.1 |
| [4.3](../stories/4.3.resumo-financeiro-pluggy.story.md) | Resumo financeiro orientado à decisão | High | Done | 4.1 |
| [4.4](../stories/4.4.normalizacao-loans-pluggy.story.md) | Normalização dos empréstimos Pluggy | High | In Progress | Epic 3 |

## Decisões de produto

- `/investimentos` é a nova entrada para carteira e rebalanceamento.
- `/pluggy` continua sendo a área operacional de sincronização e revisão de mapeamentos.
- `/saude-financeira` continua dedicada a caixa, cartão, obrigações e empréstimos.
- `/cestas` permanece ativa porque a cesta estratégica é necessária ao motor de risco.
- As telas manuais antigas não são apagadas do domínio; suas rotas exibem uma transição segura e suas APIs permanecem disponíveis.

## Quality gates

- `npm run typecheck:api`
- `npm run lint:api`
- `npm run build:api` via Docker
- `npm test`
- validação no navegador das rotas `/`, `/investimentos`, `/fundos`, `/transacoes` e `/rebalanceamento`

## Change Log

- 2026-08-04: Sprint concluída com carteira Pluggy unificada ao rebalanceamento, desativação visual do legado e novo resumo financeiro.
- 2026-08-04: Story 4.4 aberta após diagnóstico do payload real de Loans; o adapter precisava reconhecer campos aninhados do contrato Pluggy.
