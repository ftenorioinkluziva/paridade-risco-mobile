# Validação PO — Epic 5 e stories 5.1–5.9

**Data:** 2026-08-20
**Validador:** @po (Pax)
**Projeto:** Brownfield com UI responsiva
**Decisão:** APPROVED / GO para planejamento de implementação

## Resumo executivo

- Readiness geral: 90%.
- Stories em GO: 9 de 9.
- Bloqueios críticos restantes: 0.
- Ajuste aplicado durante a validação: Story 5.5 passou a depender explicitamente da Story 5.4 antes de retirar o fallback compartilhado de sessão.
- CodeRabbit: desabilitado no `core-config.yaml`; revisão manual permanece obrigatória.
- Esta aprovação torna as stories implementáveis, mas não inicia implementação, branch, commit, push ou deploy.

## Resultado por story

| Story | Score | Veredito | Evidência principal |
|---|---:|---|---|
| 5.1 | 9/10 | GO | Baseline, invariantes, gates e rollback explícitos |
| 5.2 | 9/10 | GO | Ambiente isolado, lifecycle, dados e artefatos definidos |
| 5.3 | 9/10 | GO | Fluxos críticos e casos negativos mapeados a testes |
| 5.4 | 9/10 | GO | Escopos, revogação, telemetria e rollout seguro |
| 5.5 | 9/10 | GO após ajuste | Dependência 5.4 e ameaça de `chat_id` tratadas |
| 5.6 | 9/10 | GO | Inventário impede confusão com migrações de banco |
| 5.7 | 9/10 | GO | Upgrade suportado, dry-run, audit e rollback |
| 5.8 | 9/10 | GO | Tokens, viewports, estados e acessibilidade verificáveis |
| 5.9 | 9/10 | GO | Rotas e invariantes delimitados com regressão visual/E2E |

## Checklist consolidado

| Categoria | Status | Observação |
|---|---|---|
| Objetivo e valor | PASS | Cada story entrega um incremento observável do Epic 5 |
| Dependências e sequência | PASS | Critical path 5.1 → 5.2 → 5.3; 5.5 depende também de 5.4 |
| Executor assignment | PASS | Executor e quality gate são conhecidos, distintos e possuem ferramentas |
| Critérios de aceite | PASS | Numerados, mensuráveis e cobertos pelas tarefas |
| Contexto brownfield | PASS | Arquivos e contratos existentes foram referenciados |
| Segurança | PASS | Segredos, escopos, replay, revogação, logs e rollback tratados |
| Testabilidade | PASS | Unit/contract/E2E/Docker/visual/a11y conforme o tipo |
| UI responsiva | PASS | Viewports, hit area, overflow, foco e hierarquia definidos |
| CodeRabbit | N/A | Integração desabilitada; skip notice presente em todas as stories |
| Escopo | PASS | Migração de usuário, BOVV11, app nativo e e-mail real permanecem fora |

## Riscos que devem permanecer nos gates de execução

1. Não iniciar stories dependentes antes de integrar e fixar a baseline 5.1.
2. Não remover fallback legado antes de telemetria demonstrar uso zero por CLI e Telegram.
3. Não aplicar `npm audit fix --force` como substituto do upgrade Drizzle validado.
4. Não aprovar snapshots visuais sem conferir estados extremos e conteúdo financeiro longo.
5. Não usar credenciais ou usuário compartilhado de produção na suíte E2E.

## Ordem recomendada

1. 5.1.
2. 5.2.
3. 5.3.
4. Em paralelo controlado após 5.3: 5.4, 5.6 e 5.8; 5.7 pode começar após 5.2.
5. 5.5 após 5.4.
6. 5.9 após 5.8.

## Final Assessment

**GO.** As stories estão suficientemente completas e autocontidas para handoff. A implementação deve começar somente após autorização explícita do usuário e deve respeitar a ordem e os gates acima.
