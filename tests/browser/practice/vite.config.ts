import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { autoManifestPlugin } from "../../../vite-plugin-auto-manifest";

const root = path.resolve(import.meta.dirname, "../../..");
export default defineConfig({
  root,
  cacheDir: path.join(tmpdir(), "typesetgo-practice-" + createHash("sha256").update(root).digest("hex").slice(0, 12)),
  envDir: false,
  plugins: [react(), autoManifestPlugin(), {
    name: "isolated-practice-fixture",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split("?")[0] !== "/") return next();
        res.setHeader("Content-Type", "text/html");
        res.end(await server.transformIndexHtml("/", '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/browser/practice/entry.tsx"></script></body></html>'));
      });
    },
  }],
  resolve: {
    alias: {
      "@": path.join(root, "src"),
      "@clerk/clerk-react": path.join(import.meta.dirname, "clerk.tsx"),
      "convex/react": path.join(import.meta.dirname, "convex.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: { hmr: false, host: "127.0.0.1", port: 4317, strictPort: true, fs: { allow: [root] } },
});
