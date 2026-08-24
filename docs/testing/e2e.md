# E2E isolado

O E2E usa Playwright contra um Compose exclusivo com PostgreSQL efêmero, API e um mock Pluggy determinístico. Cada execução gera namespace, porta, senha do banco, segredo Better Auth e credencial de usuário próprios; nenhum valor é persistido em arquivo versionado.

## Preparação

```bash
npm run e2e:install
npx --prefix tests/e2e playwright install chromium
```

## Comandos

```bash
npm run e2e:smoke
npm run e2e:smoke:repeat
npm run e2e:critical
npm run e2e:critical:repeat
npm run e2e:gate
npm run e2e:webkit
npm run e2e:artifact-check
```

- `e2e:smoke`: Chromium desktop `1440x900` e mobile `390x844`.
- `e2e:smoke:repeat`: repete ambos os projetos três vezes para detectar flakiness.
- `e2e:critical`: autenticação, recuperação em log, perfil/cesta, leitura técnica de transações, 9 ETFs, lifecycle MCP e cenários Pluggy/rebalanceamento em desktop/mobile.
- `e2e:critical:repeat`: repete os fluxos críticos três vezes para detectar flakiness e resíduos entre execuções.
- `e2e:gate`: executa smoke e fluxos críticos no mesmo ambiente efêmero; é o comando usado em pull requests e pushes.
- `e2e:webkit`: projeto mobile opcional, usado no agendamento ou sob demanda.
- `e2e:artifact-check`: provoca uma falha apenas em página pública, exige trace, screenshot e vídeo e verifica que nenhum segredo efêmero aparece nos artefatos.

`E2E_BASE_URL` é gerada automaticamente pelo runner. Para diagnóstico direto do Playwright, ela pode apontar para outro ambiente, mas o gate oficial usa sempre `docker-compose.e2e.yml`.

## Isolamento e limpeza

- O Compose não sobe schedulers, Telegram, remote MCP ou integrações externas reais; o único serviço adicional é o mock Pluggy local.
- O banco usa `tmpfs` e um projeto Compose único por execução.
- A factory cria usuário `e2e+<namespace>@paridaderisco.invalid`, perfil, carteira ativa, alocações e portfólio.
- Os cenários Pluggy substituem apenas os dados Open Finance desse usuário isolado e cobrem compra, venda, carteira ajustada, `STALE`, `UNAVAILABLE` e mapeamento pendente.
- A recuperação força uma falha transitória no mock, confirma sucesso no fallback seguinte, atualização visual de frescor e idempotência do mesmo `eventId` de webhook.
- Setup começa por cleanup e o bloco `finally` repete cleanup, verifica a ausência de usuários/ativos namespaced e executa `docker compose down -v`, inclusive em falha.
- O estado autenticado fica em `.playwright/auth/` somente durante o processo e é removido no final.

## Política de artefatos

Testes autenticados preservam screenshot em falha, mas desativam trace e vídeo porque esses formatos podem carregar cookies. O probe público valida trace, screenshot e vídeo sem autenticação. O workflow envia artefatos por sete dias e nunca inclui `.playwright/auth/`.

## CI

O workflow `.github/workflows/e2e-smoke.yml` executa smoke e fluxos críticos em Chromium desktop/mobile nos PRs e pushes para `master`. WebKit mobile e o probe de artefatos rodam às segundas-feiras ou por `workflow_dispatch` com `run_optional=true`.

Não use a conta compartilhada de produção nesta suíte. Se o healthcheck falhar, consulte `docker compose -f docker-compose.e2e.yml -p <projeto> logs`; o runner sempre informa a falha sem imprimir credenciais.

Quando um cenário falhar, use o nome exibido pelo Playwright para identificar o estado, consulte o screenshot em `test-results/` e o relatório em `playwright-report/`. Para falhas de sincronização, confira os logs do serviço `api` e do `pluggy-mock` no projeto Compose informado pelo runner; os dados e segredos efêmeros não devem ser copiados para issues ou artefatos permanentes.
