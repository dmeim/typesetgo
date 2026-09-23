import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import UserStats from "@/pages/UserStats";

const fixture = vi.hoisted(() => ({
  user: { id: "clerk-owner" } as { id: string } | null,
  profile: { _id: "profile-owner", username: "A profile with a very long username", avatarUrl: null } as Record<string, unknown> | null | undefined,
  currentUser: { _id: "profile-owner" } as { _id: string } | null | undefined,
  achievements: {} as Record<string, number> | undefined,
  stats: undefined as Record<string, unknown> | undefined,
  refresh: vi.fn(),
  deleteResult: vi.fn(),
  achievementProps: undefined as { isLoading?: boolean; onRefresh?: () => Promise<unknown> } | undefined,
  chartData: [] as { value: number; isBest: boolean; isLowest: boolean }[],
}));

vi.mock("@/components/layout/useAccount", () => ({ useAccount: () => ({ status: fixture.currentUser ? "ready" : "loading", userId: fixture.currentUser?._id }) }));
vi.mock("@/components/layout/useAppAuth", () => ({ useAppAuth: () => ({ user: fixture.user }) }));
vi.mock("../../convex/_generated/api", () => ({ api: {
  users: { getUserById: "profile", getUser: "currentUser" },
  testResults: { getUserStatsByUserId: "stats", deleteResult: "deleteResult" },
  achievements: { getUserAchievementsByUserId: "achievements", recheckAllAchievements: "refresh" },
} }));
vi.mock("convex/react", () => ({
  useQuery: (query: "profile" | "stats" | "currentUser" | "achievements", args: unknown) => args === "skip" ? undefined : fixture[query],
  useMutation: (mutation: "refresh" | "deleteResult") => fixture[mutation],
}));
vi.mock("@/components/auth/AchievementsCategoryGrid", () => ({ default: (props: typeof fixture.achievementProps) => {
  fixture.achievementProps = props;
  return props?.isLoading ? <p>Loading achievements…</p> : <div>{props?.onRefresh && <button onClick={() => props.onRefresh?.()}>Refresh achievements</button>}</div>;
} }));
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ colors: {
  bg: { surface: "#222" }, text: { primary: "#eee", secondary: "#aaa" },
  border: { subtle: "#444", default: "#555" }, interactive: { secondary: { DEFAULT: "#ddd" } },
  status: { success: { DEFAULT: "#afa" }, error: { DEFAULT: "#faa" } },
} }) }));
vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));
vi.mock("recharts", () => ({
  LineChart: ({ data, children }: { data: typeof fixture.chartData; children: ReactNode }) => { fixture.chartData = data; return <div>{children}</div>; },
  CartesianGrid: () => null, Line: () => null, XAxis: () => null, YAxis: () => null, Dot: () => null,
}));

const baseResult = {
  _id: "test-legacy", wpm: 80, accuracy: 97.5, mode: "time", duration: 30_000,
  wordCount: 40, difficulty: "easy", punctuation: false, numbers: false,
  verification: "verified",
  createdAt: new Date("2026-09-15T12:00:00Z").getTime(),
};

function makeStats(results: Record<string, unknown>[] = [baseResult]) {
  return { totalTests: 350, bestWpm: 180, averageWpm: 95, averageAccuracy: 98.2, totalTimeTyped: 3_600_000, totalWordsTyped: 4000, totalCharactersTyped: 20000, allResults: results };
}

function mount() {
  return render(<MemoryRouter initialEntries={["/user/profile-owner"]}><Routes><Route path="/user/:userId" element={<UserStats />} /></Routes></MemoryRouter>);
}

beforeEach(() => {
  fixture.user = { id: "clerk-owner" };
  fixture.profile = { _id: "profile-owner", username: "A profile with a very long username", avatarUrl: null };
  fixture.currentUser = { _id: "profile-owner" };
  fixture.achievements = {};
  fixture.stats = makeStats();
  fixture.refresh.mockReset().mockResolvedValue({});
  fixture.deleteResult.mockReset().mockResolvedValue({});
  fixture.chartData = [];
});
afterEach(cleanup);

