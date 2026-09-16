import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { mkdtemp } from "node:fs/promises";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

export async function startProfileFixtureServer() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  const fixture = path.join(root, "tests/browser/profiles/fixtures.ts");
  const server = await createServer({
    root,
    cacheDir: await mkdtemp(path.join(os.tmpdir(), "typesetgo-profiles-vite-")),
    configFile: false,
    envDir: false,
    plugins: [react(), {
      name: "isolated-profile-fixtures",
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (!/^\/(user\/[^/?]+|leaderboard|notifications)(\?|$)/.test(req.url ?? "")) return next();
          const html = await vite.transformIndexHtml(req.url, '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/browser/profiles/app.tsx"></script></body></html>');
          res.setHeader("Content-Type", "text/html");
          res.end(html);
        });
      },
    }],
    resolve: {
      alias: [
        { find: "convex/react", replacement: fixture },
        { find: "@clerk/clerk-react", replacement: fixture },
        { find: "@/components/layout/useAppAuth", replacement: fixture },
        { find: "@", replacement: path.join(root, "src") },
      ],
    },
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  return { server, url: server.resolvedUrls.local[0].replace(/\/$/, "") };
}

if (process.argv.includes("--serve")) {
  const { url } = await startProfileFixtureServer();
  console.log(`Isolated profile fixtures: ${url}/user/profile-owner`);
}
