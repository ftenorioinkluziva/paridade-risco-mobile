# Epic 6 — Evidências finais de E2E e deploy

**Data:** 2026-08-24  
**Escopo:** fechamento do Epic 6 e Stories 6.2/6.3

## Runs finais

| Evidência | Workflow run | Resultado |
|---|---:|---|
| E2E crítico pós-merge | `32773598591` | Aprovado |
| Deploy controlado pós-merge | `32773867035` | Aprovado |

O deploy final executou o quality gate antes da promoção, build da aplicação, migrations, health checks e smoke pós-deploy. O build usa `BETTER_AUTH_SECRET` efêmero somente no estágio de compilação; nenhum segredo de runtime foi exposto.

## Histórico de correção do gate

- PR #17 (`a21d22d`): runbook, smoke e rollback do release.
- O primeiro deploy pós-merge bloqueou corretamente no build por ausência de segredo de build.
- PR #18 (`d2e5523`): correção do segredo efêmero de build.
- Run `32773867035`: quality gate e deploy completos aprovados após a correção.

## Nota sobre Compose local

A execução local de E2E chegou à criação do PostgreSQL, mas ficou em estado `Created` sem iniciar o runtime. O container efêmero e sua rede foram removidos de forma segura, sem tocar no volume persistente. A evidência final de integração é o E2E remoto aprovado e o deploy controlado aprovado.
