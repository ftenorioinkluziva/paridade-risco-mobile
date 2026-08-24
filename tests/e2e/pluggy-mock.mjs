import { createServer } from "node:http";

const port = 4010;
const attemptsByItem = new Map();

function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "pluggy-mock"}`);

  if (request.method === "GET" && url.pathname === "/health") {
    return send(response, 200, { ok: true });
  }
  if (request.method === "POST" && url.pathname === "/auth") {
    return send(response, 200, { apiKey: "e2e-pluggy-api-key" });
  }
  if (request.method === "GET" && url.pathname.startsWith("/items/e2e-")) {
    const itemId = decodeURIComponent(url.pathname.slice("/items/".length));
    return send(response, 200, {
      id: itemId,
      status: "UPDATED",
      connector: { name: "E2E Bank" },
    });
  }
  if (request.method === "GET" && url.pathname === "/accounts") {
    const itemId = url.searchParams.get("itemId") ?? "e2e-item";
    return send(response, 200, {
      results: [{
        id: `${itemId}-account`,
        type: "BANK",
        subtype: "CHECKING_ACCOUNT",
        name: "Conta E2E recuperada",
        balance: 900,
        currencyCode: "BRL",
        status: "ACTIVE",
      }],
      next: null,
    });
  }
  if (request.method === "GET" && url.pathname === "/investments") {
    const itemId = url.searchParams.get("itemId") ?? "e2e-item";
    const attempts = attemptsByItem.get(itemId) ?? 0;
    attemptsByItem.set(itemId, attempts + 1);
    if (itemId === "e2e-recoverable" && attempts === 0) {
      return send(response, 502, { error: "recoverable fixture failure" });
    }
    return send(response, 200, {
      results: [{
        id: `${itemId}-investment-0`,
        code: "BOVA11",
        name: "ETF Ibovespa E2E",
        type: "EQUITY",
        quantity: 10,
        balance: 1010,
        amountOriginal: 1000,
        currencyCode: "BRL",
        status: "ACTIVE",
      }],
      next: null,
    });
  }
  if (request.method === "GET" && url.pathname === "/loans") {
    return send(response, 200, { results: [], next: null });
  }
  if (request.method === "GET" && url.pathname === "/v2/transactions") {
    return send(response, 200, { results: [], next: null });
  }

  return send(response, 404, { error: "E2E Pluggy route not found" });
}).listen(port, "0.0.0.0", () => {
  console.log(`[pluggy-mock] ready on ${port}`);
});
