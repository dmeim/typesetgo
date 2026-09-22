import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// The site's live data uses a development deployment. Never infer a write target
// from the ordinary .env.local file or inherited deployment credentials.
export function selectTarget(args, inherited = process.env) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (["--check", "--allow-cloud", "--once"].includes(flag)) options[flag] = true;
    else if (["--env-file", "--expect"].includes(flag) && args[i + 1] && !args[i + 1].startsWith("--")) options[flag] = args[++i];
    else throw new Error(`Unsupported or incomplete option: ${flag}`);
  }
  if (!options["--env-file"] || !options["--expect"]) {
    throw new Error("Supply --env-file .env.backend-local --expect local:YOUR_DEPLOYMENT. Use bun run dev:fixture for UI work. See docs/development.md.");
  }
  const env = parseEnv(readFileSync(options["--env-file"], "utf8"));
  for (const key of ["CONVEX_DEPLOY_KEY", "CONVEX_SELF_HOSTED_URL", "CONVEX_SELF_HOSTED_ADMIN_KEY"]) {
    if (inherited[key] || env[key]) throw new Error(`${key} can override the selected target; remove it before using this command.`);
  }
  const target = env.CONVEX_DEPLOYMENT;
  if (!target || target !== options["--expect"] || !/^(local|dev):[a-zA-Z0-9_-]+$/.test(target)) {
    throw new Error("The env file's CONVEX_DEPLOYMENT must exactly match --expect and name a local or development deployment.");
  }
  if (target.startsWith("dev:") && !options["--allow-cloud"]) {
    throw new Error(`Refusing cloud writes to ${target}. Verify this target separately; --allow-cloud explicitly enables cloud writes.`);
  }
  return { target, options };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const { target, options } = selectTarget(process.argv.slice(2));
    console.log(`Convex target: ${target}${target.startsWith("dev:") ? " (CLOUD WRITES; may hold live data)" : " (local backend)"}`);
    if (!options["--check"]) {
      const args = ["node_modules/convex/bin/main.js", "dev", "--env-file", options["--env-file"]];
      if (options["--once"]) args.push("--once");
      const child = spawn(process.execPath, args, { stdio: "inherit", env: { ...process.env, CONVEX_DEPLOYMENT: target } });
      child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
      child.on("exit", (code) => { process.exitCode = code ?? 1; });
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
