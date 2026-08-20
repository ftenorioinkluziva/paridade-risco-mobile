# Story 5.1 — Evidência da baseline candidata

**Data:** 2026-08-20
**Branch:** `codex/auditoria-p0-p2`
**Candidato inicial:** `54282e62846791a754f24ff73280e28f17d7b61c`
**Base remota:** `origin/master` em `560aafcc72332948ad99b7a4f5610af93a61f5f3`

## Relação Git

- `origin/master` é ancestral do candidato.
- O candidato contém quatro commits auditados à frente da base:
  - `88886b8` — hardening de autenticação MCP e fluxos greenfield;
  - `383d460` — gate QA da auditoria P0–P2;
  - `428fc3c` — build Docker seguro para autenticação;
  - `54282e6` — aprovação do gate de deploy Docker.
- A integração deve ocorrer por PR, sem rebase destrutivo ou reescrita de histórico.

## Correção encontrada no smoke

O primeiro login local retornou `401`. O banco continha o usuário de teste em `users`, mas nenhuma conta `credential` em `accounts`. O seed ainda gravava apenas o hash legado em `users.password_hash`, enquanto o Better Auth 1.7 consulta `accounts` com:

- `provider_id=credential`;
- `issuer=local:credential`;
- `account_id=user_id`;
- senha gerada por `better-auth/crypto`.

O seed foi corrigido para garantir esse registro de forma idempotente, com `randomUUID()` explícito porque a tabela instalada exige `id` fornecido pela aplicação. Trata-se de preparação do usuário local de teste, não de migração de usuários de produção.

## Gates executados

| Gate | Resultado |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — API 72, remote MCP 8, shared 19 |
| `docker compose build` | PASS |
| `docker compose up -d --force-recreate` | PASS |
| Seed dentro da rede Compose | PASS |
| Seed repetido sem duplicação | PASS — usuário de teste permaneceu em `1,5,3,6` para credential/baskets/funds/transactions |
| Login Better Auth | HTTP 200 |
| `/api/profile` | HTTP 200 autenticado |
| `/api/baskets/active` | HTTP 200 autenticado |
| `/api/portfolio/summary` | HTTP 200 autenticado |
| `/api/assets/prices` | HTTP 200 autenticado |
| `/api/health` | `{"ok":true,"service":"paridade-risco-api","version":1}` |

## Invariantes do runtime

- Ativos ativos no PostgreSQL: 11.
- Tickers: `B5P211,BOVA11,DOLA11,FIXA11,IB5M11,IMAB11,IRFM11,LFTS11,SMAL11,SPXI11,XFIX11`.
- `BOVV11`: 0 ativo.
- Scheduler: `*/8 10-16 * * 1-5`.
- Última atualização observada: `assets=11, successful=11, failed=0`.
- API e PostgreSQL: healthy.
- Demais cinco workers/adapters: running.
- Restart count: 0 nos sete serviços.
- Imagem API candidata local: `sha256:a14a4d53c34370bee7c06b4c957b7886a614efd7fc3e726d817021aeed1f11e3`.
- O seed executado pela imagem final não registra a senha de teste em texto claro.

## Rollback

1. O commit base `560aafcc72332948ad99b7a4f5610af93a61f5f3` foi confirmado no repositório local.
2. Antes da promoção, o `@devops` deve registrar o SHA final e a imagem anterior do ambiente alvo.
3. Se o smoke pós-merge falhar, reverter o PR por novo commit, reconstruir a imagem a partir do SHA anterior e repetir healthcheck/login/smoke.
4. Não executar `reset --hard`, force-push ou exclusão de volume PostgreSQL como rollback.

## Handoff

- Próxima autoridade: `@qa` para gate do candidato local.
- Após PASS: `@devops` para commit, push, PR, merge controlado e smoke pós-merge.
