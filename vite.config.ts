import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { autoManifestPlugin } from "./vite-plugin-auto-manifest.ts";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), autoManifestPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
    // Worker static assets are public; local stack traces use the source tree.
    sourcemap: false,
  },
});
