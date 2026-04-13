# Gap Analysis - Legado x V2

## Objetivo
Mapear funcionalidades existentes no legado que ainda nao estao cobertas na v2.

## Fontes analisadas

- Legado: C:/projetos/paridadeRisco/t3-paridaderisco/prisma/schema.prisma
- Legado: C:/projetos/paridadeRisco/t3-paridaderisco/src/app/(dashboard)
- Legado: C:/projetos/paridadeRisco/t3-paridaderisco/src/app/api
- V2: apps/api/src/db/schema.ts
- V2: apps/api/src/app/api
- V2: apps/mobile/src/screens

## Cobertura atual da v2 (ok)

- Autenticacao basica (login, sessao)
- Portfolio summary
- Cestas e alocacoes
- Transacoes
- Rebalance preview
- Perfil basico do usuario

## Funcionalidades do legado nao cobertas na v2

## Escopo aprovado para cobertura imediata

- Fundos de investimento
- Campos de perfil legado (phone, role, dataNascimento, image)

Ambos foram priorizados por impacto direto/indireto no calculo e na recomendacao de rebalanceamento.

## 1) Fundos de investimento

- Evidencia legado:
  - modelo FundoInvestimento no Prisma
  - area de dashboard em src/app/(dashboard)/funds
- Status v2: nao implementado em schema, API e telas
- Impacto no rebalanceamento: alto. Sem fundos, o patrimonio consolidado fica incompleto e distorce desvio/alocacao alvo.

## 2) Campos de perfil nao migrados

- Evidencia legado:
  - campos do User: phone, role, dataNascimento, image
- Status v2: schema simplificado (name, email, passwordHash, selectedBasketId)
- Impacto no rebalanceamento: medio/alto. Perfil incompleto limita regras de suitability, segmentacao e calibragem de recomendacoes.

## Itens fora do escopo imediato

- Simulacao de aposentadoria
- Chat com IA
- Knowledge base e embeddings (RAG)
- Notificacoes e insights

## Diferencas de superficie de API

- Legado expunha APIs de analyze/chat/knowledge alem do core financeiro
- V2 atualmente expoe apenas API core financeiro

## Recomendacao de priorizacao

1. Fundos de investimento
2. Campos de perfil legado
3. Simulacao de aposentadoria
4. Notificacoes
5. Chat com IA
6. Knowledge base/RAG

## Decisao para backlog

- Tratar os itens acima como Epic de Paridade Funcional E1
- Cobertura imediata: Fundos e Perfil legado
- Fatiar em stories independentes com foco inicial no impacto de rebalanceamento
