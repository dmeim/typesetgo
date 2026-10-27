import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { getFunctionName } from "convex/server";
import { AppAuthContext, unavailableAuth, type AppAuth, type AppAuthUser } from "@/components/layout/useAppAuth";
import { AccountContext, unavailableAccount } from "@/components/layout/useAccount";
import { ThemeContext, type ThemeContextValue } from "@/context/ThemeContext";
import { ProfilePage } from "@/components/profile/ProfilePage";
import { getAchievementsByCategory } from "@/lib/achievement-definitions";
import type { ThemeColors, ThemeDefinition } from "@/types/theme";
import type { Id } from "../../convex/_generated/dataModel";
import theme from "../../public/themes/typesetgo.json";

const mocks = vi.hoisted(() => ({
  queries: {} as Record<string, unknown>,
  queryArgs: {} as Record<string, unknown[]>,
  mutations: {} as Record<string, ReturnType<typeof vi.fn>>,
}));

vi.mock("convex/react", () => ({
  useQuery: (ref: Parameters<typeof getFunctionName>[0], args: unknown) => {
    const name = getFunctionName(ref);
    if (args === "skip") return undefined;
    (mocks.queryArgs[name] ??= []).push(args);
    const value = mocks.queries[name];
    return typeof value === "function" ? (value as (input: unknown) => unknown)(args) : value;
  },
  useMutation: (ref: Parameters<typeof getFunctionName>[0]) => mocks.mutations[getFunctionName(ref)] ??= vi.fn().mockResolvedValue({ pending: false }),
}));
vi.mock("@/hooks/useAnimatedCounter", () => ({ useAnimatedCounter: (value: number) => value }));

const OWNER = "users_owner" as Id<"users">;
const signedIn: AppAuth = { ...unavailableAuth, available: true, status: "signed-in", isSignedIn: true, user: { id: "clerk_owner" } as AppAuthUser };
const now = Date.now();

const results = Array.from({ length: 6 }, (_, index) => ({
  _id: `result_${index}`,
  wpm: index === 2 ? 91 : 60 + index,
  accuracy: 96,
  mode: "time",
  duration: 30_000,
  wordCount: 30,
  difficulty: "beginner",
  punctuation: false,
  numbers: false,
  capitalization: false,
  wordsCorrect: index === 0 ? undefined : 28,
  wordsIncorrect: 1,
  charsMissed: 0,
  charsExtra: 0,
  isValid: index !== 4,
  verification: index === 4 ? "invalid" : "verified",
  createdAt: now - index * 86_400_000,
}));

const users: Record<string, { username: string }> = { [OWNER]: { username: "Owner Person" }, users_other: { username: "Other Player" } };

function themeValue(): ThemeContextValue {
  return {
    theme: {} as ThemeDefinition, themeId: "typesetgo", themeName: "TypeSetGo", variantId: "default", variant: {} as ThemeContextValue["variant"],
    mode: "dark", userSelectionRevision: 0, setTheme: vi.fn(), setVariant: vi.fn(), setThemeSelection: vi.fn().mockResolvedValue(undefined),
    setMode: vi.fn(), toggleMode: vi.fn(), colors: theme.variants.default.dark as unknown as ThemeColors, supportsLightMode: true,
    isLoading: false, selectionError: null,
  };
}

function Where() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

