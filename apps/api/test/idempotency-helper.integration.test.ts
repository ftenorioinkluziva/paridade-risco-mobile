import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test, { after, before } from "node:test";

import postgres from "postgres";
import { sql } from "drizzle-orm";

const suffix = `${process.pid}-${Date.now()}`;
const forwarder = `qa-idempotency-${process.pid}`;
let port: string;
let client: ReturnType<typeof postgres>;
let executeIdempotentWrite: typeof import("../src/lib/idempotency").executeIdempotentWrite;
let userA: string;
let userB: string;

before(async () => {
  execFileSync("docker", ["run", "-d", "--rm", "--name", forwarder, "--network", "paridade-risco-mobile_paridade-risco-network", "-p", "127.0.0.1::5432", "alpine/socat", "tcp-listen:5432,fork,reuseaddr", "tcp-connect:postgres:5432"]);
  port = execFileSync("docker", ["port", forwarder, "5432/tcp"], { encoding: "utf8" }).trim().split(":").at(-1)!;
  process.env.DATABASE_URL = `postgresql://paridade:paridade@127.0.0.1:${port}/paridade`;
  client = postgres(process.env.DATABASE_URL, { max: 5 });
  userA = `qa-helper-a-${suffix}`; userB = `qa-helper-b-${suffix}`;
  await client`INSERT INTO users(id,name,email,password_hash) VALUES (${userA},'QA',${`${userA}@test.local`},'x'),(${userB},'QA',${`${userB}@test.local`},'x')`;
  await client`CREATE TABLE IF NOT EXISTS qa_idempotency_writes(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,user_id text NOT NULL,operation text NOT NULL,marker text NOT NULL)`;
  ({ executeIdempotentWrite } = await import("../src/lib/idempotency"));
});

after(async () => {
  if (client) {
    await client`DELETE FROM idempotency_records WHERE user_id IN (${userA},${userB})`;
    await client`DELETE FROM qa_idempotency_writes WHERE user_id IN (${userA},${userB})`;
    await client`DELETE FROM users WHERE id IN (${userA},${userB})`;
    await client.end();
  }
  try { execFileSync("docker", ["rm", "-f", forwarder]); } catch { /* already removed */ }
});

function request(key?: string) {
  return new Request("http://localhost/api/test", { method: "POST", headers: key ? { "Idempotency-Key": key } : {} });
}

async function invoke({ userId = userA, operation, key, payload = { amount: 10 } }: { userId?: string; operation: string; key?: string; payload?: unknown }) {
  let calls = 0;
  const response = await executeIdempotentWrite({ request: request(key), userId, operation, payload, write: async (tx) => {
    calls++;
    await tx.execute(sql`INSERT INTO qa_idempotency_writes(user_id,operation,marker) VALUES(${userId},${operation},${key ?? "without-key"})`);
    return { body: { operation, accepted: true }, status: 201 };
  }});
  return { response, calls, body: await response.json() };
}

for (const operation of ["transactions.create", "funds.create", "baskets.create"]) {
  test(`${operation}: sequential retries return equivalent responses and one write`, async () => {
    const key = `seq-${operation}-${suffix}`;
    const first = await invoke({ operation, key }); const retry = await invoke({ operation, key });
    assert.equal(first.response.status, 201); assert.equal(retry.response.status, 201);
    assert.deepEqual(retry.body, first.body); assert.equal(first.calls, 1); assert.equal(retry.calls, 0);
    assert.equal((await client`SELECT count(*)::int AS count FROM qa_idempotency_writes WHERE marker=${key}`)[0].count, 1);
  });

  test(`${operation}: concurrent retries execute the real callback once`, async () => {
    const key = `con-${operation}-${suffix}`;
    const results = await Promise.all([invoke({ operation, key }), invoke({ operation, key })]);
    assert.deepEqual(results[0].body, results[1].body);
    assert.equal(results[0].calls + results[1].calls, 1);
    assert.equal((await client`SELECT count(*)::int AS count FROM qa_idempotency_writes WHERE marker=${key}`)[0].count, 1);
  });
}

test("different payload returns canonical HTTP 409 and does not write", async () => {
  const operation = "transactions.create"; const key = `conflict-${suffix}`;
  await invoke({ operation, key, payload: { amount: 10 } });
  const conflict = await invoke({ operation, key, payload: { amount: 11 } });
  assert.equal(conflict.response.status, 409); assert.equal(conflict.calls, 0);
  assert.equal(conflict.body.error.code, "IDEMPOTENCY_PAYLOAD_CONFLICT");
  assert.equal((await client`SELECT count(*)::int AS count FROM qa_idempotency_writes WHERE marker=${key}`)[0].count, 1);
});

test("same key is isolated by user and operation", async () => {
  const key = `scope-${suffix}`;
  await invoke({ userId: userA, operation: "transactions.create", key });
  await invoke({ userId: userB, operation: "transactions.create", key });
  await invoke({ userId: userA, operation: "funds.create", key });
  assert.equal((await client`SELECT count(*)::int AS count FROM qa_idempotency_writes WHERE marker=${key}`)[0].count, 3);
});

test("without a key both calls traverse the legacy callback", async () => {
  const first = await invoke({ operation: "funds.create" }); const second = await invoke({ operation: "funds.create" });
  assert.equal(first.calls, 1); assert.equal(second.calls, 1);
});

test("expired record permits key reuse according to retention policy", async () => {
  const operation = "baskets.create"; const key = `expired-${suffix}`;
  await invoke({ operation, key });
  await client`UPDATE idempotency_records SET expires_at=now()-interval '1 second' WHERE user_id=${userA} AND operation=${operation} AND key=${key}`;
  const reused = await invoke({ operation, key, payload: { amount: 99 } });
  assert.equal(reused.response.status, 201); assert.equal(reused.calls, 1);
  assert.equal((await client`SELECT count(*)::int AS count FROM qa_idempotency_writes WHERE marker=${key}`)[0].count, 2);
});

test("callback failure rolls back both business write and idempotency record", async () => {
  const operation = "transactions.create"; const key = `rollback-${suffix}`;
  await assert.rejects(executeIdempotentWrite({ request: request(key), userId: userA, operation, payload: {}, write: async (tx) => {
    await tx.execute(sql`INSERT INTO qa_idempotency_writes(user_id,operation,marker) VALUES(${userA},${operation},${key})`);
    throw new Error("forced rollback");
  }}));
  assert.equal((await client`SELECT count(*)::int AS count FROM qa_idempotency_writes WHERE marker=${key}`)[0].count, 0);
  assert.equal((await client`SELECT count(*)::int AS count FROM idempotency_records WHERE key=${key}`)[0].count, 0);
});
