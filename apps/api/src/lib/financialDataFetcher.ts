import { db } from "@/db/client";
import { assets, historicalPrices } from "@/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";

import {
  toUtcDayStart,
  addUtcDays,
  toUtcDayKey,
  formatDateForBCB,
  parseBCBDate,
} from "@paridade-risco/shared";

interface PriceDataPoint {
  date: Date;
  price: string;
}

interface LastPricePoint {
  priceDate: Date;
  price: string;
}

type PriceSource = "YAHOO_FINANCE" | "BCB";

export interface AssetPriceUpdateResult {
  ticker: string;
  source: PriceSource | null;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  lastDateBefore: Date | null;
  lastDateAfter: Date | null;
  success: boolean;
  message?: string;
}

interface YahooFinanceResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: (number | null)[];
        }>;
      };
    }>;
    error: { code: string; description: string } | null;
  };
}

const YAHOO_CHART_API = "https://query1.finance.yahoo.com/v8/finance/chart";
const BCB_API = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

/**
 * Financial Data Fetcher - replicates legacy price-fetching service
 * Supports multiple data sources: Yahoo Finance, BCB, IPEA
 */
export class FinancialDataFetcher {
  private async getMonitorableAssets(): Promise<Array<typeof assets.$inferSelect>> {
    return db
      .select()
      .from(assets)
      .where(sql`${assets.isActive} = true
        AND NOT EXISTS (
          SELECT 1
          FROM ${assets} canonical
          WHERE canonical.is_active = true
            AND canonical.source_ticker = ${assets.ticker}
        )`)
      .orderBy(sql`${assets.ticker} ASC`);
  }

  /**
   * Get last update date for a given asset ticker
   */
  private async getLastPriceForAsset(assetId: string): Promise<LastPricePoint | null> {
    const lastPrice = await db
      .select({ priceDate: historicalPrices.priceDate, price: historicalPrices.price })
      .from(historicalPrices)
      .where(eq(historicalPrices.assetId, assetId))
      .orderBy(sql`${historicalPrices.priceDate} DESC`)
      .limit(1);

    return lastPrice.length > 0 ? lastPrice[0] : null;
  }

  private async getLastPriceDateForAsset(assetId: string): Promise<Date | null> {
    const lastPrice = await this.getLastPriceForAsset(assetId);
    return lastPrice?.priceDate ?? null;
  }

  /**
   * Fetch historical price data from Yahoo Finance
   */
  async fetchYahooFinanceData(
    ticker: string,
    startDate?: Date
  ): Promise<PriceDataPoint[]> {
    try {
      const endDate = new Date();
      const start = startDate ? new Date(startDate) : new Date(endDate.getTime() - 5 * 365 * 24 * 60 * 60 * 1000); // 5 years

      const startUnix = Math.floor(start.getTime() / 1000);
      const endUnix = Math.floor(endDate.getTime() / 1000);

      const url = `${YAHOO_CHART_API}/${ticker}?interval=1d&period1=${startUnix}&period2=${endUnix}&events=history&includeAdjustedClose=true`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        console.error(`Yahoo Finance API error for ${ticker}:`, response.statusText);
        return [];
      }

      const data = (await response.json()) as YahooFinanceResponse;

      if (data.chart.error) {
        console.error(`Yahoo Finance error for ${ticker}:`, data.chart.error);
        return [];
      }

      const result = data.chart.result?.[0];
      if (!result) return [];

      const prices: PriceDataPoint[] = [];
      const timestamps = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0]?.close || [];

      for (let i = 0; i < timestamps.length; i++) {
        const price = quotes[i];
        if (price !== null && price > 0) {
          prices.push({
            date: new Date(timestamps[i] * 1000),
            price: price.toFixed(4),
          });
        }
      }

