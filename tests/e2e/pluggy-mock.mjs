import { createServer } from "node:http";

const port = 4010;

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
  if (request.method === "GET" && url.pathname === "/items/e2e-item") {
    return send(response, 200, {
      id: "e2e-item",
      status: "UPDATED",
      connector: { name: "E2E Bank" },
    });
  }

  return send(response, 404, { error: "E2E Pluggy route not found" });
}).listen(port, "0.0.0.0", () => {
  console.log(`[pluggy-mock] ready on ${port}`);
});
