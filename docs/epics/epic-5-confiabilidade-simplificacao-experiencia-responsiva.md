# EPIC-5: Confiabilidade, simplificação e experiência responsiva

**Status:** Done
**Owner:** Product / Architecture
**Created:** 2026-08-20

## Objetivo

Preparar o Paridade de Risco para o próximo ciclo de evolução com regressão automatizada dos fluxos críticos, autenticação de integrações mais segura, linguagem interna coerente com o produto atual, toolchain de banco sem vulnerabilidades moderadas conhecidas e melhor aproveitamento de tela no desktop e no mobile web.

## Contexto e baseline

- A auditoria P0/P1/P2 foi concluída na branch `codex/auditoria-p0-p2`, mas essa baseline precisa ser integrada de forma controlada à linha principal antes das demais stories.
- O produto inicia sua base de usuários do zero; migração de usuários não faz parte deste epic.
- O universo operacional permanece limitado aos 11 ETFs vigentes; `BOVV11` não deve ser reintroduzido.
- O scheduler de cotações permanece a cada 8 minutos.
- Recuperação de senha continua com entrega observável em log neste ciclo.
- “Desktop” e “mobile” significam viewports responsivos da aplicação Next.js/PWA existente; não será recriado um aplicativo Expo.
- O CRUD manual desativado não volta a ser área principal do produto.

## Resultados esperados

1. Fluxos críticos protegidos por testes E2E reproduzíveis com dados isolados.
2. CLI e Telegram deixam de depender de sessões legadas, com retirada gradual, telemetria e rollback.
3. Conceitos internos de “migração Pluggy” passam a representar “ativação de fonte”, sem quebra abrupta dos consumidores.
4. As quatro vulnerabilidades moderadas associadas ao toolchain `drizzle-kit` são eliminadas sem downgrade inseguro e sem comprometer migrações existentes.
5. Telas críticas usam melhor o espaço disponível em desktop e continuam legíveis, tocáveis e acessíveis em mobile.

## Fora de escopo

- Migração de usuários ou dados de uma instalação anterior.
- Retorno de `BOVV11` ou alteração do conjunto de 11 ETFs.
- Mudança da cadência de 8 minutos do scheduler.
- Envio real de e-mail de recuperação de senha.
- Reintrodução de aplicativo móvel nativo, execução de ordens ou home broker.
- Reformulação visual sem preservar contratos e fluxos já validados.

## Estratégia de entrega

```text
baseline auditada
  -> harness E2E isolado
  -> regressão dos fluxos críticos
  -> transição segura de autenticação CLI/Telegram
  -> vocabulário de ativação de fonte
  -> toolchain Drizzle seguro
  -> fundação responsiva
  -> telas críticas + regressão visual/a11y
```

## Stories e ondas de execução

| ID | Título | Prioridade | Status | Depende de |
|---|---|---|---|---|
| [5.1](../stories/5.1.integrar-baseline-auditada.story.md) | Integrar e fixar a baseline auditada | Critical | Done | - |
| [5.2](../stories/5.2.infraestrutura-e2e-isolada.story.md) | Infraestrutura E2E reproduzível e isolada | Critical | Ready | 5.1 |
| [5.3](../stories/5.3.cobertura-e2e-fluxos-criticos.story.md) | Cobertura E2E dos fluxos críticos | Critical | Ready | 5.2 |
| [5.4](../stories/5.4.cli-chave-api-escopo.story.md) | CLI autenticada por chave de API com escopo | High | Ready | 5.3 |
| [5.5](../stories/5.5.telegram-autenticacao-segura.story.md) | Telegram sem emissão de sessão legada | Critical | Ready | 5.3, 5.4 |
| [5.6](../stories/5.6.ativacao-fonte-pluggy-terminologia.story.md) | Renomear “migração Pluggy” para “ativação de fonte” | Medium | Ready | 5.3 |
| [5.7](../stories/5.7.drizzle-toolchain-sem-moderadas.story.md) | Remediar vulnerabilidades moderadas do toolchain Drizzle | High | Ready | 5.2 |
| [5.8](../stories/5.8.fundacao-layout-responsivo.story.md) | Fundação de layout responsivo e tokens de interface | High | Ready | 5.3 |
| [5.9](../stories/5.9.telas-criticas-responsivas.story.md) | Evoluir telas críticas com regressão visual e acessibilidade | High | Ready | 5.8 |

## Decisões de produto e arquitetura

