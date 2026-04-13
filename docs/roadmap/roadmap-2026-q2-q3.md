# Roadmap 2026 Q2-Q3 - Paridade Risco Mobile

## Contexto

Este roadmap parte do baseline atual:

- Bootstrap AIOX concluido
- Migracao de dados legado para v2 concluida
- Fluxo API + Mobile validado em ambiente local

## Norte

- Consolidar a v2 como produto estavel para uso real
- Reduzir risco operacional (dados, regressao, deploy)
- Acelerar entrega de valor com backlog funcional previsivel

## Horizonte 30/60/90 dias

## Backlog inicial criado

- docs/stories/1.1.hardening-auth-sessao.story.md
- docs/stories/1.2.paridade-portfolio-cestas-transacoes.story.md
- docs/stories/1.3.estados-vazios-e-tratamento-de-erros.story.md
- docs/stories/1.4.fundos-investimento-paridade-rebalance.story.md
- docs/stories/1.5.campos-perfil-legado-elegibilidade-rebalance.story.md
- docs/stories/1.6.paridade-posicoes-legado.story.md
- docs/stories/1.7.paridade-fundos-legado-crud.story.md
- docs/stories/1.8.paridade-transacoes-legado.story.md
- docs/stories/1.9.paridade-rebalanceamento-legado.story.md
- docs/roadmap/legacy-v2-gap-analysis.md
- docs/roadmap/legacy-paridade-4-telas.md

## Foco imediato aprovado

- Cobrir Fundos de investimento
- Cobrir Campos de perfil legado (phone, role, dataNascimento, image)

Motivo: impacto direto/indireto no calculo e na recomendacao de rebalanceamento.

## 0-30 dias (Estabilizacao)

### Objetivo
Garantir confiabilidade minima de operacao e paridade funcional pos-migracao.

### Entregas

1. Hardening de fluxos criticos:
- Login/logout
- Portfolio summary
- Cestas ativas
- Transacoes
- Rebalance preview

2. Ajustes de UX e erros de integracao:
- Normalizar tratamento de erros de API no mobile
- Melhorar mensagens para estados vazios (sem cesta, sem transacao)

3. Higiene de qualidade:
- Garantir gates obrigatorios em toda story
- Criar smoke checklist de validacao manual por release

### Stories sugeridas

- 1.1: Hardening de autenticacao e sessao
- 1.2: Paridade de portfolio/cestas/transacoes
- 1.3: Tratamento de estados vazios e erros no mobile
- 1.4: Fundos de investimento para patrimonio consolidado
- 1.5: Campos de perfil legado para regras de elegibilidade de rebalance

### Exit criteria

- Fluxos criticos sem bloqueio em homologacao
- Zero erro bloqueante em demo end-to-end

## 31-60 dias (Qualidade e Confiabilidade)

### Objetivo
Elevar previsibilidade de mudancas com testes e observabilidade.

### Entregas

1. Testes automatizados base:
- Testes de rotas API criticas
- Testes de dominio (portfolio/rebalance)
- Testes de regressao de autenticacao

2. Instrumentacao inicial:
- Logging estruturado em erros de API
- Correlation id por request
- Painel simples de saude operacional

3. Dados e migracoes:
- Job idempotente para reconcilio legado->v2
- Script de verificacao de integridade referencial

### Stories sugeridas

- 2.1: Suite minima de testes API
- 2.2: Logs estruturados + correlation id
- 2.3: Verificador de integridade de dados

### Exit criteria

- Cobertura minima dos fluxos criticos definida e atingida
- Diagnostico de erro reduzido para minutos (nao horas)

## 61-90 dias (Escala de Produto)

### Objetivo
Comecar ciclo de evolucao de produto com base estavel.

### Entregas

1. Funcionalidades orientadas a valor:
- Evolucao de rebalance com recomendacoes acionaveis
- Melhorias de produtividade no cadastro de transacoes
- Insights de alocacao e desvio por periodo

2. Preparacao de release:
- Pipeline de release repetivel
- Checklist de rollback
- Runbook operacional

3. Governanca de backlog:
- Priorizacao quinzenal por impacto
- SLA de correcoes criticas

### Stories sugeridas

- 3.1: Rebalance com recomendacao acionavel
- 3.2: Fluxo rapido para nova transacao
- 3.3: Runbook de release e rollback

### Exit criteria

- Primeiro pacote de features de valor entregue com baixo retrabalho
- Processo de release padronizado e testado

## Dependencias criticas

1. Estabilidade do banco v2 (pooler e credenciais)
2. Definicao de ambiente de homologacao consistente
3. Disciplina de execucao por story (AIOX gates)

## Riscos

1. Regressao funcional sem cobertura de teste minima
2. Acumulo de mudancas sem criterio de release
3. Divergencia entre comportamento legado e v2 em casos de borda

## KPIs sugeridos

1. Lead time de story (Todo -> Done)
2. Taxa de retrabalho apos QA/review
3. Taxa de sucesso de validacao end-to-end
4. Erros criticos por semana em homologacao

## Cadencia recomendada

- Planejamento quinzenal de backlog
- Revisao semanal de progresso do roadmap
- Replanejamento mensal com base em risco/valor
