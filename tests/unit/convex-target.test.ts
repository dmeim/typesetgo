// @vitest-environment node
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";
// @ts-expect-error This local CLI is JavaScript, exercised through its public parser.
import { selectTarget } from "../../scripts/convex-dev.mjs";
const directories: string[] = [];
function options(content: string, expected: string) {
  const directory = mkdtempSync(join(tmpdir(), "typesetgo-target-"));
  directories.push(directory);
  const path = join(directory, ".env");
  writeFileSync(path, content);
  return ["--env-file", path, "--expect", expected, "--check"];
}
afterEach(() => { directories.splice(0).forEach((path) => rmSync(path, { recursive: true })); });
it("refuses implicit, mismatched, cloud, and overriding credential targets", () => {
  expect(() => selectTarget([], {})).toThrow("Supply --env-file");
  const args = options("CONVEX_DEPLOYMENT=dev:live-data\n", "dev:live-data");
  expect(() => selectTarget(args, {})).toThrow("Refusing cloud writes");
  expect(() => selectTarget([...args, "--allow-cloud"], { CONVEX_DEPLOY_KEY: "secret" })).toThrow("override");
  expect(() => selectTarget(options("CONVEX_DEPLOYMENT=local:first", "local:second"), {})).toThrow("exactly match");
  expect(() => selectTarget([...args, "--allow-cloud", "--url", "https://example.invalid"], {})).toThrow("Unsupported");
});
it("shows an explicit checked target without starting a backend", () => {
  expect(selectTarget(options("CONVEX_DEPLOYMENT=local:isolated", "local:isolated"), {}).target).toBe("local:isolated");
  expect(selectTarget([...options("CONVEX_DEPLOYMENT=dev:isolated", "dev:isolated"), "--allow-cloud"], {}).target).toBe("dev:isolated");
});

it("runs the documented Node entrypoint and refuses missing target arguments", () => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("CONVEX_")));
  const script = resolve("scripts/convex-dev.mjs");
  const missing = spawnSync(process.execPath, [script], { env, encoding: "utf8" });
  expect(missing.status).toBe(1);
  expect(missing.stderr).toContain("Supply --env-file");
  const checked = spawnSync(process.execPath, [script, ...options("CONVEX_DEPLOYMENT=local:isolated", "local:isolated")], { env, encoding: "utf8" });
  expect(checked.status).toBe(0);
  expect(checked.stdout).toContain("Convex target: local:isolated");
});
