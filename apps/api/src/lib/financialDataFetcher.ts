import { db } from "@/db/client";
import { assets, historicalPrices } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

interface PriceDataPoint {
  date: Date;
  price: string;
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
  /**
   * Get last update date for a given asset ticker
   */
  private async getLastUpdateDate(ticker: string): Promise<Date | null> {
    const asset = await db.query.assets.findFirst({
      where: eq(assets.ticker, ticker),
    });

    if (!asset) return null;

    const lastPrice = await db
      .select({ priceDate: historicalPrices.priceDate })
      .from(historicalPrices)
      .where(eq(historicalPrices.assetId, asset.id))
      .orderBy(sql`${historicalPrices.priceDate} DESC`)
      .limit(1);

    return lastPrice.length > 0 ? lastPrice[0].priceDate : null;
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
  async fetchCDIData(startDate?: Date): Promise<PriceDataPoint[]> {
    return this.fetchAccumulatedSeriesFromBCB({
      label: "CDI",
      seriesCode: 12,
      startDate,
    });
  }

  /**
   * Fetch CDI monthly data from BCB API
   * Series 4391 = CDI monthly rate
   */
  async fetchCDIMensalData(startDate?: Date): Promise<PriceDataPoint[]> {
    return this.fetchAccumulatedSeriesFromBCB({
      label: "CDI_MENSAL",
      seriesCode: 4391,
      startDate,
    });
  }

  /**
   * Fetch IPCA data from BCB API
   * Series 433 = IPCA monthly accumulated
   */
  async fetchIPCAData(startDate?: Date): Promise<PriceDataPoint[]> {
    return this.fetchAccumulatedSeriesFromBCB({
      label: "IPCA",
      seriesCode: 433,
      startDate,
    });
  }

  /**
   * IPCA expectation fallback (keeps ticker updated when expectation source is unavailable)
   */
  async fetchIPCAExpectationData(startDate?: Date): Promise<PriceDataPoint[]> {
    return this.fetchAccumulatedSeriesFromBCB({
      label: "IPCA_EXP",
      seriesCode: 433,
      startDate,
    });
  }

  private async fetchAccumulatedSeriesFromBCB(args: {
    seriesCode: number;
    label: string;
    startDate?: Date;
  }): Promise<PriceDataPoint[]> {
    try {
      const start = args.startDate
        ? args.startDate
        : new Date(new Date().getTime() - 5 * 365 * 24 * 60 * 60 * 1000); // 5 years

      const startStr = this.formatDateForBCB(start);
      const endStr = this.formatDateForBCB(new Date());

      const url = `${BCB_API}.${args.seriesCode}/dados?formato=json&dataInicial=${startStr}&dataFinal=${endStr}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`BCB API error for ${args.label}:`, response.statusText);
        return [];
      }

      const data = (await response.json()) as { valor: string; data: string }[];

      const prices: PriceDataPoint[] = [];
      let accumulatedValue = 100; // Start from 100

      for (const entry of data) {
        const rate = parseFloat(entry.valor) / 100;
        accumulatedValue = accumulatedValue * (1 + rate);
        const date = this.parseBCBDate(entry.data);

        if (Number.isNaN(date.getTime())) {
          continue;
        }

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
  private async upsertAsset(assetId: string, prices: PriceDataPoint[]): Promise<number> {
    if (prices.length === 0) return 0;

    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < prices.length; i += batchSize) {
      const batch = prices.slice(i, i + batchSize);

      try {
        await db
          .insert(historicalPrices)
          .values(
            batch.map((p) => ({
              assetId,
              priceDate: p.date,
              price: p.price,
            }))
          )
          .onConflictDoNothing();

        inserted += batch.length;
      } catch (error) {
        console.error(`Error upserting prices for asset ${assetId}:`, error);
      }
    }

    return inserted;
  }

  /**
   * Update a specific asset's historical prices
   */
  async updateSpecificAsset(ticker: string): Promise<{ success: boolean; message: string }> {
    try {
      const asset = await db.query.assets.findFirst({
        where: eq(assets.ticker, ticker),
      });

      if (!asset) {
        return { success: false, message: `Asset ${ticker} not found` };
      }

      let prices: PriceDataPoint[] = [];

      if (asset.calculationType === "PERCENTUAL") {
        if (ticker === "CDI") {
          prices = await this.fetchCDIData();
        } else if (ticker === "CDI_MENSAL") {
          prices = await this.fetchCDIMensalData();
        } else if (ticker === "IPCA") {
          prices = await this.fetchIPCAData();
        } else if (ticker === "IPCA_EXP") {
          prices = await this.fetchIPCAExpectationData();
        }
      } else {
        // PRECO type
        prices = await this.fetchYahooFinanceData(ticker);
      }

      const count = await this.upsertAsset(asset.id, prices);

      return {
        success: true,
        message: `Updated ${ticker}: inserted ${count} price points`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error updating ${ticker}: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Update all active assets (incremental by default)
   */
  async updateAllAssets(incremental = true): Promise<{ success: boolean; message: string; results: Array<{ ticker: string; inserted: number }> }> {
    const activeAssets = await db.query.assets.findMany({
      where: eq(assets.isActive, true),
    });

    const results = [];

    for (const asset of activeAssets) {
      try {
        let prices: PriceDataPoint[] = [];
        let startDate: Date | null = null;

        if (incremental) {
          startDate = await this.getLastUpdateDate(asset.ticker);
        }

        if (asset.calculationType === "PERCENTUAL") {
          if (asset.ticker === "CDI") {
            prices = await this.fetchCDIData(startDate || undefined);
          } else if (asset.ticker === "CDI_MENSAL") {
            prices = await this.fetchCDIMensalData(startDate || undefined);
          } else if (asset.ticker === "IPCA") {
            prices = await this.fetchIPCAData(startDate || undefined);
          } else if (asset.ticker === "IPCA_EXP") {
            prices = await this.fetchIPCAExpectationData(startDate || undefined);
          }
        } else {
          // PRECO type
          prices = await this.fetchYahooFinanceData(asset.ticker, startDate || undefined);
        }

        const inserted = await this.upsertAsset(asset.id, prices);
        results.push({ ticker: asset.ticker, inserted });

        console.log(`✓ ${asset.ticker}: ${inserted} prices updated`);
      } catch (error) {
        console.error(`✗ ${asset.ticker}: ${error}`);
        results.push({ ticker: asset.ticker, inserted: 0 });
      }
    }

    return {
      success: true,
      message: `Updated ${activeAssets.length} assets`,
      results,
    };
  }

  /**
   * Get update status for all active assets
   */
  async getUpdateStatus(): Promise<Array<{ ticker: string; lastUpdate: Date | null; staleDays: number }>> {
    const activeAssets = await db.query.assets.findMany({
      where: eq(assets.isActive, true),
    });

    const status = [];
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
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private parseBCBDate(value: string): Date {
    const [day, month, year] = value.split("/");
    return new Date(`${year}-${month}-${day}T12:00:00.000Z`);
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
