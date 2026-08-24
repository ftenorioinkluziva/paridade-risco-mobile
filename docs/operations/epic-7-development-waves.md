# Epic 7 — Workflow de desenvolvimento em ondas

**Workflow AIOX:** `story-development-cycle`  
**Modo:** guided  
**Início:** 2026-08-24

## Regras de execução

Cada story atravessa implementação, quality gate e evidência antes do início da onda dependente. As fases de criação e validação já foram concluídas pelo `@sm` e `@po`. Push, PR e promoção remota permanecem sob responsabilidade do `@devops`.

## Ondas

| Onda | Story | Execução | Quality gate | Condição de saída |
|---|---|---|---|---|
| 1 | 7.1 — E2E Pluggy/rebalanceamento | `@dev` | `@qa` | E2E crítico/responsivo determinístico e story `Done` |
| 2 | 7.2 — quota, scheduler e frescor | `@devops` | `@architect` | logs/métricas sanitizados, testes e story `Done` |
| 3 | 7.3 — polimento decision-first | `@ux-design-expert` | `@dev` + `@qa` final | desktop/mobile sem overflow, acessibilidade e story `Done` |
| 4 | 7.4 — auditoria Telegram | `@dev` | `@qa` | somente coleta; remoção bloqueada até 30 dias e novo GO do `@po` |
| Release | Epic 7 | `@devops` | `@qa` | regressão, PR, deploy controlado, smoke e rollback prontos |

## Estado inicial

- Onda 1: em execução; Story 7.1 já está `InProgress`.
- Ondas 2 e 3: aguardam o gate da onda anterior.
- Onda 4: coleta de telemetria ativa; não bloqueia 7.1–7.3 e não autoriza remoção.

## Comandos de gate

```text
npm run lint
npm run typecheck
npm test
npm run e2e:critical
npm run e2e:responsive
npm run validate:structure
```

Falha em qualquer gate retorna a story ao executor da onda; nenhuma promoção é feita com story em `InReview` ou bloqueada.
