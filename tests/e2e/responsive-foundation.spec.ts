import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "desktop-wide", width: 1440, height: 900 },
] as const;

for (const viewport of viewports) {
  test(`${viewport.name}: shell, fixtures and accessibility`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/ui-lab");
    await expect(page.getByRole("heading", { name: "Laboratório de interface" })).toBeVisible();

    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth);

    const essentialAction = page.getByRole("button", { name: "Ação essencial" });
    await expect(essentialAction).toBeVisible();
    const actionBox = await essentialAction.boundingBox();
    expect(actionBox?.width).toBeGreaterThanOrEqual(44);
    expect(actionBox?.height).toBeGreaterThanOrEqual(44);

    if (viewport.width <= 880) {
      const menu = page.getByRole("button", { name: "Menu" });
      await menu.focus();
      await expect(menu).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("button", { name: "Investimentos" })).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: "Investimentos" })).toBeVisible();
    }

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);

    await expect(page).toHaveScreenshot(`ui-lab-${viewport.name}.png`, {
      animations: "disabled",
      fullPage: true,
    });
  });
}

test("semantic widths are applied by page type", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/");
  await expect(page.locator(".screen-inner--wide")).toBeVisible();

  await page.goto("/investimentos");
  await expect(page.locator(".screen-inner--wide")).toBeVisible();

  await page.goto("/ui-lab");
  const table = page.getByRole("region", { name: "Exemplo de tabela financeira responsiva" });
  await table.focus();
  await expect(table).toBeFocused();
});
