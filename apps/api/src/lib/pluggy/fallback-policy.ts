export function isPluggyFallbackDue(input: {
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  now?: Date;
  intervalMinutes?: number;
}): boolean {
  if (input.lastSyncStatus !== "SUCCEEDED" || !input.lastSyncAt) return true;
  const intervalMinutes = input.intervalMinutes ?? 30;
  return input.now ? input.now.getTime() - input.lastSyncAt.getTime() >= intervalMinutes * 60_000 : true;
}
