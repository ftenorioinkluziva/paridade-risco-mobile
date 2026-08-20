# Story 5.9 — revisão visual responsiva

## Baseline

Na validação autenticada anterior à mudança, o Resumo desktop ocupava corretamente a largura central, mas distribuía sete indicadores em três faixas antes da decisão. No mobile 390x844, os sete cards financeiros apareciam antes da próxima decisão, exigindo rolagem longa. As telas críticas também repetiam espaçamento mais amplo e o token auxiliar `textSoft` ficava em 4,42:1 sobre painéis, abaixo de AA.

## Evolução aplicada

- As sete rotas críticas declaram identidade de página no mesmo `Screen` responsivo da Story 5.8; não foi criado layout paralelo.
- Resumo passou a largura `wide`: patrimônio e investido permanecem primeiro, a próxima decisão vem logo depois, e indicadores financeiros secundários usam uma grade de cinco colunas no desktop e uma coluna no mobile.
- Cabeçalhos críticos ganharam separação estrutural e densidade uniforme; grids e cards usam melhor a largura entre 1024 e 1440 px.
- Cards financeiros usam padding responsivo, números tabulares e quebra segura para valores e conteúdo longo.
- `textSoft` foi elevado para `#A6A6B0`. A cor semântica de perigo foi separada entre foreground acessível (`#F87171`) e ação destrutiva (`#B91C1C`).
- A ordem mobile preserva estado atual, próxima decisão, indicadores secundários e detalhes.

## Evidência e invariantes

Uma matriz Playwright valida `/`, `/investimentos`, `/cotacoes`, `/cestas`, `/perfil`, `/pluggy` e `/saude-financeira` em 1440x900 e 390x844. Cada rota verifica título, ausência de overflow horizontal, WCAG A/AA por axe e snapshot do cabeçalho. O teste do Resumo confirma programaticamente que a próxima decisão antecede os detalhes financeiros no mobile.

Não foram alterados cálculos financeiros, contratos de API, conjunto de 11 ETFs, scheduler de 8 minutos ou rotas legadas. Os avisos de transição permanecem fora do redesign funcional.
