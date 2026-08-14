export type PluggyFreshnessStatus = "FRESH" | "STALE" | "UNAVAILABLE";

export function buildPluggyFreshness(input: {
  latestObservedAt: Date | null;
  latestSyncAt: Date | null;
  latestSyncStatus: string | null;
  now?: Date;
  staleAfterMinutes?: number;
}) {
  const staleAfterMinutes = input.staleAfterMinutes ?? 120;
  const now = input.now ?? new Date();
  const ageMinutes = input.latestSyncAt === null
    ? null
    : Math.max(0, (now.getTime() - input.latestSyncAt.getTime()) / 60_000);
  const status: PluggyFreshnessStatus = input.latestSyncAt === null
    ? "UNAVAILABLE"
    : input.latestSyncStatus !== "SUCCEEDED" || (ageMinutes ?? Infinity) > staleAfterMinutes
      ? "STALE"
      : "FRESH";

  return {
    status,
    latestObservedAt: input.latestObservedAt?.toISOString() ?? null,
    latestSyncAt: input.latestSyncAt?.toISOString() ?? null,
    latestSyncStatus: input.latestSyncStatus,
    ageMinutes,
    staleAfterMinutes,
  };
}
