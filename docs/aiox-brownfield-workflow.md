# AIOX Brownfield Workflow (Projeto Existente)

Este documento define o fluxo operacional padrao para evoluir este repositorio com metodo AIOX em modo brownfield.

## Principios

- CLI First -> Observability Second -> UI Third.
- Trabalho sempre orientado por story em `docs/stories/`.
- Nao inventar requisitos fora dos artefatos do projeto.

## Ciclo padrao por story

1. Planejar escopo minimo da story e alinhar criterios de aceite.
2. Implementar em incrementos pequenos e verificaveis.
3. Executar quality gates:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
4. Atualizar a propria story:
   - checklist
   - file list
   - change log
5. Concluir story somente com gates verdes ou com risco explicitamente documentado e aprovado.

## Bootstrap AIOX e validacoes

Sempre que houver drift de agentes/skills:

- `npm run sync:ide`
- `npm run sync:skills:codex`
- `npm run validate:structure`
- `npm run validate:agents`

## Convencoes praticas

- Uma mudanca de processo por vez.
- Evitar misturar refatoracao ampla com feature de negocio na mesma story.
- Registrar bloqueios tecnicos no Change Log da story ativa.
