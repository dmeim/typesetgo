import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");
export default defineConfig({
  root: import.meta.dirname,
  publicDir: path.join(root, "public"),
  envDir: import.meta.dirname,
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
    host: "127.0.0.1",
    port: 4318,
    strictPort: true,
    fs: { allow: [root] },
  },
});
