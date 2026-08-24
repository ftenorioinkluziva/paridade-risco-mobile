#!/usr/bin/env node

import { readFileSync } from "node:fs";

const input = process.stdin.isTTY ? readFileSync(0, "utf8") : await readStdin();
const counts = new Map();
let parsed = 0;
let ignored = 0;

for (const line of input.split(/\r?\n/)) {
  const match = line.match(/\{.*\}\s*$/);
  if (!match) continue;
  try {
    const event = JSON.parse(match[0]);
    const normalized = normalizeEvent(event);
    if (!normalized) {
      ignored += 1;
      continue;
    }
    parsed += 1;
    const key = [normalized.event, normalized.consumer, normalized.outcome, normalized.route].join("|");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  } catch {
    ignored += 1;
  }
}

const rows = [...counts.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, count]) => {
  const [event, consumer, outcome, route] = key.split("|");
  return { event, consumer, outcome, route, count };
});

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: "sanitized-log-stream",
  parsedEvents: parsed,
  ignoredLines: ignored,
  rows,
  decision: parsed > 0 ? "REVIEW_REQUIRED" : "INSUFFICIENT_EVIDENCE",
}, null, 2));

function normalizeEvent(event) {
  const allowed = new Set(["telegram_s2s_auth", "legacy_session_auth", "telegram_legacy_token_endpoint"]);
  if (!allowed.has(event.event)) return null;
  const consumer = event.consumer === "telegram" ? "telegram" : event.event.startsWith("telegram_") ? "telegram" : "unknown";
  const outcome = typeof event.outcome === "string" ? event.outcome : "unknown";
  const route = typeof event.path === "string" ? routeTemplate(event.path) : "none";
  return { event: event.event, consumer, outcome, route };
}

function routeTemplate(path) {
  try {
    const pathname = new URL(path, "https://audit.invalid").pathname;
    return pathname.replace(/\/[0-9]+(?=\/|$)/g, "/:id");
  } catch {
    return "invalid";
  }
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data;
}
