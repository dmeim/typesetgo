import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getFunctionName } from "convex/server";
import { AppAuthContext, unavailableAuth, type AppAuth, type AppAuthUser } from "@/components/layout/useAppAuth";
import { AccountContext, unavailableAccount } from "@/components/layout/useAccount";
import { ThemeContext, type ThemeContextValue } from "@/context/ThemeContext";
import { ProfilePage } from "@/components/profile/ProfilePage";
import { mergeProfileSettings, persistProfileSettings, readProfileSettings } from "@/components/profile/profile-settings";
import { useProfileSettings } from "@/components/profile/useProfileSettings";
import { toAccountPreferences } from "@/lib/practice-preferences";
import { DEFAULT_SETTINGS, loadLayoutSettings, loadSettings, saveSettings } from "@/lib/storage-utils";
import { TEXT_SIZE_MAX, normalizePracticeSettings, type SettingsState } from "@/lib/typing-constants";
import type { ThemeColors, ThemeDefinition } from "@/types/theme";
import type { Id } from "../../convex/_generated/dataModel";
import theme from "../../public/themes/typesetgo.json";

const mocks = vi.hoisted(() => ({
  queries: {} as Record<string, unknown>,
  mutations: {} as Record<string, ReturnType<typeof vi.fn>>,
}));

vi.mock("convex/react", () => ({
  useQuery: (ref: Parameters<typeof getFunctionName>[0], args: unknown) => (args === "skip" ? undefined : mocks.queries[getFunctionName(ref)]),
  useMutation: (ref: Parameters<typeof getFunctionName>[0]) => mocks.mutations[getFunctionName(ref)] ??= vi.fn().mockResolvedValue(undefined),
}));

const signedIn: AppAuth = { ...unavailableAuth, available: true, status: "signed-in", isSignedIn: true, user: { id: "user_1" } as AppAuthUser };
const readyAccount = { ...unavailableAccount, status: "ready" as const, userId: "users_row_1" as Id<"users"> };

function themeValue(): ThemeContextValue {
  return {
    theme: {} as ThemeDefinition,
    themeId: "typesetgo",
    themeName: "TypeSetGo",
    variantId: "default",
    variant: {} as ThemeContextValue["variant"],
    mode: "dark",
    userSelectionRevision: 0,
    setTheme: vi.fn().mockResolvedValue(undefined),
    setVariant: vi.fn(),
    setThemeSelection: vi.fn().mockResolvedValue(undefined),
    setMode: vi.fn(),
    toggleMode: vi.fn(),
    colors: theme.variants.default.dark as unknown as ThemeColors,
    supportsLightMode: true,
    isLoading: false,
    selectionError: null,
  };
}

function Providers({ auth, children }: { auth: AppAuth; children: ReactNode }) {
  return (
    <AppAuthContext.Provider value={auth}>
      <AccountContext.Provider value={auth.isSignedIn ? readyAccount : unavailableAccount}>
        <ThemeContext.Provider value={themeValue()}>{children}</ThemeContext.Provider>
      </AccountContext.Provider>
    </AppAuthContext.Provider>
  );
}

const wrapper = (auth: AppAuth) => ({ children }: { children: ReactNode }) => <Providers auth={auth}>{children}</Providers>;

/** What Home's TypingPractice starts with, read the same way it reads it. */
const homeStartsWith = () => normalizePracticeSettings({ ...DEFAULT_SETTINGS, ...loadSettings(), presetText: "" } as SettingsState);

function accountPreferences(changes: Partial<SettingsState> = {}, layout = { linePreview: 2, maxWordsPerLine: 9 }) {
  const settings = normalizePracticeSettings({ ...DEFAULT_SETTINGS, presetText: "", ...changes });
  return { _id: "prefs_1", userId: readyAccount.userId, updatedAt: 1,
    ...toAccountPreferences(settings, layout, { themeId: "typesetgo", themeVariantId: "default", themeMode: "dark" }) };
}

