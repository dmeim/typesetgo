import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "../../..");
export default defineConfig({
  cacheDir: path.join(tmpdir(), "typesetgo-race-" + createHash("sha256").update(root).digest("hex").slice(0, 12)),
  root: import.meta.dirname,
  publicDir: path.join(root, "public"),
  envDir: false,
  envPrefix: "TYPESETGO_FIXTURE_",
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "convex/react",
        replacement: path.join(import.meta.dirname, "mock-convex.ts"),
      },
      {
        find: "@/components/layout/Header",
        replacement: path.join(import.meta.dirname, "mock-header.tsx"),
      },
      { find: "@", replacement: path.join(root, "src") },
    ],
  },
  server: {
    hmr: false,
    host: "127.0.0.1",
    port: 4318,
    strictPort: true,
    fs: { allow: [root] },
  },
});
