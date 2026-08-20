import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";

const root = resolve(import.meta.dirname, "..");
const roots = [
  "apps/api/src/app",
  "apps/api/src/context",
  "apps/api/src/lib/pluggy",
  "apps/api/src/scripts",
  "packages/shared/src",
  "packages/shared/test",
  "tests/e2e",
];
const wholeFileAllowlist = new Set([
  "apps/api/src/scripts/migrate-legacy.ts",
  "apps/api/src/scripts/pluggy-migration-readiness.ts",
]);
const compatibilityMarkers = [
  "pluggy_migration_readiness",
  "/api/integrations/pluggy/migration-readiness",
  "/api/integrations/pluggy/migration\"",
  "canSwitchToPluggy",
];
const term = /\b(migration|migrationreadiness|migra(?:ção|cao|r))\b/i;
const extensions = /\.(?:ts|tsx|mjs)$/;

function files(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).filter((name) => !["node_modules", ".next"].includes(name)).flatMap((name) => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const violations = [];
for (const source of roots.flatMap((directory) => files(resolve(root, directory)))) {
  if (!extensions.test(source)) continue;
  const path = relative(root, source).replaceAll("\\", "/");
  if (wholeFileAllowlist.has(path)) continue;
  readFileSync(source, "utf8").split(/\r?\n/).forEach((line, index) => {
    if (!term.test(line)) return;
    if (compatibilityMarkers.some((marker) => line.includes(marker))) return;
    violations.push(`${path}:${index + 1}: ${line.trim()}`);
  });
}

if (violations.length) {
  console.error("Pluggy source-activation naming violations:\n" + violations.join("\n"));
  process.exit(1);
}
console.log("Pluggy source-activation naming validation passed");
