# Story 5.6 — Evidências de ativação de fonte

## Decisão

**PASS.** O modelo canônico agora representa prontidão e aprovação da fonte Pluggy. Migrações de banco e o importador histórico legado→v2 foram preservados; os nomes externos anteriores são aliases temporários, não domínio ativo.

## Compatibilidade

| Superfície | Canônico | Alias até 2026-11-01 |
|---|---|---|
| Readiness HTTP | `/source-activation-readiness` | `/migration-readiness` |
| Aprovação HTTP | `/source-activation` | `/migration` |
| Ferramenta MCP | `pluggy_source_activation_readiness` | `pluggy_migration_readiness` |
| Script | `source-activation:pluggy` | `migration-readiness:pluggy` |
| Payload | `canActivatePluggy` | `canSwitchToPluggy` |

As rotas antigas retornam `Deprecation`, `Sunset` e `Link`. O E2E confirmou o mesmo status e os mesmos campos de decisão no contrato canônico e no alias.

## Inventário residual

`npm run validate:pluggy-naming` examina frontend, contexto, domínio Pluggy, scripts atuais, contratos e E2E. As ocorrências permitidas são:

- importador histórico `migrate-legacy.ts`;
- wrapper deprecado do script;
- nome, path e fixture do alias MCP;
- chamadas E2E que comprovam o alias;
- `canSwitchToPluggy` enquanto campo de compatibilidade.

Migrações Drizzle, SQL, documentação histórica e stories encerradas permanecem fora da renomeação, conforme o inventário em `docs/pluggy-source-activation-naming.md`.

## Gates

- lint: PASS
- typecheck: PASS
- testes: PASS — 124
- build API: PASS — 55 rotas/páginas, incluindo quatro endpoints canônico+alias
- naming validation: PASS
- Docker E2E: PASS — 15/15 em desktop/mobile
- diff check: PASS
