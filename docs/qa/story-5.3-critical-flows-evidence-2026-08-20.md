# Story 5.3 — Evidência dos fluxos críticos E2E

**Data:** 2026-08-20

**Branch:** `codex/epic-5-story-5-3`

**Quality gate arquitetural:** candidato a PASS

## Cobertura por critério

| AC | Evidência executável | Resultado |
|---|---|---|
| 1 | redirecionamento anônimo, login inválido/válido, logout, cadastro e recuperação confirmada no log | PASS |
| 2 | perfil, cesta ativa com 11 ETFs e tentativa de alteração de `role` | PASS |
| 3 | criação, leitura, alteração e exclusão de fundo e transação temporários | PASS |
| 4 | `/investimentos`, `/cotacoes` e `/api/rebalance/preview`; 11 ETFs, sem `BOVV11`, agenda de 8 minutos | PASS |
| 5 | Pluggy ausente/bloqueado e configurado/pronto contra mock local determinístico | PASS |
| 6 | chave MCP somente leitura, rejeição de `sync` e invalidação após revogação | PASS |
| 7 | cleanup em `finally`, verificação posterior de usuários/ativos namespaced e mensagens com URL/status | PASS |
| 8 | Chromium desktop `1440x900` e mobile `390x844` | PASS |

## Matriz executada

| Gate | Resultado |
|---|---|
| `npm run e2e:gate` | PASS — 17/17 |
| `npm run e2e:critical:repeat` | PASS — 43/43 |
| Verificação de recuperação no log | PASS — marcador encontrado; credenciais e segredos efêmeros ausentes |
| Cleanup após execução | PASS — zero usuários e ativos namespaced |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — API 72, remote MCP 8, shared 19 |
| `npm run build:api` | PASS — 53 páginas, dois workers |
| `docker compose ... config --quiet` | PASS |
| Parse do workflow GitHub Actions | PASS |
| `npm audit --audit-level=high` | PASS — zero high/critical; quatro moderadas do `drizzle-kit` seguem na Story 5.7 |

## Falhas de regressão encontradas e corrigidas

1. A recuperação chamava `/forget-password`, removido na versão atual do Better Auth, e retornava 404; agora usa `/request-password-reset`.
2. A tela de cotações ainda informava 12 ativos e intervalo de 10 minutos; foi alinhada a 11 ETFs e 8 minutos.
3. O recurso de transações não possuía endpoint por item para leitura, alteração e exclusão; as rotas autenticadas e limitadas ao proprietário foram adicionadas.
4. O plugin Better Auth proíbe que o cliente defina permissões de chave. A emissão MCP com escopo passou para uma rota server-side autenticada, permitindo provar leitura sem conceder `sync`.
5. Repetições de mutações de autenticação acionavam corretamente o rate limit. A mutação é exercitada uma vez e as repetições validam os contratos responsivos sem desabilitar a proteção da aplicação.

## Isolamento e segurança

- O mock Pluggy responde somente aos contratos necessários e não acessa rede externa.
- O runner captura o log de recuperação em memória e não o imprime.
- Credenciais, senha do banco e segredo Better Auth são efêmeros e verificados contra vazamento no log capturado.
- Tokens MCP são usados somente em memória, não entram em trace/vídeo e são revogados pelo teste.
- O `finally` limpa os dados, executa `verify-clean` e remove containers, rede e volume do projeto Compose.

## Parecer preliminar do @architect

PASS proposto. Os fluxos críticos estão ligados aos critérios, usam fronteiras determinísticas, respeitam o rate limit real e falham com diagnóstico de URL/status sem expor segredos. A decisão formal deve referenciar o commit candidato revisado.
