WITH duplicate_assets AS (
  SELECT
    alias.id AS alias_id,
    canonical.id AS canonical_id
  FROM assets alias
  JOIN assets canonical
    ON canonical.source_ticker = alias.ticker
  WHERE alias.is_active = true
    AND canonical.is_active = true
)
INSERT INTO historical_prices (id, asset_id, price_date, price, created_at)
SELECT
  gen_random_uuid()::text,
  d.canonical_id,
  hp.price_date,
  hp.price,
  hp.created_at
FROM historical_prices hp
JOIN duplicate_assets d ON d.alias_id = hp.asset_id
ON CONFLICT (asset_id, price_date) DO UPDATE
SET price = excluded.price;--> statement-breakpoint

WITH duplicate_assets AS (
  SELECT
    alias.id AS alias_id,
    canonical.id AS canonical_id
  FROM assets alias
  JOIN assets canonical
    ON canonical.source_ticker = alias.ticker
  WHERE alias.is_active = true
    AND canonical.is_active = true
)
UPDATE transactions tx
SET asset_id = d.canonical_id
FROM duplicate_assets d
WHERE tx.asset_id = d.alias_id;--> statement-breakpoint

WITH duplicate_assets AS (
  SELECT
    alias.id AS alias_id,
    canonical.id AS canonical_id
  FROM assets alias
  JOIN assets canonical
    ON canonical.source_ticker = alias.ticker
  WHERE alias.is_active = true
    AND canonical.is_active = true
)
UPDATE investment_funds fund
SET index_asset_id = d.canonical_id
FROM duplicate_assets d
WHERE fund.index_asset_id = d.alias_id;--> statement-breakpoint

WITH duplicate_assets AS (
  SELECT
    alias.id AS alias_id,
    canonical.id AS canonical_id
  FROM assets alias
  JOIN assets canonical
    ON canonical.source_ticker = alias.ticker
  WHERE alias.is_active = true
    AND canonical.is_active = true
)
UPDATE basket_allocations allocation
SET asset_id = d.canonical_id
FROM duplicate_assets d
WHERE allocation.asset_id = d.alias_id
  AND NOT EXISTS (
    SELECT 1
    FROM basket_allocations existing
    WHERE existing.basket_id = allocation.basket_id
      AND existing.asset_id = d.canonical_id
  );--> statement-breakpoint

WITH duplicate_assets AS (
  SELECT
    alias.id AS alias_id,
    canonical.id AS canonical_id
  FROM assets alias
  JOIN assets canonical
    ON canonical.source_ticker = alias.ticker
  WHERE alias.is_active = true
    AND canonical.is_active = true
)
DELETE FROM basket_allocations allocation
USING duplicate_assets d
WHERE allocation.asset_id = d.alias_id;--> statement-breakpoint

WITH duplicate_assets AS (
  SELECT
    alias.id AS alias_id,
    canonical.id AS canonical_id
  FROM assets alias
  JOIN assets canonical
    ON canonical.source_ticker = alias.ticker
  WHERE alias.is_active = true
    AND canonical.is_active = true
)
DELETE FROM historical_prices hp
USING duplicate_assets d
WHERE hp.asset_id = d.alias_id;--> statement-breakpoint

UPDATE assets alias
SET is_active = false,
    source_ticker = null,
    updated_at = now()
FROM assets canonical
WHERE alias.is_active = true
  AND canonical.is_active = true
  AND canonical.source_ticker = alias.ticker;
