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

// Generated public manifests are gitignored, so a clean checkout serves these instead.
const manifests: Record<string, unknown> = {
  "/words/manifest.json": { difficulties: ["beginner", "easy", "medium", "hard", "expert"], default: "beginner" },
  "/quotes/manifest.json": { lengths: ["short", "medium", "long", "xl"], default: "medium" },
  "/themes/manifest.json": { themes, default: "typesetgo" },
  "/themes/catalog.json": {
    version: 1,
    themes: themes.map((id) => createThemeCatalogEntry(id, JSON.parse(readFileSync(path.join(root, `public/themes/${id}.json`), "utf8")))),
  },
  "/sounds/manifest.json": { typing: {}, warning: {}, error: {} },
};

export default defineConfig({
  cacheDir: path.join(tmpdir(), "typesetgo-connect-" + createHash("sha256").update(root).digest("hex").slice(0, 12)),
  root: import.meta.dirname,
  publicDir: path.join(root, "public"),
  envDir: false,
  envPrefix: "TYPESETGO_FIXTURE_",
  optimizeDeps: { entries: [path.join(import.meta.dirname, "main.tsx")] },
  plugins: [
    react(),
    {
      name: "isolated-connect-manifests",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const pathname = req.url?.split("?")[0] ?? "";
          if (!(pathname in manifests)) return next();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(manifests[pathname]));
        });
      },
    },
  ],
  resolve: {
    alias: [
      { find: "convex/react", replacement: path.join(import.meta.dirname, "mock-convex.ts") },
      { find: "@clerk/clerk-react", replacement: path.join(import.meta.dirname, "clerk.ts") },
      { find: "@", replacement: path.join(root, "src") },
    ],
    dedupe: ["react", "react-dom"],
  },
  server: {
    hmr: false,
    host: "127.0.0.1",
    port: 4319,
    strictPort: true,
    fs: { allow: [root] },
  },
});
