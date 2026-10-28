import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountThemeSync } from "@/components/layout/AccountThemeSync";

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string },
  stored: undefined as unknown,
  theme: { themeId: "typesetgo", variantId: "default", mode: "dark" as "dark" | "light", isLoading: false, userSelectionRevision: 0 },
  setThemeSelection: vi.fn(async () => {}),
  save: vi.fn(async () => "prefs-id"),
}));
vi.mock("@/components/layout/useAppAuth", () => ({ useAppAuth: () => ({ user: mocks.user }) }));
vi.mock("@/components/layout/useAccount", () => ({ useAccount: () => ({ status: "ready" }) }));
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ ...mocks.theme, setThemeSelection: mocks.setThemeSelection }) }));
vi.mock("convex/react", () => ({
  useQuery: (_reference: unknown, args: unknown) => (args === "skip" ? undefined : mocks.stored),
  useMutation: () => mocks.save,
}));

function storedPreferences(updates: Record<string, unknown> = {}) {
  return { _id: "prefs-id", _creationTime: 1, userId: "users:1", updatedAt: 2, themeId: "nord", themeVariantId: "default",
    themeMode: "light", soundEnabled: false, typingFontSize: 3, ...updates };
}
/** A pick from the Dock or the Profile page: the provider bumps its revision and changes the selection. */
function pick(updates: Partial<typeof mocks.theme>) {
  mocks.theme = { ...mocks.theme, ...updates, userSelectionRevision: mocks.theme.userSelectionRevision + 1 };
}

beforeEach(() => {
  vi.useFakeTimers();
  mocks.user = null; mocks.stored = undefined;
  mocks.theme = { themeId: "typesetgo", variantId: "default", mode: "dark", isLoading: false, userSelectionRevision: 0 };
  mocks.setThemeSelection.mockClear(); mocks.save.mockClear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("AccountThemeSync", () => {
  it("applies the account theme once per sign-in, not again on later renders", () => {
    const { rerender } = render(<AccountThemeSync />);
    mocks.user = { id: "player" }; mocks.stored = storedPreferences();
    rerender(<AccountThemeSync />);
    expect(mocks.setThemeSelection).toHaveBeenCalledTimes(1);
    expect(mocks.setThemeSelection).toHaveBeenCalledWith({ themeId: "nord", variantId: "default", mode: "light" },
      { source: "preferences", expectedUserSelectionRevision: 0 });
    mocks.stored = storedPreferences({ updatedAt: 3 });
    rerender(<AccountThemeSync />);
    expect(mocks.setThemeSelection).toHaveBeenCalledTimes(1);
  });

  it("saves a light/dark pick made on any page, keeping the rest of the account preferences", () => {
    mocks.user = { id: "player" }; mocks.stored = storedPreferences({ themeId: "typesetgo", themeMode: "dark" });
    const { rerender } = render(<AccountThemeSync />);
    pick({ mode: "light" });
    rerender(<AccountThemeSync />);
    act(() => { vi.advanceTimersByTime(400); });
    expect(mocks.save).toHaveBeenCalledWith({ clerkId: "player", preferences: { themeId: "typesetgo", themeVariantId: "default",
      themeMode: "light", soundEnabled: false, typingFontSize: 3 } });
  });

  it("keeps a pick made before the account loaded and saves it instead of applying the account theme", () => {
    const { rerender } = render(<AccountThemeSync />);
    pick({ mode: "light" });
    rerender(<AccountThemeSync />);
    mocks.user = { id: "player" }; mocks.stored = storedPreferences({ themeId: "typesetgo", themeMode: "dark" });
    rerender(<AccountThemeSync />);
    act(() => { vi.advanceTimersByTime(400); });
    expect(mocks.setThemeSelection).not.toHaveBeenCalled();
    expect(mocks.save).toHaveBeenCalledWith({ clerkId: "player", preferences: expect.objectContaining({ themeMode: "light" }) });
  });

  it("saves each pick once, so a change from another tab is never written back", () => {
    mocks.user = { id: "player" }; mocks.stored = storedPreferences({ themeId: "typesetgo", themeMode: "dark" });
    const { rerender } = render(<AccountThemeSync />);
    pick({ mode: "light" });
    rerender(<AccountThemeSync />);
    act(() => { vi.advanceTimersByTime(400); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    mocks.stored = storedPreferences({ themeId: "typesetgo", themeMode: "dark", updatedAt: 9 });
    rerender(<AccountThemeSync />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });

  it("does not carry one account's picks into another account", () => {
    mocks.user = { id: "first" }; mocks.stored = storedPreferences({ themeId: "typesetgo", themeMode: "dark" });
    const { rerender } = render(<AccountThemeSync />);
    pick({ mode: "light" });
    rerender(<AccountThemeSync />);
    act(() => { vi.advanceTimersByTime(400); });
    mocks.save.mockClear();
    mocks.user = { id: "second" }; mocks.stored = storedPreferences({ themeId: "second-theme", themeMode: "dark" });
    rerender(<AccountThemeSync />);
    expect(mocks.setThemeSelection).toHaveBeenCalledWith({ themeId: "second-theme", variantId: "default", mode: "dark" },
      { source: "preferences", expectedUserSelectionRevision: 1 });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
