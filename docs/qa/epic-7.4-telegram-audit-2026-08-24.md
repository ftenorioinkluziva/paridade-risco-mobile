# Story 7.4 — Auditoria de compatibilidade legada do Telegram

**Data da auditoria:** 2026-08-24  
**Escopo:** inventário e evidência operacional; nenhuma remoção ou desativação executada.

## Resultado

**Status:** evidência insuficiente para decisão de remoção (`NO-GO`).

Não foi inferido uso zero. O Compose local está saudável, mas não possui histórico operacional de 30 dias disponível. A ausência de linhas históricas não é considerada evidência de ausência de consumidores.

## Inventário verificado

| Área | Evidência | Decisão |
|---|---|---|
| CLI | `packages/cli/src/index.mjs`, `packages/shared/src/http-client.mjs` e testes de adapter | Preservar para desenvolvimento |
| MCP | `apps/remote-mcp/src/index.mjs` e testes de paridade | Preservar para usuários |
| Telegram S2S | `apps/api/src/lib/telegram-s2s-auth.ts`, `packages/telegram-bot/src/auth.mjs` | Compatibilidade atual preservada |
| Sessão Telegram legada | `apps/api/src/lib/session.ts` e endpoint `/api/auth/token-by-telegram` | Não reativar; endpoint de emissão permanece `410` |
| Telemetria | eventos `telegram_s2s_auth`, `legacy_session_auth` e `telegram_legacy_token_endpoint` | Sanitizada, sem token/chat ID bruto |

## Evidência de execução

- API Compose: saudável.
- Testes API: **82/82** aprovados.
- Testes Telegram bot: **2/2** aprovados.
- Testes shared/CLI/MCP: **22/22** aprovados.
- `npm run validate:structure`: aprovado.
- Busca de logs Compose por `auth-telemetry`, `telegram` e `x-paridade-consumer` nos últimos 30 dias: nenhum histórico utilizável foi disponibilizado pelo runtime local.

## Próxima coleta

Manter a telemetria existente e coletar uma janela contínua de 30 dias, agregada por `consumer`, rota/evento e `outcome`. Qualquer uso Telegram, consumidor não identificado, lacuna de dados ou falha de smoke mantém a remoção bloqueada.
