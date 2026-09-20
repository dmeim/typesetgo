import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { createThemeCatalogEntry } from "../../../src/lib/theme-catalog.ts";

const root = path.resolve(import.meta.dirname, "../../..");
const themes = readdirSync(path.join(root, "public/themes"))
  .filter((name) => name.endsWith(".json") && name !== "manifest.json" && name !== "catalog.json")
  .map((name) => name.slice(0, -5));

// These responses exist before Vite indexes public files. Generating missing
// public manifests in configureServer is too late on a clean checkout.
const manifests: Record<string, unknown> = {
  "/words/manifest.json": {
    difficulties: ["beginner", "easy", "medium", "hard", "expert"],
    default: "beginner",
  },
  "/quotes/manifest.json": {
    lengths: ["short", "medium", "long", "xl"],
    default: "medium",
  },
  "/themes/manifest.json": { themes, default: "typesetgo" },
  "/themes/catalog.json": {
    version: 1,
    themes: themes.map((id) => createThemeCatalogEntry(id, JSON.parse(readFileSync(path.join(root, `public/themes/${id}.json`), "utf8")))),
  },
  "/sounds/manifest.json": { typing: {}, warning: {}, error: {} },
};

export default defineConfig({
  root,
  cacheDir: path.join(tmpdir(), "typesetgo-practice-" + createHash("sha256").update(root).digest("hex").slice(0, 12)),
  envDir: false,
  envPrefix: "TYPESETGO_FIXTURE_",
  plugins: [
    react(),
    {
      name: "isolated-practice-fixture",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const pathname = req.url?.split("?")[0] ?? "";
          if (pathname in manifests) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(manifests[pathname]));
            return;
          }
          if (pathname !== "/") return next();
          try {
            const html = await server.transformIndexHtml("/", '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/browser/practice/entry.tsx"></script></body></html>');
            res.setHeader("Content-Type", "text/html");
            res.end(html);
          } catch (error) {
            next(error);
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.join(root, "src"),
      "@clerk/clerk-react": path.join(import.meta.dirname, "clerk.ts"),
      "convex/react": path.join(import.meta.dirname, "convex.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    hmr: false,
    host: "127.0.0.1",
    port: 4317,
    strictPort: true,
    fs: { allow: [root] },
  },
});
