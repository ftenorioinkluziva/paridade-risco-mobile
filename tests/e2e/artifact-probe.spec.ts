import { expect, test } from "@playwright/test";

test("public failure artifact probe", async ({ page }) => {
  if (process.env.E2E_ARTIFACT_PROBE !== "1") test.skip();

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Acesso" })).toBeVisible();
  await expect(page).toHaveTitle(/__intentional_artifact_probe_failure__/);
});