      return prices;
    } catch (error) {
      console.error(`Error fetching Yahoo Finance data for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Fetch CDI data from BCB API
   * Series 12 = CDI daily rate
   */
  async fetchCDIData(startDate?: Date, initialValue?: number): Promise<PriceDataPoint[]> {
    return this.fetchAccumulatedSeriesFromBCB({
      label: "CDI",
      seriesCode: 12,
      startDate,
      initialValue,
    });
  }

  /**
   * Fetch Selic daily data from BCB API
   * Series 11 = daily Selic rate
   */
  async fetchSELICData(startDate?: Date, initialValue?: number): Promise<PriceDataPoint[]> {
    return this.fetchAccumulatedSeriesFromBCB({
      label: "SELIC",
      seriesCode: 11,
      startDate,
      initialValue,
    });
  }

  /**
   * Fetch CDI monthly data from BCB API
   * Series 4391 = CDI monthly rate
   */
  async fetchCDIMensalData(startDate?: Date, initialValue?: number): Promise<PriceDataPoint[]> {
    return this.fetchAccumulatedSeriesFromBCB({
      label: "CDI_MENSAL",
      seriesCode: 4391,
      startDate,
      initialValue,
    });
  }

  /**
   * Fetch IPCA data from BCB API
   * Series 433 = IPCA monthly accumulated
   */
  async fetchIPCAData(startDate?: Date, initialValue?: number): Promise<PriceDataPoint[]> {
    return this.fetchAccumulatedSeriesFromBCB({
      label: "IPCA",
      seriesCode: 433,
      startDate,
      initialValue,
    });
  }

  /**
   * IPCA expectation fallback (keeps ticker updated when expectation source is unavailable)
   */
  async fetchIPCAExpectationData(startDate?: Date, initialValue?: number): Promise<PriceDataPoint[]> {
    return this.fetchAccumulatedSeriesFromBCB({
      label: "IPCA_EXP",
      seriesCode: 433,
      startDate,
      initialValue,
    });
  }

  private async fetchAccumulatedSeriesFromBCB(args: {
    seriesCode: number;
    label: string;
    startDate?: Date;
    initialValue?: number;
  }): Promise<PriceDataPoint[]> {
    try {
      const start = args.startDate
        ? args.startDate
        : new Date(new Date().getTime() - 5 * 365 * 24 * 60 * 60 * 1000); // 5 years

      const startStr = this.formatDateForBCB(start);
      const end = new Date();

      if (start > end) {
        return [];
      }

      const endStr = this.formatDateForBCB(end);

      const url = `${BCB_API}.${args.seriesCode}/dados?formato=json&dataInicial=${startStr}&dataFinal=${endStr}`;

      const response = await fetch(url);

      if (response.status === 404) {
        console.log(`BCB API returned no data for ${args.label} between ${startStr} and ${endStr}`);
        return [];
      }

      if (!response.ok) {
        console.error(`BCB API error for ${args.label}:`, response.statusText);
        return [];
      }

      const data = (await response.json()) as { valor: string; data: string }[];

      const prices: PriceDataPoint[] = [];
      let accumulatedValue = args.initialValue ?? 100;

      for (const entry of data) {
        const date = this.parseBCBDate(entry.data);

        if (Number.isNaN(date.getTime())) {
          continue;
        }

        if (args.startDate && date < args.startDate) {
          continue;
        }

        const rate = parseFloat(entry.valor) / 100;
        accumulatedValue = accumulatedValue * (1 + rate);

        prices.push({
          date,
          price: accumulatedValue.toFixed(4),
        });
      }

      return prices;
    } catch (error) {
      console.error(`Error fetching ${args.label} data:`, error);
      return [];
    }
  }

  /**
   * Upsert asset prices into database
   * Batches inserts in chunks of 100
   */
  private async upsertAsset(
    assetId: string,
    prices: PriceDataPoint[],
  ): Promise<{ inserted: number; updated: number; skipped: number }> {
    if (prices.length === 0) {
      return { inserted: 0, updated: 0, skipped: 0 };
    }

    const pricesByDay = new Map<string, PriceDataPoint>();
    for (const price of prices) {
      pricesByDay.set(this.toUtcDayKey(price.date), price);
    }
    const dedupedPrices = Array.from(pricesByDay.values());

    const batchSize = 100;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < dedupedPrices.length; i += batchSize) {
      const batch = dedupedPrices.slice(i, i + batchSize);

      try {
        const firstDay = this.toUtcDayStart(
          new Date(Math.min(...batch.map((price) => price.date.getTime()))),
        );
        const lastDayExclusive = this.addUtcDays(
          this.toUtcDayStart(
            new Date(Math.max(...batch.map((price) => price.date.getTime()))),
          ),
          1,
        );
        const existingRows = await db
          .select({ priceDate: historicalPrices.priceDate })
          .from(historicalPrices)
          .where(
            and(
              eq(historicalPrices.assetId, assetId),
              gte(historicalPrices.priceDate, firstDay),
              lt(historicalPrices.priceDate, lastDayExclusive),
            ),
          );
        const existingDateByDay = new Map(
          existingRows.map((row) => [this.toUtcDayKey(row.priceDate), row.priceDate]),
        );
        const values = batch.map((p) => ({
          assetId,
          priceDate: existingDateByDay.get(this.toUtcDayKey(p.date)) ?? p.date,
          price: p.price,
        }));

        const upsertedRows = await db
          .insert(historicalPrices)
          .values(values)
          .onConflictDoUpdate({
            target: [historicalPrices.assetId, historicalPrices.priceDate],
            set: {
              price: sql`excluded.price`,
            },
          })
          .returning({ id: historicalPrices.id, priceDate: historicalPrices.priceDate });

        const upserted = upsertedRows.length;
        const existingInBatch = values.filter((price) =>
          existingDateByDay.has(this.toUtcDayKey(price.priceDate)),
        ).length;

        inserted += Math.max(upserted - existingInBatch, 0);
        updated += Math.min(existingInBatch, upserted);
        skipped += Math.max(batch.length - upserted, 0);
      } catch (error) {
        console.error(`Error upserting prices for asset ${assetId}:`, error);
        throw error;
      }
    }

    return { inserted, updated, skipped };
  }

  private toUtcDayStart(date: Date): Date {
    return toUtcDayStart(date);
  }

  private addUtcDays(date: Date, days: number): Date {
    return addUtcDays(date, days);
  }

  private toUtcDayKey(date: Date): string {
    return toUtcDayKey(date);
  }

  private getSourceTicker(asset: typeof assets.$inferSelect): string {
    return asset.sourceTicker?.trim() || asset.ticker;
  }

  private getPriceSource(asset: typeof assets.$inferSelect): PriceSource | null {
    const ticker = this.getSourceTicker(asset);

    if (!ticker) {
      return null;
    }

    if (asset.calculationType === "PERCENTUAL") {
      return ["CDI", "CDI_MENSAL", "SELIC", "IPCA", "IPCA_EXP"].includes(ticker) ? "BCB" : null;
    }

    if (asset.type === "CAIXA") {
      return null;
    }

    return "YAHOO_FINANCE";
  }

  private async fetchPricesForAsset(
    asset: typeof assets.$inferSelect,
    startDate?: Date,
    initialValue?: number,
  ): Promise<PriceDataPoint[]> {
    const sourceTicker = this.getSourceTicker(asset);

    if (asset.calculationType === "PERCENTUAL") {
      const fetchStartDate = startDate ? this.addUtcDays(this.toUtcDayStart(startDate), 1) : undefined;

      if (sourceTicker === "CDI") {
        return this.fetchCDIData(fetchStartDate, initialValue);
      }
      if (sourceTicker === "CDI_MENSAL") {
        return this.fetchCDIMensalData(fetchStartDate, initialValue);
      }
      if (sourceTicker === "SELIC") {
        return this.fetchSELICData(fetchStartDate, initialValue);
      }
      if (sourceTicker === "IPCA") {
        return this.fetchIPCAData(fetchStartDate, initialValue);
      }
      if (sourceTicker === "IPCA_EXP") {
        return this.fetchIPCAExpectationData(fetchStartDate, initialValue);
      }

      return [];
    }

    if (asset.type === "CAIXA") {
      return [];
    }

    return this.fetchYahooFinanceData(sourceTicker, startDate);
  }

  /**
   * Update a specific asset's historical prices
   */
  async updateSpecificAsset(ticker: string, incremental = false): Promise<AssetPriceUpdateResult> {
    try {
      const asset = await db.query.assets.findFirst({
        where: eq(assets.ticker, ticker),
      });

      if (!asset) {
        return {
          ticker,
          source: null,
          fetched: 0,
          inserted: 0,
          updated: 0,
          skipped: 0,
          lastDateBefore: null,
          lastDateAfter: null,
          success: false,
          message: `Asset ${ticker} not found`,
        };
      }

      const lastPriceBefore = await this.getLastPriceForAsset(asset.id);
      const lastDateBefore = lastPriceBefore?.priceDate ?? null;
      const source = this.getPriceSource(asset);
      const prices = await this.fetchPricesForAsset(
        asset,
        incremental ? lastDateBefore ?? undefined : undefined,
        incremental && lastPriceBefore ? Number(lastPriceBefore.price) : undefined,
      );
      const result = await this.upsertAsset(asset.id, prices);
      const lastDateAfter = await this.getLastPriceDateForAsset(asset.id);

      return {
        ticker: asset.ticker,
        source,
        fetched: prices.length,
        inserted: result.inserted,
        updated: result.updated,
        skipped: result.skipped,
        lastDateBefore,
        lastDateAfter,
        success: true,
        message: `Updated ${ticker}: inserted ${result.inserted}, updated ${result.updated}, skipped ${result.skipped} price points`,
      };
    } catch (error) {
      return {
        ticker,
        source: null,
        fetched: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        lastDateBefore: null,
        lastDateAfter: null,
        success: false,
        message: `Error updating ${ticker}: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Update all active assets (incremental by default)
   */
  async updateAllAssets(incremental = true): Promise<{ success: boolean; message: string; results: AssetPriceUpdateResult[] }> {
    const activeAssets = await this.getMonitorableAssets();

    const results: AssetPriceUpdateResult[] = [];

    for (const asset of activeAssets) {
      try {
        const lastPriceBefore = await this.getLastPriceForAsset(asset.id);
        const lastDateBefore = lastPriceBefore?.priceDate ?? null;
        const source = this.getPriceSource(asset);
        const prices = await this.fetchPricesForAsset(
          asset,
          incremental ? lastDateBefore ?? undefined : undefined,
          incremental && lastPriceBefore ? Number(lastPriceBefore.price) : undefined,
        );
        const result = await this.upsertAsset(asset.id, prices);
        const lastDateAfter = await this.getLastPriceDateForAsset(asset.id);

        results.push({
          ticker: asset.ticker,
          source,
          fetched: prices.length,
          inserted: result.inserted,
          updated: result.updated,
          skipped: result.skipped,
          lastDateBefore,
          lastDateAfter,
          success: true,
        });

        console.log(
          `✓ ${asset.ticker}: fetched=${prices.length}, inserted=${result.inserted}, updated=${result.updated}, skipped=${result.skipped}`,
        );
      } catch (error) {
        console.error(`✗ ${asset.ticker}: ${error}`);
        results.push({
          ticker: asset.ticker,
          source: this.getPriceSource(asset),
          fetched: 0,
          inserted: 0,
          updated: 0,
          skipped: 0,
          lastDateBefore: null,
          lastDateAfter: null,
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const insertedTotal = results.reduce((sum, row) => sum + row.inserted, 0);
    const updatedTotal = results.reduce((sum, row) => sum + row.updated, 0);
    const skippedTotal = results.reduce((sum, row) => sum + row.skipped, 0);

    return {
      success: results.every((row) => row.success),
      message: `Updated ${activeAssets.length} assets: inserted ${insertedTotal}, updated ${updatedTotal}, skipped ${skippedTotal}`,
      results,
    };
  }

  /**
   * Get update status for all active assets
   */
  async getUpdateStatus(): Promise<Array<{ ticker: string; lastUpdate: Date | null; staleDays: number }>> {
    const activeAssets = await this.getMonitorableAssets();

    const status: Array<{ ticker: string; lastUpdate: Date | null; staleDays: number }> = [];
    const now = new Date();

    for (const asset of activeAssets) {
      const lastPrice = await db
        .select({ priceDate: historicalPrices.priceDate })
        .from(historicalPrices)
        .where(eq(historicalPrices.assetId, asset.id))
        .orderBy(sql`${historicalPrices.priceDate} DESC`)
        .limit(1);

      const lastUpdate = lastPrice.length > 0 ? lastPrice[0].priceDate : null;
      const staleDays = lastUpdate
        ? Math.floor((now.getTime() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24))
        : -1;

      status.push({
        ticker: asset.ticker,
        lastUpdate,
        staleDays,
      });
    }

    return status;
  }

  /**
   * Format date for BCB API (DD/MM/YYYY)
   */
  private formatDateForBCB(date: Date): string {
    return formatDateForBCB(date);
  }

  private parseBCBDate(value: string): Date {
    return parseBCBDate(value);
  }
}

/**
 * Singleton instance
 */
let fetcher: FinancialDataFetcher | null = null;

export async function getFinancialDataFetcher(): Promise<FinancialDataFetcher> {
  if (!fetcher) {
    fetcher = new FinancialDataFetcher();
  }
  return fetcher;
}
