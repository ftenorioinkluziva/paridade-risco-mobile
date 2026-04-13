# Paridade Funcional - 4 Telas do Legado

## Objetivo

Definir a paridade funcional obrigatoria entre o legado e a v2 para as telas:

1. Posicoes
2. Fundos
3. Transacoes
4. Rebalanceamento

## Fonte de verdade

- Evidencia visual enviada em 2026-04-10 com telas do legado
- Fluxo legado em producao com base de calculo consolidada (Posicoes + Fundos + Caixa)

## Regra geral de paridade

A v2 deve manter o mesmo comportamento funcional do legado para operacao diaria da carteira.
Mudancas visuais sao aceitaveis, desde que as regras de negocio e os fluxos operacionais sejam equivalentes.

## Tela 1 - Posicoes

### Comportamento observado no legado

- Cards de topo com:
  - Valor Total (portfolio + fundos + caixa)
  - Posicoes
  - Ganho/Perda
  - Caixa disponivel
- Lista detalhada por ativo com:
  - ticker e nome
  - shares
  - preco medio
  - preco atual
  - valor da posicao
  - ganho/perda absoluto e percentual

### Paridade obrigatoria na v2

- Exibir consolidado com os 4 indicadores de topo
- Exibir lista de posicoes com todas as metricas operacionais acima
- Garantir consistencia entre o total da tela e o calculo usado no rebalanceamento

## Tela 2 - Fundos

### Comportamento observado no legado

- Resumo com:
  - Total investido
  - Valor atual
  - Ganho/Perda
  - Rentabilidade
- Lista de fundos com:
  - nome
  - data de investimento
  - data de atualizacao
  - investimento inicial
  - valor atual
  - ganho/perda
  - rentabilidade
- Acoes:
  - criar novo fundo
  - editar fundo
  - excluir fundo
  - atualizar valor atual do fundo

### Paridade obrigatoria na v2

- Entregar resumo completo e lista detalhada
- Entregar CRUD operacional de fundos
- Entregar atualizacao pontual de valor para reprecificacao rapida
- Refletir impacto imediatamente no portfolio e no rebalanceamento

## Tela 3 - Transacoes

### Comportamento observado no legado

- Saldo disponivel em destaque
- Aba de nova transacao com:
  - busca de ativo
  - tipo (compra/venda)
  - quantidade
  - preco por acao
  - data opcional
- Acoes auxiliares:
  - filtros
  - periodo
  - historico
  - analise

### Paridade obrigatoria na v2

- Manter fluxo de lancamento rapido (ativo, tipo, quantidade, preco, data)
- Exibir saldo disponivel na tela de transacoes
- Entregar historico com filtros por tipo/ativo/periodo
- Entregar visao de analise por periodo (minimo: consolidado compra/venda)

## Tela 4 - Rebalanceamento

### Comportamento observado no legado

- Baseado na cesta ativa
- Opcao de incluir/excluir caixa na base de calculo
- Exibicao clara de:
  - valor investido
  - caixa disponivel
  - base de calculo
  - custo de rebalanceamento
  - saldo apos rebalance
- Lista de recomendacoes por ativo com:
  - acao (comprar/vender)
  - valor da ordem
  - percentual atual x alvo
  - progresso para o alvo

### Paridade obrigatoria na v2

- Incluir toggle de caixa na base de calculo
- Exibir indicadores de custo e saldo apos rebalance
- Exibir recomendacoes detalhadas por ativo com atual x alvo e progresso
- Manter regra de elegibilidade por perfil (phone e birthDate)

## Dependencias tecnicas

1. API de fundos com operacoes de update e delete
2. API de transacoes com filtros por periodo/tipo/ativo
3. API de rebalance com parametros para incluir caixa
4. Contratos mobile atualizados para as novas metricas

## Criterio de aceite global

Paridade aprovada quando um usuario consegue executar o mesmo fluxo operacional das 4 telas do legado sem perda de informacao critica para decisao de investimento e rebalanceamento.