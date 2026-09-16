import { defineConfig } from "vite";
import base from "./vite.config.ts";

// Keep the isolated Convex store but exercise the production typing executor.
export default defineConfig({
  ...base,
  resolve: {
    ...base.resolve,
    alias: (base.resolve!.alias as { find: string; replacement: string }[])
      .filter((entry) => entry.find !== "@/components/typing/TypingPractice"),
  },
  server: { host: "127.0.0.1", port: 54320, strictPort: true },
});
