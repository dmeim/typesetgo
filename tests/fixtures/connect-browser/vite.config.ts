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
        server.middlewares.use((req, _res, next) => {
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