beforeEach(() => {
  localStorage.clear();
  mocks.queries = {};
  mocks.mutations = {};
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline in tests")));
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("profile settings storage", () => {
  it("starts from what Home saved", () => {
    saveSettings({ ...homeStartsWith(), keyboardStyle: "finger", typingFontFamily: "lexend" });
    expect(readProfileSettings()).toMatchObject({ keyboardStyle: "finger", typingFontFamily: "lexend", linePreview: 3, maxWordsPerLine: 7 });
  });

  it("stores edits where Home reads them, within Home's limits", () => {
    const edited = mergeProfileSettings(readProfileSettings(), { typingFontSize: 50, linePreview: 99, maxWordsPerLine: 4, keyboardStyle: "keycaps" });
    persistProfileSettings(edited);
    expect(homeStartsWith()).toMatchObject({ typingFontSize: TEXT_SIZE_MAX, keyboardStyle: "keycaps" });
    expect(loadLayoutSettings()).toEqual({ linePreview: 6, maxWordsPerLine: 4 });
  });
});

describe("useProfileSettings", () => {
  it("saves every change locally so Home and a reload see it, signed out", () => {
    const { result } = renderHook(() => useProfileSettings(), { wrapper: wrapper(unavailableAuth) });
    act(() => result.current.update({ ghostWriterEnabled: true, ghostWriterSpeed: 85, textAlign: "left", linePreview: 5 }));
    expect(homeStartsWith()).toMatchObject({ ghostWriterEnabled: true, ghostWriterSpeed: 85, textAlign: "left" });
    expect(loadLayoutSettings()?.linePreview).toBe(5);
    expect(mocks.mutations["preferences:savePreferences"]).not.toHaveBeenCalled();
  });

  it("loads account defaults when signed in and only saves after an edit", async () => {
    mocks.queries["preferences:getPreferences"] = accountPreferences({ typingFontFamily: "lexend", keyboardStyle: "finger" });
    const { result } = renderHook(() => useProfileSettings(), { wrapper: wrapper(signedIn) });
    expect(result.current.settings).toMatchObject({ typingFontFamily: "lexend", keyboardStyle: "finger", linePreview: 2, maxWordsPerLine: 9 });
    expect(homeStartsWith()).toMatchObject({ typingFontFamily: "lexend", keyboardStyle: "finger" });
    const save = () => mocks.mutations["preferences:savePreferences"];
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(save()).not.toHaveBeenCalled();

    act(() => result.current.update({ keyboardStyle: "keycaps" }));
    await waitFor(() => expect(save()).toHaveBeenCalledTimes(1));
    expect(save()).toHaveBeenCalledWith({ clerkId: "user_1", preferences: expect.objectContaining({
      keyboardStyle: "keycaps", typingFontFamily: "lexend", linePreview: 2, maxWordsPerLine: 9, themeId: "typesetgo",
    }) });
  });

  it("keeps edits made before the account loads, and flushes the save when the page closes", () => {
    const { result, rerender, unmount } = renderHook(() => useProfileSettings(), { wrapper: wrapper(signedIn) });
    act(() => result.current.update({ keyboardStyle: "legacy" }));
    mocks.queries["preferences:getPreferences"] = accountPreferences({ keyboardStyle: "finger", soundEnabled: false });
    rerender();
    expect(result.current.settings).toMatchObject({ keyboardStyle: "legacy", soundEnabled: false });
    unmount();
    expect(mocks.mutations["preferences:savePreferences"]).toHaveBeenCalledWith({ clerkId: "user_1", preferences: expect.objectContaining({
      keyboardStyle: "legacy", soundEnabled: false,
    }) });
  });
});

describe("Profile page settings tabs", () => {
  const renderAt = (path: string, auth: AppAuth = unavailableAuth) => render(
    <Providers auth={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/profile/*" element={<ProfilePage />} /></Routes>
      </MemoryRouter>
    </Providers>,
  );

  it("changes the keyboard style Home uses, signed out", () => {
    renderAt("/profile/keyboard");
    expect(screen.getByRole("heading", { name: "Keyboard" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Keycaps/ }));
    expect(screen.getByRole("radio", { name: /Keycaps/ })).toHaveAttribute("aria-checked", "true");
    expect(homeStartsWith().keyboardStyle).toBe("keycaps");
    fireEvent.click(screen.getByRole("radio", { name: "Dvorak" }));
    expect(homeStartsWith().keyboardLayout).toBe("dvorak");
  });

  it("shows a sign-in prompt on account tabs when signed out, and no account tabs", () => {
    renderAt("/profile/history");
    expect(screen.getByRole("heading", { name: "Sign in to see your history" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Profile sections" })).not.toHaveTextContent("Achievements");
  });
});
