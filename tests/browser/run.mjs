import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// Tailwind's automatic source scan must see the repository even when invoked
// through an absolute runner path from another working directory.
process.chdir(root);
const available = ["practice", "profiles", "connect", "connect-session", "race"];
const selected = process.argv.slice(2);
const suites = selected.length ? selected : available;
for (const name of suites) {
  if (!available.includes(name)) throw new Error("Unknown suite " + name + "; choose " + available.join(", "));
}
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("VITE_")));
const controller = new AbortController();
const interrupt = () => controller.abort();
process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);

function run(command, args) {
  controller.signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: "inherit",
      detached: process.platform !== "win32",
    });
    const timeout = setTimeout(stop, 120_000);
    let killed = false;
    let killTimer;
    function kill(signal) {
      if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
      try {
        if (process.platform === "win32") child.kill(signal);
        else process.kill(-child.pid, signal);
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
    }
    function stop() {
      killed = true;
      kill("SIGTERM");
      killTimer = setTimeout(() => kill("SIGKILL"), 3000);
      killTimer.unref();
    }
    function cleanup() {
      clearTimeout(timeout);
      clearTimeout(killTimer);
      controller.signal.removeEventListener("abort", stop);
    }
    controller.signal.addEventListener("abort", stop, { once: true });
    child.once("error", (error) => {
      cleanup();
      reject(error);
    });
    child.once("exit", (code, signal) => {
      cleanup();
      if (code === 0 && !killed) resolve();
      else reject(new Error(args.join(" ") + " failed (" + (signal ?? code) + ")"));
    });
  });
}

async function checkPracticeManifests() {
  for (const [folder, key] of [["words", "difficulties"], ["quotes", "lengths"], ["themes", "themes"]]) {
    const response = await fetch("http://127.0.0.1:4317/" + folder + "/manifest.json", {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
    });
    assert.equal(response.status, 200, folder + " manifest status");
    assert.match(response.headers.get("content-type") ?? "", /application\/json/, folder + " manifest content type");
    const body = await response.json();
    assert.ok(Array.isArray(body[key]) && body[key].length > 0, folder + " manifest entries");
  }
}

try {
  for (const suite of suites) {
    controller.signal.throwIfAborted();
    console.log("\nBrowser acceptance: " + suite);
    if (suite === "practice") {
      const server = await createServer({ configFile: path.join(root, "tests/browser/practice/vite.config.ts") });
      try {
        await server.listen(); // strictPort prevents testing another checkout.
        await checkPracticeManifests();
        for (const scenario of ["journeys", "ranked", "preferences", "narrow", "secondary", "area", "color"]) {
          await run(process.execPath, ["tests/browser/practice/" + scenario + ".mjs"]);
        }
      } finally {
        await server.close();
      }
    } else if (suite === "profiles") {
      await run(process.execPath, ["tests/browser/profiles/check.mjs"]);
    } else {
      const config = suite === "race" ? "tests/fixtures/race/playwright.config.ts"
        : "tests/fixtures/connect-browser/playwright" + (suite === "connect-session" ? ".real" : "") + ".config.ts";
      await run(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--config", config]);
    }
  }
} finally {
  process.removeListener("SIGINT", interrupt);
  process.removeListener("SIGTERM", interrupt);
}
