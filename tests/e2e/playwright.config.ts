import { defineConfig } from "@playwright/test";
import path from "node:path";

const rootDir = path.resolve(__dirname, "../..");
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3102";
const authState = process.env.E2E_AUTH_STATE_PATH
  ?? path.join(rootDir, ".playwright", "auth", "e2e-state.json");

const authenticatedUse = {
  baseURL,
  storageState: authState,
  serviceWorkers: "block" as const,
  screenshot: "only-on-failure" as const,
  trace: "off" as const,
  video: "off" as const,
};

export default defineConfig({
  testDir: __dirname,
  outputDir: path.join(rootDir, "test-results"),
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [
    ["line"],
    ["html", { outputFolder: path.join(rootDir, "playwright-report"), open: "never" }],
  ],
  use: {
    baseURL,
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { baseURL, trace: "off", video: "off", screenshot: "off" },
    },
    {
      name: "chromium-desktop",
      testMatch: /(smoke|critical-flows)\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...authenticatedUse,
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "chromium-mobile",
      testMatch: /(smoke|critical-flows)\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...authenticatedUse,
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "webkit-mobile",
      testMatch: /smoke\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...authenticatedUse,
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "responsive-foundation",
      testMatch: /responsive-foundation\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...authenticatedUse,
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "artifact-probe",
      testMatch: /artifact-probe\.spec\.ts/,
      use: {
        baseURL,
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        serviceWorkers: "block",
      },
    },
  ],
});
