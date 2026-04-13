# Notes - Baseline para Roadmap

## Estado confirmado

- Story 0.2 (bootstrap AIOX brownfield) concluida
- Fluxo operacional documentado em docs/aiox-brownfield-workflow.md
- Migracao legado -> v2 concluida (historical prices 26653/26653)
- Base v2 com usuarios, ativos e transacoes carregados
- Mobile e API rodando localmente com autenticacao funcional

## Gaps observados

- Ainda sem roadmap de produto formal no repositorio
- Testes automatizados ainda pouco representativos para regressao funcional
- Warnings de runtime web nao bloqueantes, mas pendentes de hardening

## Gaps funcionais legado x v2 (confirmados)

- Gestao de fundos de investimento (`funds`) presente no legado e ausente na v2
- Simulacao de aposentadoria (`retirement`) presente no legado e ausente na v2
- Chat com IA (`chat`) presente no legado e ausente na v2
- Base de conhecimento/RAG (`knowledge`, `Resource`, `Embedding`) ausente na v2
- Notificacoes de insight/oportunidade (`Notification`) ausente na v2
- Campos de perfil do legado nao modelados na v2 (`phone`, `role`, `dataNascimento`, `image`)

## Prioridades sugeridas

1. Estabilizacao pos-migracao e paridade funcional
2. Cobertura de testes e qualidade de release
3. Observabilidade e operacao de ambiente
4. Features de produto orientadas a valor para usuario

## Atualizacao 2026-04-10 (homologacao + auditoria)

- Homologacao E2E das 4 telas executada com evidencias em `docs/roadmap/homologacao-4-telas-e2e-2026-04-10.md`
- Auditoria legado->v2 executada com evidencias em `docs/roadmap/legacy-import-audit-2026-04-10.md`
- Lacuna critica identificada e corrigida: `Ativo.calculationType` agora existe na v2 como `assets.calculation_type`
- Migracao incremental reexecutada e paridade de calculation type validada (PRECO=9, PERCENTUAL=4)
