# E2E isolado

O smoke E2E usa Playwright contra um Compose exclusivo com PostgreSQL efêmero e somente a API. Cada execução gera namespace, porta, senha do banco, segredo Better Auth e credencial de usuário próprios; nenhum valor é persistido em arquivo versionado.

## Preparação

```bash
npm run e2e:install
npx --prefix tests/e2e playwright install chromium
```

## Comandos

```bash
npm run e2e:smoke
npm run e2e:smoke:repeat
npm run e2e:webkit
npm run e2e:artifact-check
```

- `e2e:smoke`: Chromium desktop `1440x900` e mobile `390x844`.
- `e2e:smoke:repeat`: repete ambos os projetos três vezes para detectar flakiness.
- `e2e:webkit`: projeto mobile opcional, usado no agendamento ou sob demanda.
- `e2e:artifact-check`: provoca uma falha apenas em página pública, exige trace, screenshot e vídeo e verifica que nenhum segredo efêmero aparece nos artefatos.

`E2E_BASE_URL` é gerada automaticamente pelo runner. Para diagnóstico direto do Playwright, ela pode apontar para outro ambiente, mas o gate oficial usa sempre `docker-compose.e2e.yml`.

## Isolamento e limpeza

- O Compose não sobe schedulers, Telegram, remote MCP ou integrações externas.
- O banco usa `tmpfs` e um projeto Compose único por execução.
- A factory cria usuário `e2e+<namespace>@paridaderisco.invalid`, perfil, carteira ativa, alocações e portfólio.
- Setup começa por cleanup e o bloco `finally` repete cleanup e `docker compose down -v`, inclusive em falha.
- O estado autenticado fica em `.playwright/auth/` somente durante o processo e é removido no final.

## Política de artefatos

Testes autenticados preservam screenshot em falha, mas desativam trace e vídeo porque esses formatos podem carregar cookies. O probe público valida trace, screenshot e vídeo sem autenticação. O workflow envia artefatos por sete dias e nunca inclui `.playwright/auth/`.

## CI

O workflow `.github/workflows/e2e-smoke.yml` executa Chromium desktop e mobile em PRs e pushes para `master`. WebKit mobile e o probe de artefatos rodam às segundas-feiras ou por `workflow_dispatch` com `run_optional=true`.

Não use a conta compartilhada de produção nesta suíte. Se o healthcheck falhar, consulte `docker compose -f docker-compose.e2e.yml -p <projeto> logs`; o runner sempre informa a falha sem imprimir credenciais.
