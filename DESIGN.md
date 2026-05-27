---
name: Paridade Risco
description: Mobile decision panel for individual portfolio rebalancing.
colors:
  operational-graphite: "#16171B"
  panel-slate: "#1E2026"
  raised-slate: "#242730"
  inset-graphite: "#181A1F"
  border-ash: "#2A2B30"
  text-clear: "#FFFFFF"
  text-muted: "#A1A1AA"
  text-soft: "#71717A"
  action-green: "#22C55E"
  action-green-strong: "#16A34A"
  warning-amber: "#F59E0B"
  danger-red: "#EF4444"
  info-cyan: "#22D3EE"
  command-ink: "#0F1115"
  buy-blue: "#60A5FA"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0"
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.44
    letterSpacing: "0"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.43
    letterSpacing: "0"
  label:
    fontFamily: "monospace"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0"
  data:
    fontFamily: "monospace"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0"
rounded:
  field: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
spacing:
  xxs: "4px"
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  xxxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action-green}"
    textColor: "{colors.command-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
    height: "40px"
  button-neutral:
    backgroundColor: "{colors.raised-slate}"
    textColor: "{colors.text-clear}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
    height: "40px"
  card-summary:
    backgroundColor: "{colors.panel-slate}"
    textColor: "{colors.text-clear}"
    rounded: "{rounded.md}"
    padding: "16px"
  field-input:
    backgroundColor: "{colors.inset-graphite}"
    textColor: "{colors.text-clear}"
    rounded: "{rounded.field}"
    padding: "0 14px"
    height: "48px"
  tab-bar:
    backgroundColor: "{colors.panel-slate}"
    textColor: "{colors.text-muted}"
    height: "60px"
---

# Design System: Paridade Risco

## 1. Overview

**Creative North Star: "Painel de Decisao"**

Paridade Risco e uma ferramenta de decisao financeira em tela pequena. A interface deve se comportar como um painel operacional silencioso: poucas escolhas, numeros confiaveis, acao evidente. O usuario nao esta explorando um produto; esta decidindo se precisa rebalancear a carteira e quais compras ou vendas executar.

O sistema visual usa fundo grafite, superficies discretas e tipografia direta para manter foco nas metricas. Verde e reservado para acao primaria, estados positivos e sinais de rebalanceamento. A linguagem mono aparece em labels, tickers e valores para reforcar precisao sem transformar a experiencia em terminal pesado.

O design rejeita app de corretora cheio de marketing, dashboard Bloomberg ou terminal financeiro pesado, fintech colorida demais, planilha crua e aplicativo gamificado.

**Key Characteristics:**

- Decisao de rebalanceamento acima de exploracao.
- Densidade controlada, com apenas as metricas necessarias para agir.
- Superficies planas, separadas por bordas e contraste tonal.
- Verde usado com parcimonia para decisao, selecao e resultado positivo.
- Linguagem visual consistente entre resumo, transacoes, fundos, cestas e perfil.

## 2. Colors

A paleta e grafite operacional com uma unica voz de acao em verde; cores auxiliares existem apenas para estado, nunca para decoracao.

### Primary

- **Verde de Acao**: acao primaria, selecao ativa, barras de progresso e resultado positivo.
- **Verde de Confirmacao**: borda ou reforco do verde principal quando a acao precisa parecer mais firme.

### Secondary

- **Amber de Atencao**: venda, alerta, campo invalido e valores que exigem cuidado.
- **Vermelho de Risco**: acoes destrutivas e erros graves.
- **Azul de Compra**: badge de compra quando e preciso diferenciar compra de venda sem competir com o verde principal.
- **Ciano Informativo**: uso pontual para informacao secundaria; nao deve substituir o verde de decisao.

### Neutral

- **Grafite Operacional**: fundo da aplicacao, sempre atras de superficies.
- **Slate de Painel**: cards, secoes e barra de navegacao.
- **Slate Elevado**: botoes neutros, trilhas de progresso e superficies secundarias.
- **Grafite Interno**: cards de posicao, inputs e seletores dentro de secoes.
- **Borda Cinza-Ash**: separacao estrutural entre superficies.
- **Texto Claro**: leitura primaria.
- **Texto Muted**: descricoes e apoio.
- **Texto Soft**: labels, metadados e marcadores mono.
- **Ink de Comando**: texto sobre botoes verdes.

### Named Rules

**The Green Means Decision Rule.** Verde e proibido como decoracao; ele marca acao primaria, selecao, progresso de rebalanceamento ou resultado positivo.

**The State Color Rule.** Ganho, perda, compra e venda nunca dependem apenas de cor. Use texto, label ou estrutura junto da cor.

## 3. Typography

**Display Font:** system-ui stack  
**Body Font:** system-ui stack  
**Label/Mono Font:** monospace

**Character:** A tipografia e nativa, compacta e funcional. O sistema usa sans para leitura e mono para informacao operacional: tickers, valores, labels de secao e estados de compra ou venda.

### Hierarchy