describe("profile capabilities and states", () => {
  it("refreshes only the verified owner's achievements and guards duplicate actions", async () => {
    let resolveRefresh!: (value: { pending: boolean }) => void;
    fixture.refresh.mockImplementation(() => new Promise<{ pending: boolean }>((resolve) => { resolveRefresh = resolve; }));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Refresh achievements" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh achievements" }));
    expect(fixture.refresh).toHaveBeenCalledExactlyOnceWith({ clerkId: "clerk-owner" });
    resolveRefresh({ pending: false });
    await waitFor(() => expect(fixture.achievementProps?.onRefresh).toBeDefined());
  });

  it.each(["visitor", "anonymous", "unresolved"])("withholds refresh and deletion for %s", (viewer) => {
    if (viewer === "visitor") fixture.currentUser = { _id: "profile-visitor" };
    if (viewer === "anonymous") fixture.user = null;
    if (viewer === "unresolved") fixture.currentUser = undefined;
    mount();
    expect(fixture.achievementProps?.onRefresh).toBeUndefined();
    expect(screen.queryByRole("button", { name: "Refresh achievements" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /View details/ }));
    expect(screen.queryByRole("button", { name: "Delete test" })).not.toBeInTheDocument();
    expect(fixture.refresh).not.toHaveBeenCalled();
  });

  it("distinguishes loading profile, loading achievements and an empty history", () => {
    fixture.stats = undefined;
    const view = mount();
    expect(screen.getByRole("status")).toHaveTextContent("Loading profile");
    expect(screen.queryByText("No tests saved yet")).not.toBeInTheDocument();
    view.unmount();
    fixture.stats = makeStats([]);
    fixture.achievements = undefined;
    mount();
    expect(screen.getByText("Loading achievements…")).toBeInTheDocument();
    expect(fixture.achievementProps?.isLoading).toBe(true);
    expect(screen.getByText("No tests saved yet")).toBeInTheDocument();
  });

  it("sorts recent rows by the selected metric and exposes sort direction", () => {
    fixture.stats = makeStats([
      { ...baseResult, _id: "fast", wpm: 120 },
      { ...baseResult, _id: "slow", wpm: 40, createdAt: baseResult.createdAt + 60_000 },
    ]);
    mount();
    expect(screen.getAllByRole("button", { name: /View details/ })[0]).toHaveTextContent("40 WPM");
    fireEvent.click(screen.getByRole("button", { name: "WPM" }));
    expect(screen.getAllByRole("button", { name: /View details/ })[0]).toHaveTextContent("120 WPM");
    fireEvent.click(screen.getByRole("button", { name: "WPM, descending" }));
    expect(screen.getAllByRole("button", { name: /View details/ })[0]).toHaveTextContent("40 WPM");
    expect(screen.getByRole("button", { name: "WPM, ascending" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows a not-found state without profile actions", () => {
    fixture.profile = null;
    mount();
    expect(screen.getByRole("heading", { name: "User not found" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("profile recent charts", () => {
  it("keeps 350 lifetime tests and the lifetime best separate from the latest 100 sample", async () => {
    fixture.stats = makeStats(Array.from({ length: 100 }, (_, index) => ({ ...baseResult, _id: `test-${index}`, wpm: 50 + index, createdAt: baseResult.createdAt - index * 60_000, isValid: index !== 99, verification: index === 99 ? "invalid" : "verified" })));
    mount();
    expect(screen.getByText(/350 verified tests/)).toBeInTheDocument();
    expect(screen.getByText(/Showing 100 saved tests \(latest 100 maximum\), including unverified and invalid tests/)).toBeInTheDocument();
    const card = screen.getByRole("button", { name: "Best WPM: 180. View recent tests" });
    card.focus();
    fireEvent.click(card);
    const dialog = await screen.findByRole("dialog", { name: "Recent WPM" });
    expect(within(dialog).getByText("Lifetime best WPM: 180")).toBeInTheDocument();
    expect(within(dialog).getByText(/99 verified tests from the latest 100 saved tests/)).toBeInTheDocument();
    expect(fixture.chartData).toHaveLength(99);
    expect(fixture.chartData.find((point) => point.isBest)?.value).toBe(148);
    expect(fixture.chartData.find((point) => point.isLowest)?.value).toBe(50);
    const highest = within(dialog).getByRole("button", { name: "Highest in sample" });
    expect(highest).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(highest);
    expect(highest).toHaveAttribute("aria-pressed", "false");
    expect(dialog.querySelector("summary")).toHaveTextContent("View chart data (99 tests)");
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(card).toHaveFocus());
  });

  it("labels character estimates rather than claiming measured keystrokes", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Estimated characters:/ }));
    expect(await screen.findByRole("dialog", { name: "Recent estimated characters" })).toBeInTheDocument();
    expect(screen.getByText(/Estimated as words × 5/)).toBeInTheDocument();
    expect(fixture.chartData[0].value).toBe(200);
  });

  it("marks the earliest tied extrema without modifying saved results", async () => {
    const results = [90, 60, 90, 60].map((wpm, index) => Object.freeze({
      ...baseResult, _id: `test-${index}`, wpm, createdAt: baseResult.createdAt - index * 60_000,
    }));
    Object.freeze(results);
    fixture.stats = makeStats(results);
    mount();
    fireEvent.click(screen.getByRole("button", { name: /^Best WPM:/ }));
    await screen.findByRole("dialog", { name: "Recent WPM" });
    expect(fixture.chartData.map(({ value, isBest, isLowest }) => ({ value, isBest, isLowest }))).toEqual([
      { value: 60, isBest: false, isLowest: true },
      { value: 90, isBest: true, isLowest: false },
      { value: 60, isBest: false, isLowest: false },
      { value: 90, isBest: false, isLowest: false },
    ]);
    expect(results.map((result) => result.wpm)).toEqual([90, 60, 90, 60]);
  });

  it("keeps an invalid-only recent history distinct from missing history", async () => {
    fixture.stats = makeStats([{ ...baseResult, isValid: false, verification: "invalid" }]);
    mount();
    fireEvent.click(screen.getByRole("button", { name: /^Best WPM:/ }));
    await screen.findByRole("dialog", { name: "Recent WPM" });
    expect(screen.getByText(/0 verified tests from the latest 1 saved tests/)).toBeInTheDocument();
    expect(screen.getByText("No verified tests in the recent history sample.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Highest in sample" })).not.toBeInTheDocument();
  });

  it("shows unverified saves as history only and excludes them from verified charts", async () => {
    fixture.stats = makeStats([
      { ...baseResult, _id: "verified", wpm: 80 },
      { ...baseResult, _id: "unverified", wpm: 99, verification: "unverified", createdAt: baseResult.createdAt + 1 },
      { ...baseResult, _id: "invalid", wpm: 120, verification: "invalid", isValid: false, createdAt: baseResult.createdAt + 2 },
    ]);
    mount();
    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(screen.getByText("Invalid")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Unverified").closest("button")!);
    const detail = screen.getByRole("dialog", { name: "Test details" });
    expect(within(detail).getByText(/Saved for history only/)).toBeInTheDocument();
    fireEvent.keyDown(detail, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /^Best WPM:/ }));
    const chart = await screen.findByRole("dialog", { name: "Recent WPM" });
    expect(within(chart).getByText(/1 verified tests from the latest 3 saved tests/)).toBeInTheDocument();
    expect(fixture.chartData.map((point) => point.value)).toEqual([80]);
  });
});

describe("profile detail dialogs", () => {
  it.each(["time", "words", "quote", "zen", "preset", "future-mode"])("keeps %s mode and settings readable in history and details", (mode) => {
    fixture.stats = makeStats([{ ...baseResult, mode, punctuation: true, numbers: true, capitalization: true, isValid: false, verification: "invalid", invalidReason: "Recorded invalid reason" }]);
    mount();
    const row = screen.getByRole("button", { name: /View details/ });
    const label = mode.charAt(0).toUpperCase() + mode.slice(1);
    expect(row).toHaveTextContent(label);
    expect(row).toHaveTextContent("Invalid");
    fireEvent.click(row);
    const dialog = screen.getByRole("dialog", { name: "Test details" });
    expect(within(dialog).getByText(label)).toBeInTheDocument();
    expect(within(dialog).getByText("caps")).toBeInTheDocument();
    expect(within(dialog).getByText("punctuation")).toBeInTheDocument();
    expect(within(dialog).getByText("numbers")).toBeInTheDocument();
    expect(within(dialog).getByText(/Invalid test. Excluded from lifetime statistics and charts. Recorded invalid reason/)).toBeInTheDocument();
  });

  it("preserves absent metrics while showing recorded zero", () => {
    fixture.stats = makeStats([{ ...baseResult, wordsIncorrect: 0, charsExtra: 0 }]);
    mount();
    fireEvent.click(screen.getByRole("button", { name: /View details/ }));
    const dialog = screen.getByRole("dialog", { name: "Test details" });
    expect(within(dialog).getByText("Correct words").nextElementSibling).toHaveTextContent("Not recorded");
    expect(within(dialog).getByText("Missed characters").nextElementSibling).toHaveTextContent("Not recorded");
    expect(within(dialog).getByText("Incorrect words").nextElementSibling).toHaveTextContent("0");
    expect(within(dialog).getByText("Extra characters").nextElementSibling).toHaveTextContent("0");
  });

  it("dismisses the nested confirmation first, restores focus and never deletes on Escape", async () => {
    mount();
    const row = screen.getByRole("button", { name: /View details/ });
    row.focus();
    fireEvent.click(row);
    const deleteButton = screen.getByRole("button", { name: "Delete test" });
    fireEvent.click(deleteButton);
    const confirmation = screen.getByRole("alertdialog", { name: "Delete this test?" });
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    fireEvent.keyDown(confirmation, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog", { name: "Delete this test?" })).not.toBeInTheDocument());
    expect(screen.getByRole("dialog", { name: "Test details" })).toBeInTheDocument();
    await waitFor(() => expect(deleteButton).toHaveFocus());
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    await waitFor(() => expect(row).toHaveFocus());
    expect(fixture.deleteResult).not.toHaveBeenCalled();
  });

  it("keeps a failed deletion reviewable and permits an explicit retry", async () => {
    fixture.deleteResult.mockRejectedValueOnce(new Error("Offline"));
    mount();
    fireEvent.click(screen.getByRole("button", { name: /View details/ }));
    fireEvent.click(screen.getByRole("button", { name: "Delete test" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not delete this test");
    expect(screen.getByRole("alertdialog", { name: "Delete this test?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fixture.deleteResult).toHaveBeenCalledTimes(2);
    expect(fixture.deleteResult).toHaveBeenLastCalledWith({ resultId: "test-legacy", clerkId: "clerk-owner" });
  });

  it("guards repeated confirmation and dismissal during a pending deletion", async () => {
    let finishDelete!: () => void;
    fixture.deleteResult.mockImplementation(() => new Promise<void>((resolve) => { finishDelete = resolve; }));
    mount();
    fireEvent.click(screen.getByRole("button", { name: /View details/ }));
    fireEvent.click(screen.getByRole("button", { name: "Delete test" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    const pendingButton = screen.getByRole("button", { name: "Deleting…" });
    expect(pendingButton).toBeDisabled();
    fireEvent.click(pendingButton);
    fireEvent.keyDown(screen.getByRole("alertdialog", { name: "Delete this test?" }), { key: "Escape", code: "Escape" });
    expect(screen.getByRole("alertdialog", { name: "Delete this test?" })).toBeInTheDocument();
    expect(fixture.deleteResult).toHaveBeenCalledTimes(1);
    finishDelete();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
