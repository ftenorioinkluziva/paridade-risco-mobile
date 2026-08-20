import { expect, test } from "@playwright/test";

test("authenticated shell loads with the configured viewport", async ({ page, request }, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Resumo" })).toBeVisible();
  if (testInfo.project.name.includes("mobile")) {
    const mobileMenu = page.getByRole("button", { name: "Menu" });
    await expect(mobileMenu).toBeVisible();
    await mobileMenu.click();
  }
  await expect(page.getByRole("button", { name: "Sair" }).first()).toBeVisible();
  expect(page.viewportSize()).toEqual(testInfo.project.use.viewport);

  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  const healthBody = await health.json();
  expect(healthBody).toMatchObject({ ok: true, service: "paridade-risco-api" });
});
