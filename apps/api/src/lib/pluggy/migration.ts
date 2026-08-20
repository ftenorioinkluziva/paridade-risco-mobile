import { getPortfolioDualRead } from "@/lib/portfolio-dual-read";
import { buildMigrationReadiness } from "./migration-rules";
import { getPortfolioSourceMode, setPortfolioSourceMode } from "@/lib/portfolio-source";

const isEnabled = (value: string | undefined): boolean => value?.trim().toLowerCase() === "true";

export async function getPluggyMigrationReadiness(userId: string) {
  const dualRead = await getPortfolioDualRead(userId);
  const ignoreManualReconciliation = isEnabled(process.env.PLUGGY_IGNORE_MANUAL_RECONCILIATION);
  const currentMode = await getPortfolioSourceMode(userId);
  return buildMigrationReadiness({
    manual: dualRead.manual,
    pluggy: dualRead.pluggy,
    comparison: dualRead.comparison,
    currentMode,
    ignoreManualReconciliation,
  });
}

export class PluggyMigrationBlockedError extends Error {
  readonly readiness: Awaited<ReturnType<typeof getPluggyMigrationReadiness>>;

  constructor(readiness: Awaited<ReturnType<typeof getPluggyMigrationReadiness>>) {
    super("A ativação da fonte Pluggy está bloqueada pelo gate de prontidão");
    this.name = "PluggyMigrationBlockedError";
    this.readiness = readiness;
  }
}

export async function approvePluggySource(userId: string) {
  const readiness = await getPluggyMigrationReadiness(userId);
  if (!readiness.canSwitchToPluggy) {
    throw new PluggyMigrationBlockedError(readiness);
  }

  if (readiness.currentMode === "PLUGGY") {
    return readiness;
  }

  await setPortfolioSourceMode(userId, "PLUGGY");
  return getPluggyMigrationReadiness(userId);
}

export { buildMigrationReadiness } from "./migration-rules";
