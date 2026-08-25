import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import path from "node:path";

function loadFirstContributionScenario() {
  const projectName = process.env.E2E_COMPOSE_PROJECT_NAME;
  if (!projectName) throw new Error("E2E_COMPOSE_PROJECT_NAME is required for responsive guidance coverage");
  const result = spawnSync("docker", [
    "compose", "-f", "docker-compose.e2e.yml", "-p", projectName,
    "exec", "-T", "api", "npm", "run", "e2e:fixture", "--", "scenario", "first-contribution",
  ], {
    cwd: path.resolve("."),
    env: process.env,
    encoding: "utf8",
    shell: false,
  });
  expect(result.status, result.stderr || result.stdout).toBe(0);
}

const routes = [
  { path: "/", slug: "resumo", heading: "Resumo" },
  { path: "/investimentos", slug: "investimentos", heading: "Investimentos" },
  { path: "/cotacoes", slug: "cotacoes", heading: "Cotações" },
  { path: "/cestas", slug: "cestas", heading: "Cestas" },
  { path: "/perfil", slug: "perfil", heading: "Perfil" },
  { path: "/pluggy", slug: "pluggy", heading: "Pluggy" },
  { path: "/saude-financeira", slug: "saude-financeira", heading: "Saúde financeira" },
] as const;

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  for (const route of routes) {
    test(`${viewport.name}: ${route.slug} preserves hierarchy, access and viewport`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(route.path);
      await expect(page.getByRole("heading", { name: route.heading, level: 1 })).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);

      const accessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(accessibility.violations).toEqual([]);

      await expect(page.locator(".screen-header")).toHaveScreenshot(
        `${route.slug}-header-${viewport.name}.png`,
        { animations: "disabled" },
      );
    });
  }
}

test("mobile summary exposes the next decision before secondary financial detail", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const decision = page.getByText("O que fazer com a carteira agora", { exact: true });
  const secondary = page.getByText("CAIXA_BANCÁRIO", { exact: true });
  await expect(decision).toBeVisible();
  expect(await decision.evaluate((node) => node.compareDocumentPosition(document.querySelector(".summary-secondary-grid")!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
  expect((await decision.boundingBox())!.y).toBeLessThan((await secondary.boundingBox())!.y);
});

test("mobile investment guidance keeps first contribution explicit and accessible", async ({ page }) => {
  loadFirstContributionScenario();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/investimentos");

  await expect(page.getByText("Você ainda não possui posições investidas. O valor informado será usado como simulação de aporte inicial conforme a cesta ativa.", { exact: true })).toBeVisible();
  await expect(page.getByText("Comprar", { exact: true }).first()).toBeVisible();
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth);

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
