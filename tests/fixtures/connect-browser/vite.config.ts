import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../../..");
export default defineConfig({
  root,
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
  server: { host: "127.0.0.1", port: 54319, strictPort: true },
});
