# EPIC-2: Hardening da arquitetura multi-interface

**Status:** Done  
**Owner:** Product / Architecture  
**Created:** 2026-07-10

## Objective

Garantir que API, CLI, MCP local e MCP remoto usem contratos canônicos, autenticação segura, respostas validadas, erros acionáveis e writes idempotentes, eliminando as divergências identificadas na auditoria arquitetural.

## Existing System Context

- A API concentra persistência e orquestração; CLI e MCP atuam majoritariamente como adaptadores HTTP.
- A regra de rebalanceamento já é compartilhada em `packages/shared/src/operations/rebalance.ts`.
- Contratos de tools, validação de respostas, autenticação e tradução de erros estão distribuídos entre `packages/shared`, `packages/cli`, `packages/local-mcp`, `apps/remote-mcp` e `apps/api`.

## Scope

### In Scope

- Fonte canônica para catálogo de operações, schemas de entrada/saída e erros estáveis.
- Validação em runtime das respostas da API e dos provedores financeiros externos.
- Bearer token no MCP remoto e remoção de `x-user-id` como fonte de identidade.
- Paridade funcional e contratual entre CLI, MCP local e MCP remoto.
- Idempotência para criação de transações, fundos e cestas.
- Documentação executável e smoke tests das interfaces públicas.

### Out of Scope

- Mudanças na fórmula de rebalanceamento.
- Novas funcionalidades de produto ou UI.
- Substituição dos provedores financeiros atuais.
- RBAC completo além do hardening explicitamente auditado.

## Stories

| ID | Title | Priority | Status | Depends on |
|---|---|---|---|---|
| [2.1](../stories/2.1.contratos-erros-canonicos.story.md) | Contratos e erros canônicos | Critical | Done | - |
| [2.2](../stories/2.2.validacao-respostas-externas.story.md) | Validação de respostas externas | Critical | Done | 2.1 |
| [2.3](../stories/2.3.hardening-auth-mcp-api.story.md) | Hardening de autenticação MCP/API | Critical | Done | 2.1 |
| [2.4](../stories/2.4.paridade-cli-mcp.story.md) | Paridade CLI/MCP | High | Done | 2.1, 2.2, 2.3 |
| [2.5](../stories/2.5.idempotencia-writes.story.md) | Idempotência de writes | Critical | Done | 2.1 |
| [2.6](../stories/2.6.documentacao-smoke-tests.story.md) | Documentação e smoke tests | High | Done | 2.2, 2.3, 2.4, 2.5 |

## Execution Waves

1. Onda 1: Story 2.1.
2. Onda 2: Stories 2.2, 2.3 e 2.5.
3. Onda 3: Story 2.4.
4. Onda 4: Story 2.6 e gate integrado do épico.

## Success Criteria

- [x] Uma mesma definição executável governa inputs, outputs e erros das operações expostas.
- [x] Nenhuma credencial aparece em URL, schema público ou logs de requisição.
- [x] Dados externos inválidos são rejeitados na fronteira com erro codificado.
- [x] Repetir um write com a mesma chave não duplica estado.
- [x] CLI e MCPs apresentam as mesmas operações e semântica documentadas.
- [x] `npm run lint`, `npm run typecheck`, `npm test` e build da API passam.

## Compatibility and Migration

- O endpoint MCP autenticado por Bearer foi disponibilizado em `POST /mcp`.
- A rota legada com credencial no path foi removida; rollback deve preservar Bearer e nunca reintroduzir segredo no path.
- Mudanças de envelope foram centralizadas nos adaptadores e validadas por testes de paridade.
- A idempotência foi adicionada sem alterar o resultado funcional de uma primeira requisição válida.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Quebra de clientes durante migração de auth/erros | High | Compatibilidade temporária, testes de contrato e smoke por interface |
| Duplicação já existente não reconciliada | High | Aplicar garantia a novas requisições e documentar limite histórico |
| Divergência futura entre adaptadores | High | Derivar definições do catálogo canônico e testar paridade |
| Rejeição indevida de payload do provedor | Medium | Fixtures reais sanitizadas e erro observável sem aceitar dado desconhecido |

## Definition of Done

- [x] Todas as stories estão Done e com File List atualizada.
- [x] Gates constitucionais e testes integrados estão verdes.
- [x] Migração e rollback estão documentados.
- [x] Skill, README e exemplos correspondem às operações registradas.
- [x] Logs verificados sem credenciais.

## Change Log

- 2026-07-10: Épico criado a partir dos achados da auditoria de arquitetura multi-interface.
- 2026-07-10: PO gate concluído; épico e stories 2.1–2.6 aprovados para desenvolvimento na ordem das ondas.
- 2026-07-10: Stories 2.1–2.6 concluídas; gates constitucionais, smoke de paridade e integração de idempotência passaram.
