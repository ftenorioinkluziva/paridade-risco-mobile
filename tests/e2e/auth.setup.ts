import { expect, test as setup } from "@playwright/test";

setup("authenticate isolated E2E user", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  const authStatePath = process.env.E2E_AUTH_STATE_PATH;
  if (!email || !password || !authStatePath) {
    throw new Error("Isolated E2E credentials and auth state path are required");
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Resumo" })).toBeVisible();
  await page.context().storageState({ path: authStatePath });
});
