import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { tmpdir } from "node:os";
import { readFileSync } from "node:fs";
import { createThemeCatalogEntry } from "../../../src/lib/theme-catalog.ts";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../../..");
export default defineConfig({
  cacheDir: path.join(tmpdir(), "typesetgo-connect-" + createHash("sha256").update(root).digest("hex").slice(0, 12)),
  root,
  envDir: false,
  // Scan the served fixture, rather than the unrelated production index.html.
  optimizeDeps: { entries: ["tests/fixtures/connect-browser/index.html"] },
  envPrefix: "TYPESETGO_FIXTURE_",
  plugins: [
    react(),
    {
      name: "connect-isolated-fixture",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url?.split("?")[0] ?? "";
          const manifests: Record<string, unknown> = {
            "/words/manifest.json": {
              difficulties: ["beginner", "easy", "medium", "hard", "expert"],
              default: "medium",
            },
            "/quotes/manifest.json": {
              lengths: ["short", "medium", "long", "xl"],
              default: "medium",
            },
            "/sounds/manifest.json": {
              typing: {
                creamy: ["creamy_01.wav"],
                bubbles: ["bubbles_01.wav"],
              },
              warning: { clock: ["clock.wav"] },
              error: {},
            },
            "/themes/catalog.json": {
              version: 1,
              themes: ["typesetgo", "github"].map((id) => createThemeCatalogEntry(id, JSON.parse(readFileSync(path.join(root, `public/themes/${id}.json`), "utf8")))),
            },
            "/themes/manifest.json": {
              themes: ["typesetgo", "github"],
              default: "typesetgo",
            },
          };
          if (url in manifests) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(manifests[url]));
            return;
          }
          if (url === "/favicon.ico") {
            res.statusCode = 204;
            res.end();
            return;
          }
          if (req.url?.split("?")[0].startsWith("/connect"))
            req.url = "/tests/fixtures/connect-browser/index.html";
          next();
        });
      },
    },
  ],
  resolve: {
    alias: [
      {
        find: "convex/react",
        replacement: path.join(import.meta.dirname, "convex.ts"),
      },
      {
        find: "@/components/typing/TypingPractice",
        replacement: path.join(import.meta.dirname, "Practice.tsx"),
      },
      { find: "@", replacement: path.join(root, "src") },
    ],
  },
  server: { hmr: false, host: "127.0.0.1", port: 54319, strictPort: true },
});
