# Story 5.7 — Drizzle toolchain sem vulnerabilidades moderadas

## Decisão

Foi mantida a combinação estável `drizzle-kit@0.31.10` + `drizzle-orm@0.45.2`. O `drizzle-kit` foi promovido de dependência do workspace da API para dependência de desenvolvimento da raiz, preservando a resolução do binário pelos scripts do workspace e o peer opcional `drizzle-kit >=0.31.4` do `better-auth@1.7.1`.

O override raiz fixa `esbuild@0.25.12` para a árvore legada de `@esbuild-kit/core-utils`. Essa versão está fora da faixa vulnerável `<=0.24.2` e também satisfaz a dependência direta `esbuild ^0.25.4` do `drizzle-kit`. O override é reproduzido por `npm ci`; `db:generate`, migrations, build e testes exercitam a compatibilidade efetiva.

Não foi usado `npm audit fix --force`: ele propunha o downgrade incompatível para `drizzle-kit@0.18.1`. Também não foi adotado o Drizzle v1 RC: o [guia oficial de upgrade v1](https://orm.drizzle.team/docs/upgrade-v1) exige conversão consciente do histórico com `drizzle-kit up`, e existe um [relato aberto de drift após o upgrade exatamente de ORM 0.45.2/Kit 0.31.10](https://github.com/drizzle-team/drizzle-orm/issues/6020).

## Baseline e resultado do audit

| Verificação | Antes | Depois |
|---|---:|---:|
| `npm audit --json` | 4 moderate, 0 high, 0 critical | 0 vulnerabilidades |
| `npm audit --omit=dev --json` | 4 moderate, 0 high, 0 critical | 0 vulnerabilidades |

Cadeia inicial exata:

```text
drizzle-kit@0.31.10
└─ @esbuild-kit/esm-loader@2.6.5
   └─ @esbuild-kit/core-utils@3.3.2
      └─ esbuild@0.18.20 (GHSA-67mh-4wv8-2f99)
```

O resultado também aparecia com `--omit=dev` porque `better-auth` declara `drizzle-kit` como peer opcional. O runtime de migrations da aplicação continua usando `drizzle-orm/postgres-js/migrator`; o `drizzle-kit` é ferramenta de geração e operação do schema.

Árvore validada após `npm ci`:

```text
drizzle-kit@0.31.10
├─ esbuild@0.25.12 overridden
└─ @esbuild-kit/esm-loader@2.6.5
   └─ @esbuild-kit/core-utils@3.3.2
      └─ esbuild@0.25.12 deduped
tsx@4.23.12
└─ esbuild@0.28.2 overridden
```

## Schema, migrações e rollback

O primeiro `db:generate` detectou que as migrations manuais `0016` a `0019` não tinham um snapshot Drizzle correspondente e propôs SQL duplicado para objetos já versionados. O SQL foi descartado e apenas `drizzle/meta/0019_snapshot.json` foi reconciliado com o schema vigente. A repetição retornou `No schema changes, nothing to migrate`.

As validações foram executadas em PostgreSQL 16 descartável:

- aplicação do histórico completo do zero com `drizzle-kit migrate`: 24 tabelas públicas e 20 migrations;
- aplicação do histórico com o migrador programático usado pelo container;
- segundo migrate sobre a baseline: operação idempotente, sem alteração de schema;
- dumps de schema antes/depois, removidos apenas os marcadores aleatórios `\\restrict` do `pg_dump`: SHA-256 idêntico `87d2da0262ba25536e8a1943d11732e8cc7d170f8cd92b68ffd822d17bfd2efe`;
- restore do backup em outro banco descartável: 24 tabelas públicas e 20 migrations.

Procedimento de manutenção:

1. Antes de alterar Drizzle ou migrations, criar backup completo e snapshot de schema:

   ```sh
   pg_dump "$DATABASE_URL" -Fc -f pre-drizzle-upgrade.dump
   pg_dump "$DATABASE_URL" --schema-only --no-owner --no-privileges -f pre-drizzle-upgrade-schema.sql
   ```

2. Executar `npm ci`, `npm audit`, `npm run db:generate` e revisar todo diff em `apps/api/drizzle`.
3. Aplicar as migrations primeiro em uma cópia descartável da baseline e comparar o schema.
4. Em rollback controlado, parar writes, criar um snapshot de emergência e restaurar o backup em uma instância vazia:

   ```sh
   pg_dump "$DATABASE_URL" -Fc -f emergency-before-rollback.dump
   createdb rollback_verify
   pg_restore --no-owner --no-privileges --dbname=rollback_verify pre-drizzle-upgrade.dump
   ```

5. Validar contagens, constraints, migration journal e health antes de trocar a conexão. Não restaurar destrutivamente sobre produção sem janela e coordenação operacional.

## Gates

Os resultados finais dos gates locais, integração e smoke Docker ficam registrados na story e no gate de QA da branch.
