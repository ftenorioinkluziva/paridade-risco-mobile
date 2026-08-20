# Story 5.4 — Evidências de arquitetura e segurança

## Decisão

**PASS.** A CLI deixa de possuir fluxo de login por email/senha e passa a consumir o contrato versionado de chave em `/api/auth/mcp-token`. A credencial é emitida pela sessão web, validada antes do armazenamento e usada como `Bearer` nos mesmos contratos compartilhados pelos adaptadores.

## Limites e escopos

| Consumidor/operação | Escopo |
|---|---|
| CLI — consultas | `read` |
| CLI — `sync-pluggy` | `sync` |
| MCP — classificação de investimentos | `mapping` |

O Perfil apresenta emissões separadas: chave CLI com `read` + `sync` e token MCP com `read` + `sync` + `mapping`. A configuração da CLI falha antes de persistir quando qualquer escopo mínimo está ausente.

## Proteção da credencial

- entrada apenas por `PARIDADE_API_KEY` ou `stdin`, sem argumento de processo;
- arquivo local criado com modo `0600`;
- `config show`, `auth status`, erros e telemetria não retornam o valor;
- validação responde com `Cache-Control: no-store`;
- cabeçalho de telemetria aceita apenas consumidores enumerados;
- logs legados contêm somente `event`, `consumer` e `outcome`.

## Compatibilidade controlada

`LEGACY_SESSION_AUTH_CLI_ENABLED=false` encerra o fallback apenas para CLI. `LEGACY_SESSION_AUTH_ENABLED=false` encerra o fallback compartilhado. A leitura local pode ser bloqueada com `PARIDADE_CLI_LEGACY_SESSION_ENABLED=false`. Restaurar a flag para `true` é o rollback operacional durante a janela de observação; a remoção do código depende da Story 5.5.

## Matriz de aceitação

| AC | Evidência | Resultado |
|---|---|---|
| 1 | teste-fonte impede `/api/auth/login` e `--password`; CLI usa endpoint de chave | PASS |
| 2 | Perfil emite `read` + `sync`; configuração valida ambos; arquivo `0600` | PASS |
| 3 | códigos `API_KEY_MISSING`, `INVALID`, `EXPIRED`, `REVOKED`, `INSUFFICIENT_SCOPE` | PASS |
| 4 | policy test e log estruturado allowlisted por consumidor | PASS |
| 5 | três flags e rollback documentados | PASS |
| 6 | Docker E2E em desktop/mobile cobre emissão, uso, negação, revogação, rotação e nova autenticação | PASS |
| 7 | ajuda da CLI e `docs/cli-api-key-auth.md` | PASS |

## Gates executados

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS — API 74, remote MCP 8, CLI 5, shared 22
- `npm run build:api`: PASS
- `npm run e2e:critical`: PASS — 15/15
- `npm run validate:structure`: PASS
- `npm run validate:agents`: PASS, sem erros; 121 warnings preexistentes de dependências opcionais do framework
- `npm run sync:ide:check`: PASS
- `git diff --check`: PASS

O primeiro E2E detectou que a inicialização da CLI não respeitava `PARIDADE_API_URL`; a precedência env-first foi corrigida, coberta por teste e o E2E completo passou na repetição.
