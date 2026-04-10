# Legacy To V2 Migration

## Objetivo

Mapear os dados do banco legado do projeto Prisma para o schema v2 em Drizzle, preservando apenas o nucleo funcional do produto mobile-first.

## Escopo da Migracao

### Entram na v2

- `User`
- `Portfolio`
- `Cesta`
- `AtivosEmCestas`
- `Ativo`
- `DadoHistorico`
- `Transacao`

### Ficam fora da migracao inicial

- `FundoInvestimento`
- `SimulacaoAposentadoria`
- `Resource`
- `Embedding`
- `Notification`
- `Chat`

## Mapeamento De Tabelas

### 1. Users

Legado: `User`
V2: `users`

Mapeamento:
- `User.id` -> `users.id`
- `User.name` -> `users.name`
- `User.email` -> `users.email`
- `User.password` -> `users.password_hash`
- `User.selectedBasketId` -> `users.selected_basket_id`
- `User.createdAt` -> `users.created_at`
- `User.updatedAt` -> `users.updated_at`

Campos do legado ignorados nesta fase:
- `phone`
- `image`
- `role`
- `dataNascimento`

Transformacoes:
- `users.is_active` deve iniciar como `true`
- `selected_basket_id` so pode ser preenchido apos a migracao de `baskets`

### 2. Portfolios

Legado: `Portfolio`
V2: `portfolios`

Mapeamento:
- `Portfolio.id` -> `portfolios.id`
- `Portfolio.userId` -> `portfolios.user_id`
- `Portfolio.cashBalance` -> `portfolios.cash_balance`

Transformacoes:
- `created_at` e `updated_at` podem usar `now()` se o legado nao tiver colunas equivalentes

### 3. Assets

Legado: `Ativo`
V2: `assets`

Mapeamento:
- `Ativo.id` -> `assets.id`
- `Ativo.ticker` -> `assets.ticker`
- `Ativo.name` -> `assets.name`
- `Ativo.type` -> `assets.type`

Transformacoes necessarias:
- o legado usa `type` como `String`
- a v2 usa enum `asset_type`
- sera necessario normalizar valores para um destes:
  - `ETF`
  - `RENDA_FIXA`
  - `CRYPTO`
  - `COMMODITY`
  - `CAIXA`
  - `OUTRO`

Regra sugerida:
- valores legados conhecidos entram mapeados explicitamente
- qualquer valor nao reconhecido cai em `OUTRO`

Campo legado ignorado:
- `calculationType`

### 4. Historical Prices

Legado: `DadoHistorico`
V2: `historical_prices`

Mapeamento:
- `DadoHistorico.id` -> `historical_prices.id`
- `DadoHistorico.ativoId` -> `historical_prices.asset_id`
- `DadoHistorico.date` -> `historical_prices.price_date`
- `DadoHistorico.price` -> `historical_prices.price`

Transformacoes:
- registros com `price = null` devem ser descartados na migracao

### 5. Transactions

Legado: `Transacao`
V2: `transactions`

Mapeamento:
- `Transacao.id` -> `transactions.id`
- `Transacao.userId` -> `transactions.user_id`
- `Transacao.ativoId` -> `transactions.asset_id`
- `Transacao.type` -> `transactions.type`
- `Transacao.shares` -> `transactions.shares`
- `Transacao.pricePerShare` -> `transactions.price_per_share`
- `Transacao.date` -> `transactions.traded_at`

Transformacoes:
- enum e compativel entre legado e v2: `COMPRA | VENDA`

### 6. Baskets

Legado: `Cesta`
V2: `baskets`

Mapeamento:
- `Cesta.id` -> `baskets.id`
- `Cesta.userId` -> `baskets.user_id`
- `Cesta.name` -> `baskets.name`

Transformacoes:
- `baskets.description` deve iniciar como string vazia ou descricao padrao
- `baskets.status` deve ser `RASCUNHO` por padrao
- apos migrar `users.selectedBasketId`, a cesta selecionada do usuario pode ser marcada como `ATIVA` na leitura da API

### 7. Basket Allocations

Legado: `AtivosEmCestas`
V2: `basket_allocations`

Mapeamento:
- `AtivosEmCestas.cestaId` -> `basket_allocations.basket_id`
- `AtivosEmCestas.ativoId` -> `basket_allocations.asset_id`
- `AtivosEmCestas.targetPercentage` -> `basket_allocations.target_percentage`

Transformacoes:
- `sort_order` deve ser derivado na migracao, por exemplo pela ordem decrescente de `targetPercentage`

## Ordem Recomendada De Migracao

1. `users`
2. `assets`
3. `portfolios`
4. `historical_prices`
5. `baskets`
6. `basket_allocations`
7. atualizar `users.selected_basket_id`
8. `transactions`

Motivo:
- garante integridade referencial
- evita insert de chaves externas antes das tabelas base

## Estrategia Tecnica

### Opcao recomendada

Usar duas conexoes de banco no script de migracao:
- `LEGACY_DATABASE_URL`
- `DATABASE_URL`

Isso permite:
- ler o banco antigo com seguranca
- gravar na base v2 separada
- repetir a migracao em ambiente de homologacao sem afetar o legado

## Regras De Seguranca

- nunca deletar dados do legado
- nunca rodar update no banco antigo
- migracao sempre em modo read-only para o legado
- inserir na v2 por lotes
- validar contagens e amostras apos cada entidade

## Validacoes Pos-Migracao

### Contagens

- total de usuarios migrados
- total de ativos migrados
- total de portfolios migrados
- total de cestas migradas
- total de alocacoes migradas
- total de transacoes migradas
- total de historicos migrados

### Integridade

- todo `portfolio.user_id` existe em `users`
- toda `transaction.asset_id` existe em `assets`
- toda `basket_allocation.basket_id` existe em `baskets`
- todo `users.selected_basket_id` existe em `baskets` ou e `null`

### Qualidade funcional

- usuario com carteira no legado precisa abrir `portfolio summary` na v2 sem erro
- cesta selecionada precisa aparecer em `GET /api/baskets/active`
- `GET /api/rebalance/preview` precisa responder para usuario migrado

## Riscos Conhecidos

1. `Ativo.type` legado e string livre
- risco de nao encaixar no enum v2

2. `selectedBasketId` pode referenciar cesta inexistente ou nao migrada
- precisa validar antes do update final em `users`

3. dados historicos volumosos
- precisam ser migrados em batch

4. diferencas de precisao decimal
- validar escala entre Prisma e Drizzle

## Decisoes Tomadas

- ids do legado devem ser preservados na v2 quando possivel
- modulos fora do core nao entram na primeira migracao
- a v2 deve ler apenas o banco novo apos a migracao
