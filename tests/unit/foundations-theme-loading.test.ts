import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function response(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 503, json: async () => data } as Response;
}

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("on-demand theme loading", () => {
  it("deduplicates startup manifests and concurrent preview/selection, then caches successful palettes", async () => {
    const themes = await import("@/lib/themes");
    const palette = themes.getDefaultTheme().dark;
    const manifest = deferred<Response>();
    const theme = deferred<Response>();
    const fetch = vi.fn((url: string) => url.includes("manifest") ? manifest.promise : theme.promise);
    vi.stubGlobal("fetch", fetch);
    const firstManifest = themes.fetchThemeManifest();
    const secondManifest = themes.fetchThemeManifest();
    expect(fetch).toHaveBeenCalledTimes(1);
    manifest.resolve(response({ themes: ["typesetgo"], default: "typesetgo" }));
    expect(await firstManifest).toEqual(await secondManifest);
    const preview = themes.fetchThemeForPreview("typesetgo");
    const selected = themes.fetchTheme("TYPESETGO");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    theme.resolve(response({ dark: palette }));
    expect(await preview).toBe(await selected);
    expect(await themes.fetchTheme("typesetgo")).toBe(await selected);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("prioritizes a selected theme ahead of queued previews", async () => {
    const themes = await import("@/lib/themes");
    const palette = themes.getDefaultTheme().dark;
    const pending = new Map<string, () => void>();
    const fetch = vi.fn((url: string) => {
      const request = deferred<Response>();
      pending.set(url, () => { pending.delete(url); request.resolve(response({ dark: palette })); });
      return request.promise;
    });
    vi.stubGlobal("fetch", fetch);
    const previews = Array.from({ length: 7 }, (_, index) => themes.fetchThemeForPreview(`preview-${index}`));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(6));
    const selected = themes.fetchTheme("selected");
    pending.get("/themes/preview-0.json")!();
    await vi.waitFor(() => expect(fetch.mock.calls[6]?.[0]).toBe("/themes/selected.json"));
    for (const finish of [...pending.values()]) finish();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(8));
    pending.get("/themes/preview-6.json")!();
    await Promise.all([...previews, selected]);
    expect(fetch.mock.calls.map(([url]) => url)).toContain("/themes/preview-6.json");
  });

  it("retries failed manifests and themes without caching failures", async () => {
    const themes = await import("@/lib/themes");
    const palette = themes.getDefaultTheme().dark;
    const fetch = vi.fn().mockResolvedValueOnce(response(null, false))
      .mockResolvedValueOnce(response({ themes: ["typesetgo"], default: "typesetgo" }))
      .mockResolvedValueOnce(response({ variants: {} }))
      .mockResolvedValueOnce(response({ defaultVariant: "missing", variants: { valid: { dark: palette } } }));
    vi.stubGlobal("fetch", fetch);
    expect(await themes.fetchThemeManifest()).toEqual({ themes: [], default: "typesetgo" });
    expect((await themes.fetchThemeManifest()).themes).toEqual(["typesetgo"]);
    expect(await themes.fetchTheme("example")).toBeNull();
    expect(await themes.fetchTheme("example")).toMatchObject({ defaultVariantId: "valid" });
    expect(await themes.fetchTheme("../example")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("times out hung requests, releases capacity, and allows a fresh retry", async () => {
    vi.useFakeTimers();
    const themes = await import("@/lib/themes");
    const palette = themes.getDefaultTheme().dark;
    const fetch = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    vi.stubGlobal("fetch", fetch);
    const load = themes.fetchTheme("example");
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await load).toBeNull();
    fetch.mockResolvedValueOnce(response({ dark: palette }));
    expect(await themes.fetchTheme("example")).not.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
