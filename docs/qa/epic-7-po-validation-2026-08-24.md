# Epic 7 — Validação formal do Product Owner

**Data:** 2026-08-24  
**Agente:** @po (Pax)  
**Decisão do Epic:** **NO-GO para execução imediata; GO condicional de backlog**  
**Escopo:** Stories 7.1–7.4

## Fundamentação

O Epic 7 está coerente com a direção de produto e pode permanecer no backlog priorizado. O Epic 6 foi encerrado como `Done` antes desta consolidação; portanto, 7.1–7.3 podem avançar respeitando seus gates, enquanto 7.4 continua bloqueada por evidência de uso.

Além disso, a Story 7.4 só pode remover compatibilidade CLI/Telegram após evidência objetiva de uso zero. A condição foi formalizada nesta validação, mas a evidência ainda não está disponível.

## Decisões ratificadas

- O universo dos 9 ETFs, scheduler de 7 minutos, Pluggy e rebalanceamento do Epic 6 não serão alterados pelo Epic 7.
- Logs e métricas devem ser sanitizados e não podem conter credenciais, tokens, cookies ou payloads sensíveis.
- O período de uso zero da Story 7.4 é de 30 dias consecutivos imediatamente anteriores à decisão de remoção.
- A fonte de evidência é telemetria agregada por `consumer`, rota/evento e `outcome`, complementada por logs operacionais sanitizados de API/CLI/Telegram.
- Dado ausente, chamada legada detectada, consumidor não identificado, smoke falho ou rollback não validado significa NO-GO e adiamento.

## Matriz de validação

| Story | Escopo / ACs | Dependências e riscos | Veredicto |
|---|---|---|---|
| 7.1 | E2E determinístico de Pluggy, rebalanceamento, recuperação, stale/unavailable e desktop/mobile | Depende do Epic 6 e de fixtures sem provedor real | **GO condicional** |
| 7.2 | Quota, scheduler, frescor, webhook/fallback, sanitização e 20 conexões | Depende das implementações 6.1, 6.2 e runbook 6.5; não deve criar chamadas extras | **GO condicional** |
| 7.3 | Hierarquia decision-first, densidade, estados acessíveis e responsividade | Depende das bases visuais 5.8/5.9 e do cálculo Pluggy 6.3 | **GO condicional** |
| 7.4 | Remoção controlada de compatibilidade CLI/Telegram | Exige uso zero comprovado por 30 dias, smoke e rollback; não remover por ausência de logs | **NO-GO atual** |

## Ajustes documentais realizados

1. Epic 7 passou a indicar `Ready for Development (conditional)`.
2. Stories 7.1–7.3 passaram a `Ready for Development (after Epic 6)`.
3. Story 7.4 passou a `Blocked — usage evidence required`.
4. A janela, fonte de telemetria e condições de bloqueio foram explicitadas na Story 7.4.
5. O PO Validation foi preenchido no Epic e em cada story.

## Próximos gates obrigatórios

- Fechar e aceitar o Epic 6.
- Executar 7.1–7.3 com os gates definidos e evidências determinísticas.
- Para 7.4, coletar a janela completa de 30 dias, anexar relatório sanitizado, executar smoke de não regressão e validar rollback antes de qualquer remoção.

Nenhum código foi implementado, nenhum commit/push foi feito e nenhum endpoint ou contrato foi alterado.