- Playwright será o harness E2E do navegador, usando projetos para desktop Chromium (`1440x900`) e mobile Chromium (`390x844`); WebKit mobile pode rodar como gate agendado quando não couber no gate rápido.
- Testes E2E usam usuário e dados próprios, seed determinístico e limpeza idempotente. A conta compartilhada de produção não será usada pela suíte.
- A transição de autenticação é observável: primeiro mede-se uso legado, depois migram-se consumidores e só então removem-se fallbacks.
- O endpoint Telegram não pode continuar emitindo sessão de 30 dias somente a partir de `chat_id`; a identidade deve ser verificada e vinculada por contrato autenticado.
- A renomeação Pluggy deve admitir uma janela curta de compatibilidade para rotas/contratos externos, com aviso de depreciação e data de retirada.
- A correção do Drizzle deve seguir upgrade suportado, gerar migrações de teste em diretório descartável e validar as migrações já versionadas. Não será aceito o `npm audit fix --force` se ele implicar downgrade.
- O layout adotará larguras semânticas (`narrow`, `standard`, `wide`) em vez de aplicar `760px` a todas as telas.
- Alvos interativos devem ter pelo menos `44x44px`; contraste, foco, teclado e redução de movimento integram os critérios de aceite.

## Quality gates do epic

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build:api` no Docker
- suíte E2E Chromium desktop e mobile
- `npm audit` sem vulnerabilidades high/critical e sem as quatro moderadas atribuídas ao toolchain Drizzle
- smoke local no Docker Compose e verificação de logs dos schedulers
- revisão visual das rotas `/`, `/investimentos`, `/cotacoes`, `/cestas`, `/perfil`, `/pluggy` e `/saude-financeira`

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Baseline de produção divergir da `master` | Story 5.1 fixa SHA, gates, smoke e rollback antes das demais |
| E2E flakey por scheduler ou dados compartilhados | Banco/usuário isolados, relógio controlável, seed e cleanup idempotentes |
| Bloqueio de CLI/Telegram durante retirada do legado | Telemetria, janela de compatibilidade, feature flag e rollback documentado |
| Renomeação quebrar MCP, CLI ou UI | Alias temporário, testes de contrato e remoção em etapa explícita |
| Upgrade Drizzle alterar formato de migrações | Branch dedicada, backup, dry-run e validação em banco descartável |
| Redesign esconder dados ou decisões importantes | Inventário de telas, hierarquia de informação e snapshots aprovados por viewport |
| Escopo visual crescer indefinidamente | 5.8 limita fundação; 5.9 limita-se às rotas críticas listadas |

## Definition of Done

- [x] As nove stories foram concluídas na ordem compatível com suas dependências.
- [x] A suíte E2E cobre autenticação, perfil/cesta, carteira, cotações, rebalanceamento e integrações críticas.
- [x] Nenhum consumidor ativo depende de sessão legada de CLI/Telegram.
- [x] O vocabulário interno e público vigente usa “ativação de fonte”, com compatibilidade residual explicitamente inventariada ou removida.
- [x] As quatro moderadas do toolchain Drizzle não aparecem no audit e as migrações existentes continuam válidas.
- [x] As telas críticas passam nos viewports desktop e mobile definidos, sem overflow horizontal e com alvos de toque adequados.
- [x] Docker Compose, logs, scheduler de 8 minutos e conjunto de 11 ETFs permanecem validados.
- [x] Documentação, contratos e runtime descrevem a mesma solução.

## Referências

- [Playwright test projects](https://playwright.dev/docs/test-projects)
- [Drizzle ORM v1 upgrade](https://orm.drizzle.team/docs/upgrade-v1)
- `docs/roadmap/homologacao-4-telas-e2e-2026-04-10.md`
- `apps/api/src/lib/session.ts`
- `apps/api/src/app/api/auth/token-by-telegram/route.ts`
- `packages/cli/src/index.mjs`
- `packages/telegram-bot/src/bot.mjs`
- `packages/shared/src/theme/layout.ts`

## Change Log

- 2026-08-20: Epic criado por @pm para o ciclo de confiabilidade, simplificação e responsividade.
- 2026-08-20: Stories 5.1–5.9 validadas GO por @po; dependência 5.5 → 5.4 explicitada.
- 2026-08-20: Story 5.1 encerrada administrativamente; próxima elegível: 5.2. [closure-key: 5.1:commit:01af84123e53eab7fea2401b96a3aa60923bb572]
- 2026-08-24: Epic encerrado após merge `414ac1b`, E2E pós-merge `32730159966` e deploy `32730159903`.
