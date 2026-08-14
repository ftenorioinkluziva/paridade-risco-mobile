import { z } from "zod";
import type { PluggyConfig } from "./config";

const authResponseSchema = z.object({ apiKey: z.string().min(1) });
const connectTokenResponseSchema = z.object({ accessToken: z.string().min(1) });
const resourceSchema = z.record(z.string(), z.unknown());
const resourceListSchema = z.object({
  results: z.array(resourceSchema),
  next: z.string().nullable().optional(),
  total: z.number().optional(),
});

export type PluggyResource = z.infer<typeof resourceSchema>;

export interface PluggyResourceList {
  results: PluggyResource[];
  next: string | null;
  total?: number;
}

export interface CreateConnectTokenInput {
  itemId?: string;
  clientUserId?: string;
  webhookUrl?: string;
  oauthRedirectUri?: string;
  avoidDuplicates?: boolean;
}

export interface ListTransactionsInput {
  accountId: string;
  after?: string;
  dateFrom?: string;
  dateTo?: string;
  createdAtFrom?: string;
}

export class PluggyApiError extends Error {
  readonly code = "PLUGGY_API_ERROR";

  constructor(
    readonly operation: string,
    readonly status: number,
  ) {
    super(`Pluggy request failed for ${operation} with status ${status}`);
    this.name = "PluggyApiError";
  }
}

export class PluggyResponseError extends Error {
  readonly code = "PLUGGY_RESPONSE_INVALID";

  constructor(readonly operation: string) {
    super(`Pluggy response is invalid for ${operation}`);
    this.name = "PluggyResponseError";
  }
}

type FetchLike = typeof fetch;

interface ApiKeyCache {
  value: string;
  expiresAt: number;
}

export class PluggyClient {
  private apiKeyCache: ApiKeyCache | null = null;

  constructor(
    private readonly config: PluggyConfig,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async createConnectToken(input: CreateConnectTokenInput = {}): Promise<{ accessToken: string }> {
    const options = {
      ...(input.clientUserId ? { clientUserId: input.clientUserId } : {}),
      ...(input.webhookUrl ? { webhookUrl: input.webhookUrl } : {}),
      ...(input.oauthRedirectUri ? { oauthRedirectUri: input.oauthRedirectUri } : {}),
      ...(typeof input.avoidDuplicates === "boolean" ? { avoidDuplicates: input.avoidDuplicates } : {}),
    };
    const payload = {
      ...(input.itemId ? { itemId: input.itemId } : {}),
      ...(Object.keys(options).length > 0 ? { options } : {}),
    };

    return this.requestWithApiKey("create connect token", "/connect_token", {
      method: "POST",
      body: JSON.stringify(payload),
    }, connectTokenResponseSchema);
  }

  getItem(itemId: string): Promise<PluggyResource> {
    return this.requestWithApiKey("get item", `/items/${encodeURIComponent(itemId)}`, undefined, resourceSchema);
  }

  listAccounts(itemId: string): Promise<PluggyResourceList> {
    return this.listResource("list accounts", "/accounts", { itemId });
  }

  listInvestments(itemId: string): Promise<PluggyResourceList> {
    return this.listResource("list investments", "/investments", { itemId, pageSize: "500", page: "1" });
  }

  getIdentity(itemId: string): Promise<PluggyResource> {
    return this.requestWithApiKey("get identity", `/identity?itemId=${encodeURIComponent(itemId)}`, undefined, resourceSchema);
  }

  listLoans(itemId: string): Promise<PluggyResourceList> {
    return this.listResource("list loans", "/loans", { itemId });
  }

  listTransactions(input: ListTransactionsInput): Promise<PluggyResourceList> {
    const query = new URLSearchParams({ accountId: input.accountId });
    if (input.after) query.set("after", input.after);
    if (input.dateFrom) query.set("dateFrom", input.dateFrom);
    if (input.dateTo) query.set("dateTo", input.dateTo);
    if (input.createdAtFrom) query.set("createdAtFrom", input.createdAtFrom);
    return this.requestWithApiKey("list transactions", `/v2/transactions?${query.toString()}`, undefined, resourceListSchema).then((value) => ({
      results: value.results,
      next: value.next ?? null,
      ...(value.total === undefined ? {} : { total: value.total }),
    }));
  }

  private listResource(operation: string, path: string, queryParams: Record<string, string>): Promise<PluggyResourceList> {
    const query = new URLSearchParams(queryParams);
    return this.requestWithApiKey(operation, `${path}?${query.toString()}`, undefined, resourceListSchema).then((value) => ({
      results: value.results,
      next: value.next ?? null,
      ...(value.total === undefined ? {} : { total: value.total }),
    }));
  }

  private async requestWithApiKey<T>(operation: string, path: string, init: RequestInit | undefined, schema: z.ZodType<T>): Promise<T> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const apiKey = await this.getApiKey();
      const response = await this.request(operation, path, { ...init, headers: { ...(init?.headers ?? {}), "X-API-KEY": apiKey } });
      if (response.status === 401 && attempt === 0) {
        this.apiKeyCache = null;
        continue;
      }
      return this.parseResponse(operation, response, schema);
    }
    throw new PluggyApiError(operation, 401);
  }

  private async getApiKey(): Promise<string> {
    if (this.apiKeyCache && this.apiKeyCache.expiresAt > this.now()) {
      return this.apiKeyCache.value;
    }

    const response = await this.request("authenticate", "/auth", {
      method: "POST",
      body: JSON.stringify({ clientId: this.config.clientId, clientSecret: this.config.clientSecret }),
    });
    const payload = await this.parseResponse("authenticate", response, authResponseSchema);
    this.apiKeyCache = { value: payload.apiKey, expiresAt: this.now() + 90 * 60 * 1000 };
    return payload.apiKey;
  }

  private request(operation: string, path: string, init: RequestInit = {}): Promise<Response> {
    return this.fetchImpl(`${this.config.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    }).catch(() => {
      throw new PluggyApiError(operation, 0);
    });
  }

  private async parseResponse<T>(operation: string, response: Response, schema: z.ZodType<T>): Promise<T> {
    if (!response.ok) {
      throw new PluggyApiError(operation, response.status);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new PluggyResponseError(operation);
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new PluggyResponseError(operation);
    }
    return parsed.data;
  }
}
