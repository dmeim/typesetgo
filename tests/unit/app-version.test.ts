import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_VERSION } from "@/lib/app-version";

describe("app version", () => {
  it("matches package.json and the date-based release format", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
    expect(APP_VERSION).toBe(pkg.version);
    expect(APP_VERSION).toMatch(/^\d{4}\.\d{2}\.\d{2}\.\d+$/);
  });
});
