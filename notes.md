# Notes - Passe Caprichado UI/UX

## Diagnostico
- O app tinha boa base funcional, mas com muitos valores hardcoded de `borderRadius`, `padding`, `gap` e alturas.
- A hierarquia visual entre botoes e cards variava entre telas.
- Alguns estados vazios e de carregamento estavam presentes, mas sem padrao unico de linguagem/estilo.

## Direcao adotada
- Introduzir tokens de layout para consistencia visual.
- Reaplicar em componentes base primeiro, depois telas principais.
- Evitar mudanca de comportamento; focar acabamento, legibilidade e ergonomia.
