# Fundação responsiva

## Larguras semânticas

- `narrow` (760px): autenticação, formulários e leitura focada.
- `standard` (1040px): resumo, perfil e fluxos operacionais comuns.
- `wide` (1280px): investimentos, cotações e superfícies com tabelas ou alta densidade.

O componente `Screen` aplica a largura explicitamente por tipo de tela. O shell usa `width: 100%` e gutters responsivos, sem largura fixa por página.

## Breakpoints e densidade

- Até 680px: uma coluna, gutter de 12px, ações do cabeçalho ocupam a largura e tabelas têm região rolável própria.
- 681–1023px: duas colunas quando houver espaço e gutter de 16px.
- A partir de 1024px: grids podem usar até quatro colunas e a largura semântica escolhida controla a densidade.

## Primitivas

- `ResponsiveGrid`: grids de 2, 3 ou 4 colunas que colapsam sem overflow.
- `ContentState`: estados vazio, loading, erro e normal com semântica acessível.
- `ResponsiveTable`: região nomeada, focável e com rolagem local em telas estreitas.
- `.responsive-card`: card estrutural que aceita conteúdo longo sem romper o viewport.

Tipografia e cores existentes permanecem como fonte de verdade. Todo alvo interativo compartilhado tem no mínimo 44x44px, `:focus-visible` usa o token de destaque e animações respeitam `prefers-reduced-motion`.
