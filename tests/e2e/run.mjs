import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const mode = process.argv[2] ?? "smoke";
const repeatArgument = process.argv.find((argument) => argument.startsWith("--repeat="));
const repeat = Number(repeatArgument?.split("=")[1] ?? "1");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const resultDir = path.join(rootDir, "test-results");
const reportDir = path.join(rootDir, "playwright-report");
const authDir = path.join(rootDir, ".playwright", "auth");

function assertWorkspacePath(target) {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(`${rootDir}${path.sep}`)) {
    throw new Error(`Refusing to modify a path outside the workspace: ${resolved}`);
  }
  return resolved;
}

function removeRuntimePath(target) {
  const safeTarget = assertWorkspacePath(target);
  if (existsSync(safeTarget)) rmSync(safeTarget, { recursive: true, force: true });
}

function run(command, args, env, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env,
    stdio: "inherit",
    shell: false,
    ...options,
  });
  return result.status ?? 1;
}

function capture(command, args, env) {
  return spawnSync(command, args, {
    cwd: rootDir,
    env,
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
    shell: false,
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("Unable to allocate E2E port"));
      const port = address.port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function collectFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const item = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(item) : [item];
  });
}

function validateFailureArtifacts(secrets) {
  const files = collectFiles(resultDir);
  const required = {
    trace: files.some((file) => file.endsWith("trace.zip")),
    screenshot: files.some((file) => file.endsWith(".png")),
    video: files.some((file) => file.endsWith(".webm")),
  };
  if (Object.values(required).some((present) => !present)) {
    throw new Error(`Artifact probe incomplete: ${JSON.stringify(required)}`);
  }

  for (const file of [...files, ...collectFiles(reportDir)]) {
    const body = readFileSync(file);
    for (const secret of secrets) {
      if (secret && body.includes(Buffer.from(secret))) {
        throw new Error(`Sensitive E2E value found in artifact: ${path.relative(rootDir, file)}`);
      }
    }
  }
  console.log(`[e2e] sanitized failure artifacts verified: ${JSON.stringify(required)}`);
}

function validatePasswordResetLog(env, compose) {
  const result = capture("docker", [...compose, "logs", "--no-color", "api"], env);
  if (result.status !== 0) throw new Error("Unable to inspect the API log for password reset delivery");

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (!output.includes(`Password reset for ${env.E2E_USER_EMAIL}:`)) {
    throw new Error("Password reset log delivery marker was not found");
  }
  for (const secret of [env.E2E_USER_PASSWORD, env.E2E_AUTH_SECRET, env.E2E_DB_PASSWORD]) {
    if (secret && output.includes(secret)) throw new Error("Sensitive E2E value found in API logs");
  }
  console.log("[e2e] password reset log delivery verified");
}

const port = await getFreePort();
const suffix = `${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
const namespace = `smoke-${suffix}`.toLowerCase();
const projectName = `paridade-e2e-${suffix}`.toLowerCase();
const email = `e2e+${namespace}@paridaderisco.invalid`;
const password = randomBytes(24).toString("base64url");
const authSecret = randomBytes(32).toString("hex");
const dbPassword = randomBytes(24).toString("hex");
const telegramS2sSecret = randomBytes(32).toString("hex");
const authStatePath = path.join(authDir, `${namespace}.json`);
const env = {
  ...process.env,
  E2E_NAMESPACE: namespace,
  E2E_USER_EMAIL: email,
  E2E_USER_PASSWORD: password,
  E2E_AUTH_SECRET: authSecret,
  E2E_DB_PASSWORD: dbPassword,
  E2E_TELEGRAM_S2S_SECRET: telegramS2sSecret,
  E2E_API_PORT: String(port),
  E2E_BASE_URL: `http://127.0.0.1:${port}`,
  E2E_AUTH_STATE_PATH: authStatePath,
};
const compose = ["compose", "-f", "docker-compose.e2e.yml", "-p", projectName];
const playwrightCli = path.join(
  rootDir,
  "tests",
  "e2e",
  "node_modules",
  "@playwright",
  "test",
  "cli.js",
);

if (!existsSync(playwrightCli)) {
  throw new Error("Playwright is not installed. Run: npm run e2e:install");
}
if (!Number.isInteger(repeat) || repeat < 1 || repeat > 10) {
  throw new Error("--repeat must be an integer between 1 and 10");
}

removeRuntimePath(resultDir);
removeRuntimePath(reportDir);
mkdirSync(authDir, { recursive: true });

let exitCode = 1;
let environmentStarted = false;
try {
  const up = run("docker", [...compose, "up", "-d", "--build", "--wait", "--wait-timeout", "240"], env);
  if (up !== 0) throw new Error("Docker Compose E2E environment failed its healthcheck");
  environmentStarted = true;

  const setup = run("docker", [...compose, "exec", "-T", "api", "npm", "run", "e2e:fixture", "--", "setup"], env);
  if (setup !== 0) throw new Error("E2E fixture setup failed");

  const projectArgs = mode === "webkit"
    ? ["--project=webkit-mobile"]
    : mode === "responsive"
      ? ["--project=responsive-foundation"]
    : mode === "artifact-check"
      ? ["--project=artifact-probe"]
      : mode === "gate"
        ? ["--project=chromium-desktop", "--project=chromium-mobile", "--project=responsive-foundation"]
        : ["--project=chromium-desktop", "--project=chromium-mobile"];

  const testFiles = mode === "artifact-check"
    ? ["artifact-probe.spec.ts"]
    : mode === "responsive"
      ? ["responsive-foundation.spec.ts", "responsive-critical.spec.ts"]
    : mode === "critical"
      ? ["critical-flows.spec.ts"]
      : mode === "gate"
        ? ["smoke.spec.ts", "critical-flows.spec.ts", "responsive-foundation.spec.ts", "responsive-critical.spec.ts"]
        : ["smoke.spec.ts"];
  const testEnv = mode === "artifact-check" ? { ...env, E2E_ARTIFACT_PROBE: "1" } : env;
  const testArgs = ["test", ...testFiles, "--config", "tests/e2e/playwright.config.ts", ...projectArgs];
  if (repeat > 1) testArgs.push(`--repeat-each=${repeat}`);
  if (process.env.E2E_UPDATE_SNAPSHOTS === "1") testArgs.push("--update-snapshots");
  const testStatus = run(process.execPath, [playwrightCli, ...testArgs], testEnv);

  if (mode === "artifact-check") {
    if (testStatus === 0) throw new Error("Artifact probe was expected to fail");
    validateFailureArtifacts([email, password, authSecret, dbPassword, telegramS2sSecret]);
    exitCode = 0;
  } else {
    exitCode = testStatus;
    if (testStatus === 0 && (mode === "critical" || mode === "gate")) {
      validatePasswordResetLog(env, compose);
    }
  }
} catch (error) {
  console.error("[e2e]", error instanceof Error ? error.message : "unknown failure");
  exitCode = 1;
} finally {
  if (environmentStarted) {
    const cleanupStatus = run("docker", [...compose, "exec", "-T", "api", "npm", "run", "e2e:fixture", "--", "cleanup"], env);
    const verificationStatus = run("docker", [...compose, "exec", "-T", "api", "npm", "run", "e2e:fixture", "--", "verify-clean"], env);
    if (cleanupStatus !== 0 || verificationStatus !== 0) exitCode = 1;
  }
  run("docker", [...compose, "down", "-v", "--remove-orphans", "--timeout", "10"], env);
  removeRuntimePath(authStatePath);
}

process.exit(exitCode);
