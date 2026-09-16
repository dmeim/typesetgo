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

describe("theme loading lifecycle", () => {
  it("deduplicates concurrent manifests and theme requests, then reuses successful objects", async () => {
    const themes = await import("@/lib/themes");
    const palette = themes.getDefaultTheme().dark;
    const manifest = deferred<Response>();
    const theme = deferred<Response>();
    const fetch = vi.fn((url: string) => url.includes("manifest") ? manifest.promise : theme.promise);
    vi.stubGlobal("fetch", fetch);
    const first = themes.fetchThemeCatalog();
    const second = themes.fetchAllThemes();
    expect(fetch).toHaveBeenCalledTimes(1);
    manifest.resolve(response({ themes: ["typesetgo"], default: "typesetgo" }));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const direct = themes.fetchTheme("TYPESETGO");
    theme.resolve(response({ dark: palette }));
    const [catalog, compatible, loaded] = await Promise.all([first, second, direct]);
    expect(catalog.complete).toBe(true);
    expect(catalog.themes[0]).toBe(compatible[0]);
    expect(loaded).toBe(compatible[0]);
    expect(await themes.fetchTheme("typesetgo")).toBe(loaded);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("bounds network work across overlapping catalogs, preserving explicit partial results and retry", async () => {
    const themes = await import("@/lib/themes");
    const palette = themes.getDefaultTheme().dark;
    const ids = Array.from({ length: 18 }, (_, i) => `theme-${i}`);
    const pending: Array<{ url: string; finish: () => void }> = [];
    let active = 0;
    let peak = 0;
    let fail = true;
    const fetch = vi.fn((url: string) => {
      const request = deferred<Response>();
      active++;
      peak = Math.max(peak, active);
      pending.push({ url, finish: () => {
        active--;
        request.resolve(response({ dark: palette }, !(fail && url.includes("theme-4.json"))));
      } });
      return request.promise;
    });
    vi.stubGlobal("fetch", fetch);
    const first = themes.fetchThemeCatalog({ themeIds: ids });
    const second = themes.fetchThemeCatalog({ themeIds: ids.slice(2) });
    await vi.waitFor(() => expect(pending).toHaveLength(6));
    for (let batch = 0; batch < 3; batch++) {
      const current = pending.splice(0);
      current.forEach(({ finish }) => finish());
      if (batch < 2) await vi.waitFor(() => expect(pending).toHaveLength(6));
    }
    const [result, overlapping] = await Promise.all([first, second]);
    expect(peak).toBe(6);
    expect(fetch).toHaveBeenCalledTimes(ids.length);
    expect(result).toMatchObject({ complete: false, manifestError: false, failedThemeIds: ["theme-4"] });
    expect(result.themes).toHaveLength(17);
    expect(overlapping.failedThemeIds).toEqual(["theme-4"]);
    fail = false;
    const retry = themes.retryThemeCatalog(result);
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    expect(pending[0].url).toBe("/themes/theme-4.json");
    pending[0].finish();
    const recovered = await retry;
    expect(recovered).toMatchObject({ complete: true, failedThemeIds: [], requestedThemeIds: ids });
    expect(recovered.themes).toHaveLength(18);
    expect(fetch).toHaveBeenCalledTimes(19);
  });

  it("distinguishes a failed manifest from an empty catalog and permits an explicit retry", async () => {
    const themes = await import("@/lib/themes");
    const fetch = vi.fn().mockResolvedValueOnce(response(null, false))
      .mockResolvedValueOnce(response({ themes: [], default: "typesetgo" }));
    vi.stubGlobal("fetch", fetch);
    const result = await themes.fetchThemeCatalog();
    expect(result).toMatchObject({ complete: false, manifestError: true, themes: [] });
    expect(themes.getThemeManifestFromCache()).toBeNull();
    expect(await themes.retryThemeCatalog(result)).toMatchObject({ complete: true, manifestError: false });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not cache invalid themes, resolves a missing default variant, and rejects path IDs", async () => {
    const themes = await import("@/lib/themes");
    const palette = themes.getDefaultTheme().dark;
    const fetch = vi.fn().mockResolvedValueOnce(response({ variants: {} }))
      .mockResolvedValueOnce(response({ defaultVariant: "missing", variants: { valid: { dark: palette } } }));
    vi.stubGlobal("fetch", fetch);
    expect(await themes.fetchTheme("example")).toBeNull();
    expect(await themes.fetchTheme("example")).toMatchObject({ defaultVariantId: "valid" });
    expect(await themes.fetchTheme("../example")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
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
