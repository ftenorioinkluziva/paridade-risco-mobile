import { getPortfolioDualRead } from "@/lib/portfolio-dual-read";
import { buildSourceActivationReadiness } from "./source-activation-rules";
import { getPortfolioSourceMode, setPortfolioSourceMode } from "@/lib/portfolio-source";

const isEnabled = (value: string | undefined): boolean => value?.trim().toLowerCase() === "true";

function logSourceActivation(event: "readiness" | "approval", fields: Record<string, unknown>) {
  console.info(`[pluggy-source-activation] ${JSON.stringify({ event, ...fields })}`);
}

export async function getPluggySourceActivationReadiness(userId: string) {
  const dualRead = await getPortfolioDualRead(userId);
  const ignoreManualReconciliation = isEnabled(process.env.PLUGGY_IGNORE_MANUAL_RECONCILIATION);
  const currentMode = await getPortfolioSourceMode(userId);
  const readiness = buildSourceActivationReadiness({
    manual: dualRead.manual,
    pluggy: dualRead.pluggy,
    comparison: dualRead.comparison,
    currentMode,
    ignoreManualReconciliation,
  });
  logSourceActivation("readiness", {
    status: readiness.status,
    currentSource: readiness.currentMode,
    candidateSource: readiness.candidateMode,
    canActivate: readiness.canActivatePluggy,
    blockerCount: readiness.blockers.length,
  });
  return readiness;
}

export class PluggySourceActivationBlockedError extends Error {
  readonly readiness: Awaited<ReturnType<typeof getPluggySourceActivationReadiness>>;

  constructor(readiness: Awaited<ReturnType<typeof getPluggySourceActivationReadiness>>) {
    super("A ativação da fonte Pluggy está bloqueada pelo gate de prontidão");
    this.name = "PluggySourceActivationBlockedError";
    this.readiness = readiness;
  }
}

export async function approvePluggySourceActivation(userId: string) {
  const readiness = await getPluggySourceActivationReadiness(userId);
  if (!readiness.canActivatePluggy) {
    logSourceActivation("approval", { outcome: "blocked", status: readiness.status, activeSource: readiness.currentMode });
    throw new PluggySourceActivationBlockedError(readiness);
  }

  if (readiness.currentMode === "PLUGGY") {
    logSourceActivation("approval", { outcome: "already_active", status: readiness.status, activeSource: "PLUGGY" });
    return readiness;
  }

  await setPortfolioSourceMode(userId, "PLUGGY");
  const activated = await getPluggySourceActivationReadiness(userId);
  logSourceActivation("approval", { outcome: "activated", status: activated.status, activeSource: activated.currentMode });
  return activated;
}

export { buildSourceActivationReadiness } from "./source-activation-rules";
