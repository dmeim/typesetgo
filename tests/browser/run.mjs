import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const available = ["practice", "profiles", "connect", "connect-session", "race"];
const selected = process.argv.slice(2);
const suites = selected.length ? selected : available;
for (const name of suites) {
  if (!available.includes(name)) throw new Error(`Unknown suite ${name}; choose ${available.join(", ")}`);
}
const env = { ...process.env };
delete env.VITE_CONVEX_URL;
delete env.VITE_CLERK_PUBLISHABLE_KEY;

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} failed (${signal ?? code})`)));
  });
}

for (const suite of suites) {
  console.log(`\nBrowser acceptance: ${suite}`);
  if (suite === "practice") {
    const server = await createServer({ configFile: path.join(root, "tests/browser/practice/vite.config.ts") });
    try {
      await server.listen(); // strictPort prevents silently testing another checkout.
      for (const scenario of ["journeys", "ranked", "preferences", "narrow", "secondary", "area", "color"]) {
        await run(process.execPath, [`tests/browser/practice/${scenario}.mjs`]);
      }
    } finally {
      await server.close();
    }
  } else if (suite === "profiles") {
    await run(process.execPath, ["tests/browser/profiles/check.mjs"]);
  } else {
    const config = suite === "race" ? "tests/fixtures/race/playwright.config.ts"
      : `tests/fixtures/connect-browser/playwright${suite === "connect-session" ? ".real" : ""}.config.ts`;
    await run("bun", ["x", "--no-install", "playwright", "test", "--config", config]);
  }
}
