import { and, eq, gt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { idempotencyRecords } from "@/db/schema";
import { operationErrorResponse } from "@/lib/operation-response";
import { IDEMPOTENCY_KEY_PATTERN, IDEMPOTENCY_RETENTION_DAYS, hashIdempotencyPayload } from "@/lib/idempotency-core";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type WriteResult = { body: unknown; status: number };

export async function executeIdempotentWrite(options: {
  request: Request;
  userId: string;
  operation: string;
  payload: unknown;
  write: (tx: Transaction) => Promise<WriteResult>;
}) {
  const key = options.request.headers.get("idempotency-key")?.trim();
  if (!key) {
    const result = await db.transaction(options.write);
    return NextResponse.json(result.body, { status: result.status });
  }
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    return operationErrorResponse({
      code: "INVALID_IDEMPOTENCY_KEY", category: "validation",
      message: "Idempotency-Key must contain 1-128 safe ASCII characters", retryable: false,
    }, 400);
  }

  const requestHash = hashIdempotencyPayload(options.payload);
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${options.userId}:${options.operation}:${key}`}, 0))`);
    const existing = await tx.query.idempotencyRecords.findFirst({
      where: and(
        eq(idempotencyRecords.userId, options.userId),
        eq(idempotencyRecords.operation, options.operation),
        eq(idempotencyRecords.key, key),
        gt(idempotencyRecords.expiresAt, new Date()),
      ),
    });
    if (existing) {
      if (existing.requestHash !== requestHash) return { conflict: true as const };
      return { body: existing.responseBody, status: existing.responseStatus };
    }

    const writeResult = await options.write(tx);
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_RETENTION_DAYS * 86_400_000);
    await tx.insert(idempotencyRecords).values({
      userId: options.userId, operation: options.operation, key,
      requestHash, responseBody: writeResult.body, responseStatus: writeResult.status, expiresAt,
    }).onConflictDoUpdate({
      target: [idempotencyRecords.userId, idempotencyRecords.operation, idempotencyRecords.key],
      set: { requestHash, responseBody: writeResult.body, responseStatus: writeResult.status, expiresAt },
    });
    return writeResult;
  });

  if ("conflict" in result) {
    return operationErrorResponse({
      code: "IDEMPOTENCY_PAYLOAD_CONFLICT", category: "conflict",
      message: "Idempotency-Key was already used with a different payload", retryable: false,
    }, 409);
  }
  return NextResponse.json(result.body, { status: result.status });
}
