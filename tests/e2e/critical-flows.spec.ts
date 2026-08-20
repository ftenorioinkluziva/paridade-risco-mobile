import { expect, test, type APIResponse, type TestInfo } from "@playwright/test";
import { createHmac, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const strategicTickers = [
  "B5P211",
  "BOVA11",
  "DOLA11",
  "FIXA11",
  "IB5M11",
  "IMAB11",
  "IRFM11",
  "LFTS11",
  "SMAL11",
  "SPXI11",
  "XFIX11",
];

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the critical E2E suite`);
  return value;
}

function projectSlug(testInfo: TestInfo) {
  return testInfo.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

function expectStatus(response: APIResponse, status: number) {
  expect(response.status(), `${response.url()} returned ${response.status()}`).toBe(status);
}

function telegramHeaders(pathname: string, chatId: string, options: { scope?: string; nonce?: string; secret?: string } = {}) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = options.nonce ?? randomBytes(18).toString("base64url");
  const scope = options.scope ?? "profile:read";
  const secret = options.secret ?? requiredEnvironment("E2E_TELEGRAM_S2S_SECRET");
  const payload = ["GET", pathname, chatId, timestamp, nonce, scope].join("\n");
  return {
    "x-paridade-consumer": "telegram",
    "x-telegram-chat-id": chatId,
    "x-telegram-timestamp": timestamp,
    "x-telegram-nonce": nonce,
    "x-telegram-scope": scope,
    "x-telegram-signature": `v1=${createHmac("sha256", secret).update(payload).digest("hex")}`,
  };
}

test("anonymous redirect, invalid and valid login, then logout", async ({ page }, testInfo) => {
  const namespace = requiredEnvironment("E2E_NAMESPACE");
  const email = `e2e+${namespace}-auth-${projectSlug(testInfo)}@paridaderisco.invalid`;
  const password = requiredEnvironment("E2E_USER_PASSWORD");
  const authenticatedCookies = await page.context().cookies();

  await page.context().clearCookies();
  await page.goto("/investimentos");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(email);
  const exercisesInteractiveLogin = testInfo.project.name.includes("desktop") && testInfo.repeatEachIndex === 0;
  if (exercisesInteractiveLogin) {
    await page.getByLabel("Senha").fill(`${password}-invalid`);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Não foi possível entrar", { exact: true })).toBeVisible();

    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
  } else {
    await page.context().addCookies(authenticatedCookies);
    await page.goto("/");
  }
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Resumo" })).toBeVisible();

  if (testInfo.project.name.includes("mobile")) {
    await page.getByRole("button", { name: "Menu" }).click();
  }
  if (exercisesInteractiveLogin) {
    await page.getByRole("button", { name: "Sair" }).first().click();
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("signup and password recovery log delivery", async ({ page }, testInfo) => {
  const namespace = requiredEnvironment("E2E_NAMESPACE");
  const password = requiredEnvironment("E2E_USER_PASSWORD");
  const signupEmail = `e2e+${namespace}-${projectSlug(testInfo)}-repeat${testInfo.repeatEachIndex}@paridaderisco.invalid`;
  const exercisesAuthMutation = testInfo.project.name.includes("desktop") && testInfo.repeatEachIndex === 0;

  await page.context().clearCookies();
  await page.goto("/signup");
  if (!exercisesAuthMutation) {
    await expect(page.getByLabel("Nome")).toBeVisible();
    await expect(page.getByLabel("Confirmar Senha")).toBeVisible();
    await page.goto("/reset-password");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar Link" })).toBeVisible();
    return;
  }

  await page.getByLabel("Nome").fill(`E2E ${projectSlug(testInfo)}`);
  await page.getByLabel("Email").fill(signupEmail);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByLabel("Confirmar Senha").fill(password);
  await page.getByRole("button", { name: "Criar Conta" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Resumo" })).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/reset-password");
  await page.getByLabel("Email").fill(requiredEnvironment("E2E_USER_EMAIL"));
  const recoveryResponsePromise = page.waitForResponse((response) => response.url().includes("/api/auth/request-password-reset"));
  await page.getByRole("button", { name: "Enviar Link" }).click();
  const recoveryResponse = await recoveryResponsePromise;
  expect(recoveryResponse.status(), `password recovery returned ${recoveryResponse.status()}`).toBe(200);
  await expect(page.getByText("Email enviado", { exact: true })).toBeVisible();
});

test("profile, active basket and role escalation protection", async ({ request }) => {
  const profileResponse = await request.get("/api/profile");
  expectStatus(profileResponse, 200);
  const profile = await profileResponse.json();
  expect(profile).toMatchObject({ role: "user", phone: "+5511999999999" });

  const escalationResponse = await request.put("/api/profile", { data: { role: "admin" } });
  expectStatus(escalationResponse, 400);
  const profileAfterEscalation = await (await request.get("/api/profile")).json();
  expect(profileAfterEscalation.role).toBe("user");

  const activeResponse = await request.get("/api/baskets/active");
  expectStatus(activeResponse, 200);
  const activeBasket = await activeResponse.json();
  const basketResponse = await request.get(`/api/baskets/${activeBasket.id}`);
  expectStatus(basketResponse, 200);
  const basket = await basketResponse.json();
  const tickers = basket.allocations.map((allocation: { ticker: string }) => allocation.ticker).sort();
  expect(tickers).toEqual([...strategicTickers].sort());
  expect(tickers).not.toContain("BOVV11");
});

test("temporary fund and transaction APIs support create, read, update and cleanup", async ({ request }, testInfo) => {
  const slug = `${projectSlug(testInfo)}-repeat${testInfo.repeatEachIndex}`;
  let fundId: string | undefined;
  let transactionId: string | undefined;

  try {
    const fundResponse = await request.post("/api/funds", {
      headers: { "idempotency-key": `e2e-${slug}-fund` },
      data: {
        currentValue: 1100,
        initialInvestment: 1000,
        investmentDate: "2026-08-20T12:00:00.000Z",
        name: `Fundo E2E ${slug}`,
      },
    });
    expectStatus(fundResponse, 200);
    fundId = (await fundResponse.json()).id;

    const fundRead = await request.get(`/api/funds/${fundId}`);
    expectStatus(fundRead, 200);
    expect(await fundRead.json()).toMatchObject({ id: fundId, currentValue: 1100 });

    const fundUpdate = await request.put(`/api/funds/${fundId}`, {
      data: { currentValue: 1200, name: `Fundo E2E atualizado ${slug}` },
    });
    expectStatus(fundUpdate, 200);
    expect(await fundUpdate.json()).toMatchObject({ id: fundId, currentValue: 1200 });

    const transactionResponse = await request.post("/api/transactions", {
      headers: { "idempotency-key": `e2e-${slug}-transaction` },
      data: {
        assetTicker: "BOVA11",
        type: "COMPRA",
        shares: 2,
        pricePerShare: 100,
        tradedAt: "2026-08-20T13:00:00.000Z",
      },
    });
    expectStatus(transactionResponse, 200);
    transactionId = (await transactionResponse.json()).id;

    const transactionRead = await request.get(`/api/transactions/${transactionId}`);
    expectStatus(transactionRead, 200);
    expect(await transactionRead.json()).toMatchObject({ id: transactionId, assetTicker: "BOVA11", shares: 2 });

    const transactionUpdate = await request.put(`/api/transactions/${transactionId}`, {
      data: { assetTicker: "IMAB11", pricePerShare: 105, shares: 3 },
    });
    expectStatus(transactionUpdate, 200);
    expect(await transactionUpdate.json()).toMatchObject({ id: transactionId, assetTicker: "IMAB11", shares: 3 });
  } finally {
    if (transactionId) {
      const deleted = await request.delete(`/api/transactions/${transactionId}`);
      expectStatus(deleted, 200);
      transactionId = undefined;
    }
    if (fundId) {
      const deleted = await request.delete(`/api/funds/${fundId}`);
      expectStatus(deleted, 200);
      fundId = undefined;
    }
  }
});

test("investments, quotes and rebalance use exactly the 11 strategic ETFs", async ({ page, request }) => {
  await page.goto("/investimentos");
  await expect(page.getByRole("heading", { name: "Investimentos" })).toBeVisible();

  const pricesResponse = await request.get("/api/assets/prices?source=MARKET_DATA");
  expectStatus(pricesResponse, 200);
  const prices = await pricesResponse.json();
  const tickers = prices.map((price: { ticker: string }) => price.ticker).sort();
  expect(tickers).toEqual([...strategicTickers].sort());
  expect(tickers).not.toContain("BOVV11");

  await page.goto("/cotacoes");
  await expect(page.getByRole("heading", { name: "Cotações" })).toBeVisible();
  await expect(page.getByText("8 min · fechamento 17:30", { exact: true })).toBeVisible();
  await expect(page.getByText("BOVV11", { exact: true })).toHaveCount(0);

  const rebalanceResponse = await request.get("/api/rebalance/preview");
  expectStatus(rebalanceResponse, 200);
  const rebalance = await rebalanceResponse.json();
  expect(rebalance.eligibleForRebalance).toBe(true);
  expect(rebalance.actions).toHaveLength(11);
});

test("Pluggy source activation moves from blocked to ready using the deterministic mock", async ({ request }) => {
  await request.delete("/api/profile/pluggy");

  const canonicalReadiness = await request.get("/api/integrations/pluggy/source-activation-readiness");
  expectStatus(canonicalReadiness, 200);
  const canonicalReadinessBody = await canonicalReadiness.json();
  expect(canonicalReadinessBody).toMatchObject({
    source: "PLUGGY",
    status: "BLOCKED",
    canActivatePluggy: false,
  });

  const legacyReadiness = await request.get("/api/integrations/pluggy/migration-readiness");
  expectStatus(legacyReadiness, 200);
  expect(legacyReadiness.headers()["deprecation"]).toBe("true");
  expect(legacyReadiness.headers()["sunset"]).toContain("01 Nov 2026");
  expect(await legacyReadiness.json()).toMatchObject({
    status: canonicalReadinessBody.status,
    canActivatePluggy: canonicalReadinessBody.canActivatePluggy,
    canSwitchToPluggy: canonicalReadinessBody.canSwitchToPluggy,
  });

  const blockedActivation = await request.post("/api/integrations/pluggy/source-activation");
  expectStatus(blockedActivation, 409);
  const legacyBlockedActivation = await request.post("/api/integrations/pluggy/migration");
  expectStatus(legacyBlockedActivation, 409);
  expect(legacyBlockedActivation.headers()["deprecation"]).toBe("true");

  const blockedProfile = await request.get("/api/profile/pluggy");
  expectStatus(blockedProfile, 200);
  expect(await blockedProfile.json()).toMatchObject({ isConfigured: false, hasSecret: false });

  const blockedSync = await request.post("/api/integrations/pluggy/sync");
  expectStatus(blockedSync, 400);
  expect(await blockedSync.json()).toMatchObject({ code: "PLUGGY_NOT_CONFIGURED" });

  try {
    const readyResponse = await request.put("/api/profile/pluggy", {
      data: { clientId: "e2e-client", clientSecret: "e2e-client-secret", itemId: "e2e-item" },
    });
    expectStatus(readyResponse, 200);
    const ready = await readyResponse.json();
    expect(ready).toMatchObject({ isConfigured: true, hasSecret: true, itemId: "e2e-item" });
    expect(ready.secretMasked).not.toContain("e2e-client-secret");

    const connectionTest = await request.post("/api/profile/pluggy/test", {
      data: { clientId: "e2e-client", itemId: "e2e-item" },
    });
    expectStatus(connectionTest, 200);
    expect(await connectionTest.json()).toMatchObject({
      success: true,
      connectorName: "E2E Bank",
      status: "UPDATED",
    });
  } finally {
    const deleted = await request.delete("/api/profile/pluggy");
    expectStatus(deleted, 200);
  }
});

test("CLI key is provisioned, enforces scope, rotates and becomes invalid after revocation", async ({ request }) => {
  let keyId: string | undefined;
  const origin = requiredEnvironment("E2E_BASE_URL");
  const cliConfigDir = mkdtempSync(path.join(tmpdir(), "paridade-cli-e2e-"));
  const cliConfigPath = path.join(cliConfigDir, "config.json");

  function cli(args: string[], apiKey?: string) {
    return spawnSync(process.execPath, [path.resolve("packages/cli/src/index.mjs"), ...args], {
      cwd: path.resolve("."),
      env: {
        ...process.env,
        PARIDADE_API_URL: origin,
        PARIDADE_CONFIG_PATH: cliConfigPath,
        PARIDADE_CLI_LEGACY_SESSION_ENABLED: "false",
        ...(apiKey ? { PARIDADE_API_KEY: apiKey } : {}),
      },
      encoding: "utf8",
      shell: false,
    });
  }

  try {
    const crossOriginResponse = await request.post("/api/auth/mcp-token", {
      headers: { origin: "https://attacker.invalid" },
      data: { name: "Rejected cross-origin", permissions: ["read"] },
    });
    expectStatus(crossOriginResponse, 403);

    const createResponse = await request.post("/api/auth/mcp-token", {
      headers: { origin },
      data: {
        name: "E2E CLI",
        permissions: ["read", "sync"],
      },
    });
    expectStatus(createResponse, 200);
    const created = await createResponse.json();
    keyId = created.id;
    const token = created.key as string;
    expect(token.startsWith("pr_mcp_")).toBe(true);

    const configured = cli(["auth", "configure"], token);
    expect(configured.status, configured.stderr).toBe(0);
    expect(configured.stdout).not.toContain(token);

    const cliRead = cli(["list-assets"]);
    expect(cliRead.status, cliRead.stderr).toBe(0);
    expect(cliRead.stdout).toContain("BOVA11");
    expect(cliRead.stdout).not.toContain(token);

    const readResponse = await request.get("/api/profile", {
      headers: { authorization: `Bearer ${token}` },
    });
    expectStatus(readResponse, 200);

    const outOfScopeResponse = await request.get("/api/auth/mcp-token/validate?permission=mapping", {
      headers: { authorization: `Bearer ${token}` },
    });
    expectStatus(outOfScopeResponse, 403);
    expect(await outOfScopeResponse.json()).toMatchObject({ error: { code: "API_KEY_INSUFFICIENT_SCOPE" } });

    const revokeResponse = await request.post("/api/auth/api-key/delete", {
      headers: { origin },
      data: { configId: "mcp", keyId },
    });
    expectStatus(revokeResponse, 200);
    keyId = undefined;

    const revokedResponse = await request.get("/api/auth/mcp-token/validate", {
      headers: { authorization: `Bearer ${token}` },
    });
    expectStatus(revokedResponse, 401);

    const revokedStatus = cli(["auth", "status"]);
    expect(revokedStatus.status).toBe(1);
    expect(revokedStatus.stderr).toContain("API_KEY_REVOKED");
    expect(revokedStatus.stderr).not.toContain(token);

    const replacementResponse = await request.post("/api/auth/mcp-token", {
      headers: { origin },
      data: { name: "E2E CLI rotated", permissions: ["read", "sync"] },
    });
    expectStatus(replacementResponse, 200);
    const replacement = await replacementResponse.json();
    keyId = replacement.id;
    const reconfigured = cli(["auth", "configure"], replacement.key);
    expect(reconfigured.status, reconfigured.stderr).toBe(0);
    const validStatus = cli(["auth", "status"]);
    expect(validStatus.status, validStatus.stderr).toBe(0);
    expect(validStatus.stdout).toContain('"configured": true');
  } finally {
    if (keyId) {
      await request.post("/api/auth/api-key/delete", {
        headers: { origin },
        data: { configId: "mcp", keyId },
      });
    }
    rmSync(cliConfigDir, { recursive: true, force: true });
  }
});

test("Telegram uses signed scoped requests without issuing a durable web session", async ({ request }, testInfo) => {
  const chatId = testInfo.project.name.includes("mobile") ? "900000002" : "900000001";
  const originalProfileResponse = await request.get("/api/profile");
  expectStatus(originalProfileResponse, 200);
  const originalProfile = await originalProfileResponse.json();
  const mutableProfile = {
    birthDate: originalProfile.birthDate,
    image: originalProfile.image,
    phone: originalProfile.phone,
  };
  expectStatus(await request.put("/api/profile", { data: { ...mutableProfile, telegramChatId: chatId } }), 200);

  const legacy = await request.get(`/api/auth/token-by-telegram?chat_id=${chatId}`);
  expectStatus(legacy, 410);
  expect(await legacy.json()).not.toHaveProperty("token");

  const validHeaders = telegramHeaders("/api/profile", chatId);
  expectStatus(await request.get("/api/profile", { headers: validHeaders }), 200);
  expectStatus(await request.get("/api/profile", { headers: validHeaders }), 401);
  expectStatus(await request.get("/api/profile", {
    headers: telegramHeaders("/api/profile", chatId, { secret: "invalid-telegram-s2s-secret-with-32-characters" }),
  }), 401);
  expectStatus(await request.get("/api/profile", {
    headers: telegramHeaders("/api/profile", chatId, { scope: "portfolio:read" }),
  }), 401);
  expectStatus(await request.get("/api/profile", {
    headers: telegramHeaders("/api/profile", "999999999"),
  }), 401);

  expectStatus(await request.put("/api/profile", { data: { ...mutableProfile, telegramChatId: originalProfile.telegramChatId } }), 200);
});
