# BTG Trader Desk RTD bridge

Bridge local para consumir o RTD do BTG Trader Desk via TCP local, sem Excel,
e publicar snapshots de cotações no Paridade.

## Pré-requisitos

- Windows;
- BTG Trader Desk aberto, conectado e com o RTD ativo;
- PowerShell 7 ou Windows PowerShell;
- o ativo precisa estar disponível no BTG e cadastrado no Paridade.

## Ler um snapshot

Na raiz do repositório:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\tools\profit-rtd-bridge\read-rtd.ps1 `
  -Asset BOVA11 `
  -Topic BOVA11
```

Para acompanhar vários ativos no mesmo processo, informe uma lista separada
por vírgulas. O tópico de cada snapshot será o próprio ticker:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\tools\profit-rtd-bridge\read-rtd.ps1 `
  -Asset BOVA11,BPAC11,ITUB4 `
  -Watch
```

## Descoberta automática de ativos

Para manter a bridge aberta sem reiniciá-la quando um novo ativo for cadastrado
em Cotações, use `AssetsUrl`. A bridge consulta a lista a cada cinco segundos,
assina somente os tickers novos e mantém as assinaturas já existentes:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\tools\profit-rtd-bridge\read-rtd.ps1 `
  -AssetsUrl 'http://localhost:3002/api/assets?source=BTG_TRADE_DESK' `
  -AssetRefreshMilliseconds 5000 `
  -Watch
```

Com esse modo, cadastrar `ITUB4` ou qualquer outro ticker em Cotações não
exige reiniciar a bridge. O Trader Desk e a bridge precisam continuar abertos;
o novo ativo será assinado na próxima consulta.

A bridge assina os campos do BTG na ordem `campo|ativo`, por exemplo
`QUOTE.LAST_TRADE_PRICE|BOVA11`. A saída é um envelope JSON somente de leitura:

```json
{"source":"BTG_TRADE_DESK","asset":"BOVA11","topic":"BOVA11","receivedAt":"...","fields":{"QUOTE.LAST_TRADE_PRICE":"...","QUOTE.OPEN":"...","QUOTE.HIGH":"...","QUOTE.LOW":"..."}}
```

O modo contínuo mantém a sessão aberta e publica uma linha por ativo quando os
valores mudarem:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File .\tools\profit-rtd-bridge\read-rtd.ps1 `
  -Asset BOVA11 `
  -Topic BOVA11 `
  -Watch
```

Os campos de metadados `QUOTE.DESCRIPTION`, `QUOTE.ASSET` e
`QUOTE.SECURITY_TYPE` são coletados primeiro para preencher automaticamente o
nome e a classificação do ativo. Os demais campos padrão são
`QUOTE.BID_PRICE`, `QUOTE.ASK_PRICE`,
`QUOTE.CHGPERCENT`, `QUOTE.LAST_TRADE_PRICE`, `QUOTE.LAST_TRADE_QUANTITY`,
`QUOTE.BID_QUANTITY`, `QUOTE.ASK_QUANTITY`, `QUOTE.CLOSE`,
`QUOTE.PREV_CLOSE`, `QUOTE.OPEN`, `QUOTE.ADJUST`, `QUOTE.HIGH`,
`QUOTE.LOW`, `QUOTE.CHANGE`, `QUOTE.CHANGE_PERCENT`, `QUOTE.NUM_TRADES` e
`QUOTE.QUANTITY`.

## Publicar no Paridade

Configure `PROFIT_RTD_INGEST_SECRET` no ambiente do serviço `api` e use o
mesmo valor na bridge. O nome permanece por compatibilidade com o `.env`
existente; a fonte aceita pela API é exclusivamente `BTG_TRADE_DESK`.

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass `
  -File .\tools\profit-rtd-bridge\read-rtd.ps1 `
  -AssetsUrl 'http://localhost:3002/api/assets?source=BTG_TRADE_DESK' `
  -AssetRefreshMilliseconds 5000 `
  -Watch `
  -PostUrl http://localhost:3002/api/integrations/profit/quotes `
  -BearerToken $env:PROFIT_RTD_INGEST_SECRET
```

A API normaliza `QUOTE.LAST_TRADE_PRICE`, `QUOTE.OPEN`, `QUOTE.HIGH` e
`QUOTE.LOW` para os campos comuns de cotação, além de registrar negócios e
o horário de recebimento. O último snapshot fica disponível para o motor de
risco e para a tela de monitoramento.