- **Display** (700, 30px, 1.15): titulo principal de tela, usado uma vez por tela.
- **Headline** (600, 20px, 1.3): valores importantes, cards hero e totais de resumo.
- **Title** (600, 18px, 1.44): titulos de secoes e metricas secundarias.
- **Body** (500, 14px, 1.43): subtitulos, explicacoes curtas e texto de apoio.
- **Label** (600, 12px, 0 letter-spacing): labels compactos, campos, abas e botoes.
- **Data** (600, 16px, 1.5): tickers, valores monetarios e numeros que devem ser escaneados rapidamente.

### Named Rules

**The Mono Is Evidence Rule.** Use mono quando o texto representa dado operacional, identificador ou comando. Nao use mono para paragrafos longos.

**The One Screen Title Rule.** Cada tela tem um titulo claro, um subtitulo curto e depois entra no fluxo de decisao. Nao adicione texto introdutorio redundante.

## 4. Elevation

O sistema nao usa sombras como linguagem principal. Profundidade vem de camadas tonais, bordas de 1px, raio contido e espacamento. Superficies planas sao intencionais: a carteira deve parecer controlada, nao decorada.

### Named Rules

**The Flat Ledger Rule.** Cards e secoes ficam planos por padrao. Se uma superficie precisa de destaque, use hierarquia, borda, contraste tonal ou posicao, nao sombra pesada.

**The Border Is Structure Rule.** Bordas existem para organizar leitura e toque. Bordas coloridas so aparecem quando carregam estado real.

## 5. Components

### Buttons

- **Shape:** cantos contidos e familiares (8px).
- **Primary:** Verde de Acao sobre Ink de Comando, altura minima de toque (40px), label mono pequeno.
- **Neutral:** Slate Elevado com texto claro para voltar, cancelar ou navegar sem competir com a acao principal.
- **Danger:** Vermelho de Risco apenas para acoes destrutivas.
- **Pressed:** opacidade menor e escala 0.99; feedback rapido sem animacao ornamental.
- **Disabled:** cinza soft, com texto ainda legivel.

### Chips

- **Style:** badges pequenos de compra e venda, raio de 4px, fundo transluscente e borda de estado.
- **Buy:** azul discreto para diferenciar compra sem tomar o papel do verde.
- **Sell:** amber para indicar venda ou retirada.
- **Rule:** badges nomeiam a acao; cor so reforca.

### Cards / Containers

- **Corner Style:** secoes e cards principais usam 8px; campos e opcoes compactas usam 4px.
- **Background:** Slate de Painel para secoes, Grafite Interno para itens dentro da secao.
- **Shadow Strategy:** sem sombra; profundidade por borda e tom.
- **Border:** 1px em Borda Cinza-Ash por padrao.
- **Internal Padding:** 16px em secoes principais, 12px em itens repetidos, 8px ou menos apenas para controles compactos.

### Inputs / Fields

- **Style:** fundo Grafite Interno, borda de 1px, raio de 4px, altura de 48px.
- **Labels:** mono, 12px ou 11px, texto soft.
- **Focus:** deve reforcar a borda com Verde de Acao quando implementado.
- **Error:** amber com texto explicito abaixo do campo. Nunca use apenas borda colorida.

### Navigation

- **Style:** tab bar inferior em Slate de Painel, borda superior discreta e icones lucide com stroke fino.
- **Active:** Verde de Acao.
- **Inactive:** Texto Muted.
- **Behavior:** labels podem ficar ocultos se os icones forem claros; nao adicionar microcopy decorativa na navegacao.

### Summary Cards

Resumo de carteira e a superficie de decisao primaria. O card deve expor label operacional, valor e uma unica frase de contexto. Nao transforme cards de resumo em blocos promocionais ou paineis de estatisticas concorrentes.

### Rebalance Actions

A recomendacao de rebalanceamento deve mostrar acao, valor, quantidade aproximada e relacao atual versus alvo. A ordem visual e sempre: ativo, comprar/vender, valor, contexto minimo.

## 6. Do's and Don'ts

### Do:

- **Do** manter o rebalanceamento como eixo visual: primeiro diga se precisa agir, depois mostre o que comprar ou vender.
- **Do** usar Verde de Acao apenas para decisao, selecao, progresso ou resultado positivo.
- **Do** mostrar compra/venda com label textual alem da cor.
- **Do** usar cards planos com borda de 1px e fundo tonal para organizar metricas.
- **Do** preservar altura minima de toque de 40px e preferir 48px em inputs.
- **Do** manter subtitulos curtos; cada palavra deve ajudar o usuario a decidir.

### Don't:

- **Don't** criar app de corretora cheio de marketing, banners, campanhas e ofertas.
- **Don't** criar dashboard Bloomberg ou terminal financeiro pesado, saturado de dados e paineis.
- **Don't** criar fintech colorida demais, com excesso de ilustracoes, celebracoes ou linguagem emocional.
- **Don't** criar planilha crua, tecnica demais ou dependente de interpretacao manual.
- **Don't** criar aplicativo gamificado, com estimulos visuais que desviem da decisao financeira.
- **Don't** usar verde em elementos decorativos ou informativos sem relacao com decisao.
- **Don't** usar side-stripe border, gradient text, glassmorphism decorativo ou grids repetidos de cards identicos.
- **Don't** adicionar opcoes concorrentes quando a tela pode responder diretamente se ha rebalanceamento necessario.
