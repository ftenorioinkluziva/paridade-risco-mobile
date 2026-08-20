# Terminologia de ativação da fonte Pluggy

O produto não migra usuários nem copia uma carteira manual para o Pluggy. Ele avalia a prontidão e, após aprovação explícita, ativa a fonte Pluggy para o portfólio.

## Mapa antigo para novo

| Legado | Canônico |
|---|---|
| `migration.ts` | `source-activation.ts` |
| `migration-rules.ts` | `source-activation-rules.ts` |
| `getPluggyMigrationReadiness` | `getPluggySourceActivationReadiness` |
| `buildMigrationReadiness` | `buildSourceActivationReadiness` |
| `PluggyMigrationBlockedError` | `PluggySourceActivationBlockedError` |
| `pluggy_migration_readiness` | `pluggy_source_activation_readiness` |
| `/api/integrations/pluggy/migration-readiness` | `/api/integrations/pluggy/source-activation-readiness` |
| `/api/integrations/pluggy/migration` | `/api/integrations/pluggy/source-activation` |
| `migration-readiness:pluggy` | `source-activation:pluggy` |

## Compatibilidade externa

Os dois endpoints, a ferramenta MCP e o script legados continuam funcionais até **2026-11-01**. As rotas antigas retornam `Deprecation: true`, `Sunset` e `Link` para o sucessor. O script antigo imprime um aviso em `stderr`. A retirada deve ocorrer em story própria, após busca de consumidores e evidência de uso zero.

`canActivatePluggy` é o campo canônico. `canSwitchToPluggy` permanece no payload durante a mesma janela porque consumidores existentes podem depender dele.

## Ocorrências que continuam corretas

- `apps/api/drizzle/**`, `apps/api/src/db/migrate.ts` e comandos `db:migrate`: migrations históricas de banco.
- `apps/api/src/scripts/migrate-legacy.ts` e `apps/api/docs/LEGACY_TO_V2_MIGRATION.md`: histórico de importação legado, fora do fluxo Pluggy atual.
- documentos e stories encerradas preservam o registro histórico.
- aliases listados acima são compatibilidade externa documentada.

Execute `npm run validate:pluggy-naming` para impedir a reintrodução de identificadores de migração no domínio e frontend atuais.
