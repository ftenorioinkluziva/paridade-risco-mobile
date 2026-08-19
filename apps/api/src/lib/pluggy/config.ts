export type PluggyEnvironment = "sandbox" | "production";

export interface PluggyConfig {
  environment: PluggyEnvironment;
  apiBaseUrl: string;
  clientId: string;
  clientSecret: string;
  sandboxItemId: string | null;
  ignoreManualReconciliation: boolean;
}

export interface PluggyWebhookConfig {
  secret: string | null;
  header: string;
}

export class PluggyConfigurationError extends Error {
  readonly code = "PLUGGY_CONFIGURATION_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "PluggyConfigurationError";
  }
}

const asNonEmpty = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const isEnabled = (value: string | undefined): boolean => value?.trim().toLowerCase() === "true";

export function readPluggyConfig(env: Readonly<Record<string, string | undefined>> = process.env): PluggyConfig {
  const environmentValue = asNonEmpty(env.PLUGGY_ENVIRONMENT) ?? "sandbox";
  if (environmentValue !== "sandbox" && environmentValue !== "production") {
    throw new PluggyConfigurationError("PLUGGY_ENVIRONMENT must be sandbox or production");
  }

  if (environmentValue === "production" && env.PLUGGY_ENABLE_PRODUCTION !== "true") {
    throw new PluggyConfigurationError("Production Pluggy access requires PLUGGY_ENABLE_PRODUCTION=true");
  }

  const ignoreManualReconciliation = isEnabled(env.PLUGGY_IGNORE_MANUAL_RECONCILIATION);
  if (environmentValue === "production" && ignoreManualReconciliation) {
    throw new PluggyConfigurationError("PLUGGY_IGNORE_MANUAL_RECONCILIATION is only allowed in sandbox");
  }

  const clientId = asNonEmpty(env.PLUGGY_CLIENT_ID);
  const clientSecret = asNonEmpty(env.PLUGGY_CLIENT_SECRET);
  if (!clientId || !clientSecret) {
    throw new PluggyConfigurationError("PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET are required");
  }

  return {
    environment: environmentValue,
    apiBaseUrl: (asNonEmpty(env.PLUGGY_API_BASE_URL) ?? "https://api.pluggy.ai").replace(/\/+$/, ""),
    clientId,
    clientSecret,
    sandboxItemId: asNonEmpty(env.PLUGGY_SANDBOX_ITEM_ID),
    ignoreManualReconciliation,
  };
}

export class PluggyNotConfiguredError extends Error {
  readonly code = "PLUGGY_NOT_CONFIGURED";

  constructor(message = "Credenciais da Pluggy não foram configuradas no seu perfil") {
    super(message);
    this.name = "PluggyNotConfiguredError";
  }
}

export async function getUserPluggyConfig(
  userId: string,
  database?: any
): Promise<PluggyConfig> {
  const dbInstance = database ?? (await import("@/db/client")).db;
  const credentials = await dbInstance.query.userPluggyCredentials.findFirst({
    where: (table: any, { eq }: any) => eq(table.userId, userId),
  });

  if (!credentials || !credentials.clientId || !credentials.clientSecret || !credentials.itemId) {
    throw new PluggyNotConfiguredError();
  }

  const env = process.env;
  const environmentValue = asNonEmpty(env.PLUGGY_ENVIRONMENT) ?? "sandbox";
  const apiBaseUrl = (asNonEmpty(env.PLUGGY_API_BASE_URL) ?? "https://api.pluggy.ai").replace(/\/+$/, "");

  return {
    environment: environmentValue === "production" ? "production" : "sandbox",
    apiBaseUrl,
    clientId: credentials.clientId.trim(),
    clientSecret: credentials.clientSecret.trim(),
    sandboxItemId: credentials.itemId.trim(),
    ignoreManualReconciliation: isEnabled(env.PLUGGY_IGNORE_MANUAL_RECONCILIATION),
  };
}

export function readPluggyWebhookConfig(env: Readonly<Record<string, string | undefined>> = process.env): PluggyWebhookConfig {
  return {
    secret: asNonEmpty(env.PLUGGY_WEBHOOK_SECRET),
    header: asNonEmpty(env.PLUGGY_WEBHOOK_HEADER)?.toLowerCase() ?? "x-pluggy-webhook-secret",
  };
}