function view(path: string, auth: AppAuth = signedIn) {
  const account = auth.isSignedIn ? { ...unavailableAccount, status: "ready" as const, userId: OWNER } : unavailableAccount;
  const tree = (children: ReactNode) => (
    <AppAuthContext.Provider value={auth}>
      <AccountContext.Provider value={account}>
        <ThemeContext.Provider value={themeValue()}>{children}</ThemeContext.Provider>
      </AccountContext.Provider>
    </AppAuthContext.Provider>
  );
  return render(tree(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/profile/*" element={<><ProfilePage /><Where /></>} /></Routes>
    </MemoryRouter>,
  ));
}

beforeEach(() => {
  localStorage.clear();
  mocks.mutations = {};
  mocks.queryArgs = {};
  mocks.queries = {
    "users:getUserById": ({ userId }: { userId: string }) => users[userId] ? { _id: userId, ...users[userId], avatarUrl: null, createdAt: now - 400 * 86_400_000 } : null,
    "testResults:getUserStatsByUserId": () => ({
      totalTests: 120, averageWpm: 64, bestWpm: 91, averageAccuracy: 96.2, totalTimeTyped: 3_600_000,
      totalWordsTyped: 4200, totalCharactersTyped: 21_000, allResults: results,
    }),
    "achievements:getUserAchievementsByUserId": Object.fromEntries(getAchievementsByCategory("speed").slice(0, 3).map((achievement) => [achievement.id, now])),
    "streaks:getUserStreak": { currentStreak: 4, longestStreak: 12, lastActivityDate: null },
    "preferences:getPreferences": null,
  };
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline in tests")));
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("sends /profile to your own shareable link and shows your stats and streak", async () => {
  view("/profile");
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(`/profile/${OWNER}`));
  expect(screen.getByRole("heading", { name: "Owner Person" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Lifetime statistics" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Best WPM: 91/ })).toBeInTheDocument();
  expect(screen.getAllByText("4-day streak").length).toBeGreaterThan(0);
  expect(mocks.queryArgs["streaks:getUserStreak"]).toContainEqual({ clerkId: "clerk_owner" });
});

it("shows only public stats for someone else, without loading their streak or achievements", () => {
  view("/profile/users_other");
  expect(screen.getByText(/public profile/)).toHaveTextContent("You’re viewing Other Player’s public profile");
  expect(screen.getByRole("heading", { name: "Other Player" })).toBeInTheDocument();
  expect(within(screen.getByRole("main")).queryByText(/day streak/)).toBeNull();
  expect(mocks.queryArgs["achievements:getUserAchievementsByUserId"]).toEqual(expect.not.arrayContaining([{ userId: "users_other" }]));
  expect(screen.queryByRole("button", { current: "page" })).toBeNull();
});

it("greets a brand-new player with a start prompt instead of zeros", async () => {
  mocks.queries["testResults:getUserStatsByUserId"] = () => ({
    totalTests: 0, averageWpm: 0, bestWpm: 0, averageAccuracy: 0, totalTimeTyped: 0,
    totalWordsTyped: 0, totalCharactersTyped: 0, allResults: [],
  });
  mocks.queries["streaks:getUserStreak"] = { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
  view("/profile");
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(`/profile/${OWNER}`));
  expect(screen.getByText("No stats yet")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Start a test" })).toHaveAttribute("href", "/");
  expect(screen.queryByRole("button", { name: /^Best WPM:/ })).toBeNull();
  expect(screen.queryByText(/0-day streak|Best streak 0/)).toBeNull();
});

it("tells visitors when a player does not exist", () => {
  view("/profile/users_gone", unavailableAuth);
  expect(screen.getByRole("heading", { name: "We couldn’t find that player" })).toBeInTheDocument();
});

it("opens a history row and deletes the test after confirming", async () => {
  view("/profile/history");
  expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Today" })).toBeInTheDocument();
  const row = screen.getAllByRole("button", { name: /Test details/ })[0];
  fireEvent.click(row);
  expect(row).toHaveAttribute("aria-expanded", "true");
  expect(screen.getAllByText("Not recorded").length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "Delete test" }));
  const confirm = await screen.findByRole("alertdialog", { name: "Delete this test?" });
  fireEvent.click(within(confirm).getByRole("button", { name: "Confirm delete" }));
  await waitFor(() => expect(mocks.mutations["testResults:deleteResult"]).toHaveBeenCalledWith({ resultId: "result_0", clerkId: "clerk_owner" }));
});

it("lists achievement categories, opens every level, and lets the owner refresh", async () => {
  view("/profile/achievements");
  expect(screen.getByText(/^3 of [\d,]+ earned$/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^Speed Demons: 3 of \d+ earned/ }));
  expect(await screen.findByRole("dialog", { name: "Speed Demons" })).toHaveTextContent("You are here");
  fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: "Refresh achievements" }));
  await waitFor(() => expect(mocks.mutations["achievements:recheckAllAchievements"]).toHaveBeenCalledWith({ clerkId: "clerk_owner" }));
});
