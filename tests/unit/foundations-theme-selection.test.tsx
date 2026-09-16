import { StrictMode, useLayoutEffect } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, type ThemeContextValue } from "@/context/ThemeContext";
import { useTheme } from "@/hooks/useTheme";
import { Toaster } from "@/components/ui/sonner";
import { fetchTheme, fetchThemeManifest, getDefaultTheme } from "@/lib/themes";
import { deriveThemeUI } from "@/lib/colors";
import type { ThemeDefinition } from "@/types/theme";

vi.mock("@/lib/themes", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/themes")>(),
  fetchTheme: vi.fn(),
  fetchThemeManifest: vi.fn(),
}));

vi.mock("sonner", () => ({
  Toaster: ({ theme, toastOptions }: { theme: string; toastOptions: { style: object } }) => (
    <div data-testid="toaster" data-mode={theme} style={toastOptions.style} />
  ),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function fixture(id: string, background = "#102030"): ThemeDefinition {
  const theme = getDefaultTheme();
  const dark = { ...theme.dark, bg: { ...theme.dark.bg, base: background } };
  const light = { ...dark, bg: { ...dark.bg, base: "#ffffff", surface: "#f8f8f8", elevated: "#eeeeee" } };
  return {
    ...theme, id, name: id, dark, light,
    variants: [
      { id: "default", label: "Default", dark, light },
      { id: "dark-only", label: "Dark only", dark, light: null },
    ],
  };
}

let latest: ThemeContextValue;
function Probe() {
  const theme = useTheme();
  useLayoutEffect(() => { latest = theme; });
  return <output data-testid="selection">{theme.themeId}/{theme.variantId}/{theme.mode}</output>;
}

async function mount() {
  const result = render(<ThemeProvider><Probe /><Toaster richColors /></ThemeProvider>);
  await waitFor(() => expect(latest.isLoading).toBe(false));
  return result;
}

function expectCommitted(theme: ThemeDefinition, mode: "dark" | "light", variantId = "default") {
  const variant = theme.variants.find((v) => v.id === variantId)!;
  const colors = mode === "light" ? variant.light! : variant.dark;
  expect(screen.getByTestId("selection")).toHaveTextContent(`${theme.id}/${variantId}/${mode}`);
  expect(screen.getByTestId("toaster")).toHaveAttribute("data-mode", mode);
  expect(document.documentElement).toHaveAttribute("data-theme-mode", mode);
  expect(document.documentElement.classList.contains("dark")).toBe(mode === "dark");
  expect(document.documentElement.style.colorScheme).toBe(mode);
  expect(document.documentElement.style.getPropertyValue("--background")).toBe(deriveThemeUI(colors).background);
  expect(document.documentElement.style.getPropertyValue("--theme-typing-upcoming")).toBe(colors.typing.upcoming);
  expect(localStorage.getItem("typesetgo-theme-id")).toBe(theme.id);
  expect(localStorage.getItem("typesetgo-theme-variant-id")).toBe(variantId);
  expect(localStorage.getItem("typesetgo-theme-mode")).toBe(mode);
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute("style");
  document.documentElement.classList.remove("dark");
  vi.mocked(fetchThemeManifest).mockResolvedValue({ themes: ["typesetgo"], default: "typesetgo" });
  vi.mocked(fetchTheme).mockResolvedValue(fixture("typesetgo"));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("atomic effective theme selection", () => {
  it("applies saved light mode and keeps Sonner, root mode, raw and semantic colors in sync", async () => {
    localStorage.setItem("typesetgo-theme-mode", "light");
    await mount();
    expectCommitted(fixture("typesetgo"), "light");
    expect(screen.getByTestId("toaster")).toHaveStyle({ background: "var(--popover)", color: "var(--popover-foreground)", boxShadow: "none" });
    act(() => latest.setVariant("dark-only"));
    expectCommitted(fixture("typesetgo"), "dark", "dark-only");
    act(() => latest.setMode("light"));
    expectCommitted(fixture("typesetgo"), "dark", "dark-only");
  });

  it("commits the last requested selection even when earlier responses finish later", async () => {
    await mount();
    const slow = deferred<ThemeDefinition | null>();
    const fast = deferred<ThemeDefinition | null>();
    vi.mocked(fetchTheme).mockImplementation((id) => id === "slow" ? slow.promise : fast.promise);
    let first!: Promise<void>;
    let last!: Promise<void>;
    act(() => {
      first = latest.setTheme("slow");
      last = latest.setThemeSelection({ themeId: "fast", mode: "light" });
    });
    await act(async () => { fast.resolve(fixture("fast")); await last; });
    expectCommitted(fixture("fast"), "light");
    await act(async () => { slow.resolve(fixture("slow", "#301020")); await first; });
    expectCommitted(fixture("fast"), "light");
  });

  it("does not let startup overwrite an early user choice", async () => {
    const startup = deferred<ThemeDefinition | null>();
    vi.mocked(fetchTheme).mockImplementation((id) => id === "typesetgo" ? startup.promise : Promise.resolve(fixture(id)));
    render(<ThemeProvider><Probe /><Toaster /></ThemeProvider>);
    await waitFor(() => expect(fetchTheme).toHaveBeenCalledWith("typesetgo"));
    await act(async () => { await latest.setThemeSelection({ themeId: "choice", mode: "light" }); });
    await act(async () => { startup.resolve(fixture("typesetgo")); });
    expectCommitted(fixture("choice"), "light");
  });

  it("treats newer synchronous mode and variant choices as selection requests", async () => {
    await mount();
    const slow = deferred<ThemeDefinition | null>();
    vi.mocked(fetchTheme).mockReturnValue(slow.promise);
    let pending!: Promise<void>;
    act(() => { pending = latest.setTheme("slow"); latest.setMode("light"); });
    await act(async () => { slow.resolve(fixture("slow")); await pending; });
    expectCommitted(fixture("typesetgo"), "light");
    act(() => { latest.toggleMode(); latest.toggleMode(); });
    expectCommitted(fixture("typesetgo"), "light");
  });

  it("keeps the last committed theme after failure and accepts an explicit retry", async () => {
    await mount();
    vi.mocked(fetchTheme).mockResolvedValueOnce(null).mockResolvedValueOnce(fixture("retry"));
    await act(async () => { await latest.setTheme("retry"); });
    expectCommitted(fixture("typesetgo"), "dark");
    expect(latest.isLoading).toBe(false);
    expect(latest.selectionError).toContain("Try again");
    await act(async () => { await latest.setTheme("retry"); });
    expectCommitted(fixture("retry"), "dark");
    expect(latest.selectionError).toBeNull();
  });

  it("does not replace a saved theme just because the manifest failed", async () => {
    localStorage.setItem("typesetgo-theme-id", "saved");
    localStorage.setItem("typesetgo-theme-mode", "invalid");
    vi.mocked(fetchThemeManifest).mockResolvedValue({ themes: [], default: "typesetgo" });
    vi.mocked(fetchTheme).mockResolvedValue(fixture("saved"));
    await mount();
    expect(fetchTheme).toHaveBeenCalledWith("saved");
    expectCommitted(fixture("saved"), "dark");
  });

  it("preserves the saved preference when startup loading fails", async () => {
    localStorage.setItem("typesetgo-theme-id", "saved");
    localStorage.setItem("typesetgo-theme-mode", "light");
    vi.mocked(fetchThemeManifest).mockResolvedValue({ themes: ["saved"], default: "typesetgo" });
    vi.mocked(fetchTheme).mockResolvedValue(null);
    await mount();
    expect(latest.themeId).toBe("typesetgo");
    expect(latest.mode).toBe("dark");
    expect(latest.selectionError).toContain("saved theme");
    expect(localStorage.getItem("typesetgo-theme-id")).toBe("saved");
    expect(localStorage.getItem("typesetgo-theme-mode")).toBe("light");
  });

  it("ignores completions after unmount and survives storage failure", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Unavailable"); });
    const { unmount } = await mount();
    const slow = deferred<ThemeDefinition | null>();
    vi.mocked(fetchTheme).mockReturnValue(slow.promise);
    let pending!: Promise<void>;
    act(() => { pending = latest.setTheme("slow"); });
    const background = document.documentElement.style.getPropertyValue("--background");
    unmount();
    await act(async () => { slow.resolve(fixture("slow", "#301020")); await pending; });
    expect(document.documentElement.style.getPropertyValue("--background")).toBe(background);
  });

  it("initializes correctly under StrictMode effect replay", async () => {
    render(<StrictMode><ThemeProvider><Probe /><Toaster /></ThemeProvider></StrictMode>);
    await waitFor(() => expect(latest.isLoading).toBe(false));
    expectCommitted(fixture("typesetgo"), "dark");
  });
});
