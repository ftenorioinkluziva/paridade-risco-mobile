# Story 5.2 — Evidência da infraestrutura E2E isolada

**Data:** 2026-08-20

**Branch:** `codex/epic-5-story-5-2`

**Quality gate arquitetural:** PASS

## Decisão arquitetural

O harness executa Playwright no host/runner contra uma API e um PostgreSQL exclusivos em `docker-compose.e2e.yml`. Cada execução recebe projeto Compose, porta, namespace, usuário, senha do banco e segredo Better Auth efêmeros. Scheduler, Telegram, MCP remoto e integrações externas não fazem parte do grafo E2E.

O lifecycle usa `docker compose up --wait` com healthchecks reais, cria a fixture somente depois da saúde da API, e sempre executa cleanup idempotente seguido de `down -v --remove-orphans`. Usuário, conta, cesta, alocações, portfólio e ativos criados pela fixture são identificados pelo namespace e removidos explicitamente ou por cascade.

## Matriz executada

| Gate | Resultado |
|---|---|
| Chromium desktop `1440x900` | PASS |
| Chromium mobile `390x844` | PASS |
| Smoke repetido três vezes | PASS — 6 execuções autenticadas, além do setup |
| WebKit mobile `390x844` | PASS |
| Probe de falha pública | PASS — trace, screenshot e vídeo presentes |
| Varredura de segredos efêmeros nos artefatos | PASS |
| Cleanup após sucesso e falha | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — API 72, remote MCP 8, shared 19 |
| `npm run build:api` | PASS — 52 páginas, dois workers |
| `docker compose ... config --quiet` | PASS |
| Parse de `.github/workflows/e2e-smoke.yml` | PASS |
| `npm audit --audit-level=high` | PASS — 0 high/critical; 4 moderadas do `drizzle-kit` permanecem na Story 5.7 |

## Falhas encontradas e correções

1. O build inicial abriu 11 workers na coleta de páginas, esgotou a memória disponível ao Docker Desktop e travou o daemon. O build foi limitado a duas CPUs e ativou `webpackMemoryOptimizations`; builds locais e no Compose passaram depois disso.
2. O primeiro smoke mobile procurava `Sair` antes de abrir a navegação compacta. O teste passou a validar e abrir o botão `Menu`, confirmando o contrato real do layout mobile.
3. O launcher inicial dependia do wrapper `.cmd` do Playwright e não propagava corretamente a execução no Windows. O runner passou a invocar o CLI JavaScript com o executável Node atual.
4. A fixture passou a remover explicitamente também os ativos namespaced, além das entidades removidas por cascade.

## Segurança de artefatos

- O estado autenticado é gravado somente em `.playwright/auth/` e removido no `finally`.
- Testes autenticados retêm screenshot, mas não trace/vídeo, pois esses formatos podem carregar cookies.
- A política de trace, screenshot e vídeo é exercitada em uma página pública, sem autenticação.
- O probe verifica que email, senha, segredo Better Auth e senha do banco gerados para a execução não aparecem nos artefatos preservados.
- O workflow publica somente `playwright-report/` e `test-results/`, por sete dias; o storage state nunca entra no upload.

## CI

- Pull requests e pushes em `master` executam o smoke Chromium desktop + mobile.
- WebKit mobile e a política de artefatos executam semanalmente ou por despacho manual.
- O gate rápido não depende de conta compartilhada nem de dados de produção.

## Parecer do @architect

PASS. As fronteiras de isolamento, observabilidade, cleanup, segurança de artefatos e separação entre gate rápido e verificações opcionais são coerentes com a Story 5.2. Não há achado arquitetural bloqueante.
