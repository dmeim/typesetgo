import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createThemeCatalogEntry } from "@/lib/theme-catalog";
import { autoManifestPlugin } from "../../vite-plugin-auto-manifest";
import type { ViteDevServer } from "vite";
import rawTheme from "../../public/themes/typesetgo.json";

const fixture = { version: 1, themes: [createThemeCatalogEntry("typesetgo", rawTheme)] };
const response = (value: unknown, ok = true) => ({ ok, json: async () => value }) as Response;
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("theme browsing index", () => {
  it("loads the complete real catalog, keeping searchable variants without full palettes", async () => {
    const directory = path.resolve("public/themes");
    const ids = readdirSync(directory).filter((name) => name.endsWith(".json") && !["manifest.json", "catalog.json"].includes(name));
    const entries = ids.map((file) => createThemeCatalogEntry(file.slice(0, -5), JSON.parse(readFileSync(path.join(directory, file), "utf8"))));
    expect(entries.length).toBeGreaterThan(1500);
    expect(entries.reduce((count, entry) => count + entry.variants.length, 0)).toBeGreaterThan(4900);
    expect(entries.find((entry) => entry.id === "github")?.name).toBe("GitHub");
    for (const entry of entries) {
      expect(entry.variants.some((variant) => variant.id === entry.defaultVariantId)).toBe(true);
      for (const variant of entry.variants) {
        expect(variant.swatches).toHaveLength(4);
        expect(variant).not.toHaveProperty("dark");
        expect(typeof variant.light).toBe("boolean");
      }
    }
    // Size guards detect accidentally reintroducing palette data, not network latency.
    const json = JSON.stringify({ version: 1, themes: entries });
    expect(Buffer.byteLength(json)).toBeLessThan(1_000_000);
    expect(gzipSync(json).length).toBeLessThan(200_000);
    // Legacy catalogs include an empty variant ID (Mob Psycho 100's “???%”).
    // Metadata must preserve the same variant identifiers as the palette loader.
    vi.resetModules();
    const { fetchThemeCatalogIndex } = await import("@/lib/themes");
    const fetch = vi.fn().mockResolvedValue(response(JSON.parse(json)));
    vi.stubGlobal("fetch", fetch);
    const loaded = await fetchThemeCatalogIndex();
    expect(loaded?.themes).toHaveLength(entries.length);
    expect(loaded?.themes.find((entry) => entry.id === "mob-psycho-100")?.variants)
      .toContainEqual(expect.objectContaining({ id: "", label: "???%" }));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("deduplicates a cold index and reuses it without requesting a manifest or palettes", async () => {
    vi.resetModules();
    const { fetchThemeCatalogIndex } = await import("@/lib/themes");
    const fetch = vi.fn().mockResolvedValue(response(fixture));
    vi.stubGlobal("fetch", fetch);
    const [first, second] = await Promise.all([fetchThemeCatalogIndex(), fetchThemeCatalogIndex()]);
    expect(first).toEqual(fixture);
    expect(second).toBe(first);
    expect(await fetchThemeCatalogIndex()).toBe(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("/themes/catalog.json");
  });

  it.each([
    null,
    { version: 2, themes: fixture.themes },
    { version: 1, themes: [{ ...fixture.themes[0], id: "../outside" }] },
    { version: 1, themes: [{ ...fixture.themes[0], defaultVariantId: "missing" }] },
    { version: 1, themes: [{ ...fixture.themes[0], variants: [{ ...fixture.themes[0].variants[0], swatches: ["bad", "#000", "#000", "#fff"] }] }] },
  ])("does not cache invalid metadata and permits retry", async (invalid) => {
    vi.resetModules();
    const { fetchThemeCatalogIndex } = await import("@/lib/themes");
    const fetch = vi.fn().mockResolvedValueOnce(response(invalid)).mockResolvedValue(response(fixture));
    vi.stubGlobal("fetch", fetch);
    expect(await fetchThemeCatalogIndex()).toBeNull();
    expect(await fetchThemeCatalogIndex()).toEqual(fixture);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("regenerates metadata on source changes while ignoring generated watcher events", () => {
    const root = mkdtempSync(path.join(tmpdir(), "typesetgo-theme-index-"));
    const directory = path.join(root, "public/themes");
    mkdirSync(directory, { recursive: true });
    const source = path.join(directory, "typesetgo.json");
    writeFileSync(source, JSON.stringify(rawTheme));
    vi.spyOn(process, "cwd").mockReturnValue(root);
    const listeners = new Map<string, (file: string) => void>();
    const server = { watcher: { add: vi.fn(), on: (event: string, callback: (file: string) => void) => listeners.set(event, callback) } } as unknown as ViteDevServer;
    try {
      const plugin = autoManifestPlugin();
      const hook = plugin.configureServer;
      if (typeof hook !== "function") throw new Error("Missing server hook");
      hook.call({} as never, server);
      const changed = structuredClone(rawTheme);
      changed.variants.default.label = "Updated label";
      writeFileSync(source, JSON.stringify(changed));
      listeners.get("change")!(source);
      const indexPath = path.join(directory, "catalog.json");
      const index = JSON.parse(readFileSync(indexPath, "utf8"));
      expect(index.themes[0].variants[0].label).toBe("Updated label");
      expect(JSON.parse(readFileSync(path.join(directory, "manifest.json"), "utf8")).themes).toEqual(["typesetgo"]);
      writeFileSync(indexPath, "sentinel");
      listeners.get("change")!(indexPath);
      listeners.get("add")!(indexPath);
      expect(readFileSync(indexPath, "utf8")).toBe("sentinel");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
