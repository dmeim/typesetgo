import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Leaderboard from "@/pages/Leaderboard";
import { utcDayStart } from "@/lib/leaderboard-period";

const queries = vi.hoisted(() => ({
  ranges: {} as Record<string, unknown>,
  calls: [] as Array<{ timeRange: string; limit: number }>,
}));
const account = vi.hoisted(() => ({ current: { status: "unavailable", userId: null as string | null } }));
vi.mock("convex/react", () => ({
  useQuery: (_query: unknown, args: { timeRange: string; limit: number }) => {
    queries.calls.push(args);
    return queries.ranges[args.timeRange];
  },
}));
vi.mock("@/components/layout/useAccount", () => ({ useAccount: () => account.current }));
vi.mock("@/components/layout/Header", () => ({ default: () => <header aria-label="Site header" /> }));
vi.mock("@/components/layout/SiteFooter", () => ({ SiteFooter: () => <footer aria-label="Site footer" /> }));
afterEach(() => {
  cleanup();
  queries.calls = [];
  account.current = { status: "unavailable", userId: null };
});

function renderLeaderboard() {
  return render(<MemoryRouter><Leaderboard /></MemoryRouter>);
}

function choosePeriod(label: string) {
  // Radix tabs activate on mouse down.
  fireEvent.mouseDown(screen.getByRole("tab", { name: label }), { button: 0 });
}

function makeEntries(count: number, name = (index: number) => `VeryLongUsernameThatMustRemainReadable${index + 1}`) {
  return Array.from({ length: count }, (_, index) => ({
    userId: `users:stable-${index + 1}`,
    rank: index + 1,
    username: name(index),
    avatarUrl: null,
    wpm: 160 - index,
    createdAt: 1_700_000_000_000,
  }));
}

describe("leaderboard periods", () => {
  it("subscribes to every period and keeps independent loading and empty states", () => {
    queries.ranges = { "all-time": [], today: undefined, week: [] };
    renderLeaderboard();
    // Today is the board you land on.
    expect(screen.getByRole("tab", { name: "Today" })).toHaveAttribute("aria-selected", "true");
    let panel = screen.getByRole("tabpanel");
    expect(within(panel).getByRole("status")).toHaveTextContent("Loading today scores");
    expect(panel).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("banner", { name: "Site header" })).toBeInTheDocument();

    choosePeriod("All time");
    panel = screen.getByRole("tabpanel");
    expect(screen.getByRole("tab", { name: "All time" })).toHaveAttribute("aria-selected", "true");
    expect(within(panel).getByText("No scores yet")).toBeVisible();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    choosePeriod("7 days");
    panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-busy", "false");
    expect(within(panel).getByText("No scores yet")).toBeVisible();

    const refreshLimit = 50 + (Math.floor(utcDayStart(Date.now()) / 86_400_000) % 2);
    expect(queries.calls.slice(0, 3)).toEqual([
      { timeRange: "all-time", limit: 50 },
      { timeRange: "today", limit: refreshLimit },
      { timeRange: "week", limit: refreshLimit },
    ]);
  });

  it("replaces loading with received data", () => {
    queries.ranges = {};
    const result = renderLeaderboard();
    expect(screen.getByRole("status")).toHaveTextContent("Loading today scores");
    queries.ranges.today = [];
    result.rerender(<MemoryRouter><Leaderboard /></MemoryRouter>);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-busy", "false");
    expect(screen.getByText("No scores yet")).toBeVisible();
  });

  it("moves players to their place on the newly chosen period", () => {
    const players = ["Ada", "Grace", "Linus", "Ken", "Barbara"];
    const board = (order: number[]) => order.map((player, index) => ({
      userId: `users:${players[player]}`, rank: index + 1, username: players[player], avatarUrl: null, wpm: 150 - index, createdAt: 1_700_000_000_000,
    }));
    queries.ranges = { "all-time": board([0, 1, 2, 3, 4]), today: board([4, 3, 2]), week: board([1, 0, 2, 3, 4]) };
    renderLeaderboard();
    const winner = () => within(screen.getByRole("list", { name: /podium$/ }).querySelector('[data-podium-rank="1"]') as HTMLElement);
    expect(winner().getByRole("link", { name: "Barbara" })).toHaveAttribute("href", "/profile/users%3ABarbara");
    expect(screen.getByRole("list", { name: "Today podium" })).toBeVisible();
    expect(screen.queryByRole("list", { name: "Today ranks 4 and below" })).not.toBeInTheDocument();
    choosePeriod("All time");
    expect(winner().getByRole("link", { name: "Ada" })).toBeInTheDocument();
    choosePeriod("7 days");
    // Newly placed names fade in after a switch.
    expect(winner().getByRole("link", { name: "Grace" })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Last 7 days ranks 4 and below" })).getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("leaderboard board", () => {
  it("shows every score immediately and preserves full long usernames", () => {
    const entries = makeEntries(50);
    queries.ranges = { "all-time": entries.slice(0, 1), today: entries, week: entries.slice(0, 2) };
    renderLeaderboard();
    const podium = screen.getByRole("list", { name: "Today podium" });
    const ranks = screen.getByRole("list", { name: "Today ranks 4 and below" });
    expect(within(podium).getAllByRole("listitem")).toHaveLength(3);
    expect(within(ranks).getAllByRole("listitem")).toHaveLength(47);
    expect(ranks).toHaveAttribute("start", "4");
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getAllByRole("link")).toHaveLength(50);
    for (const entry of entries) {
      expect(within(panel).getByRole("link", { name: entry.username })).toHaveAttribute("href", `/profile/${encodeURIComponent(entry.userId)}`);
    }
    for (const [index, item] of within(podium).getAllByRole("listitem").entries()) {
      expect(within(item).getByText(`Rank ${index + 1}`)).toBeInTheDocument();
      expect(within(item).getByText(entries[index].username)).toBeVisible();
      // Scores are shown at their value on load, not counted up from zero.
      expect(within(item).getByText(String(entries[index].wpm))).toBeVisible();
    }
    const lastRow = within(ranks).getAllByRole("listitem").at(-1)!;
    expect(lastRow).toHaveTextContent(/^Rank 50/);
    // Available data has no entrance fade or slide on first load.
    expect(lastRow).not.toHaveStyle({ opacity: "0" });
    expect(lastRow.style.transform === "" || lastRow.style.transform === "none").toBe(true);
  });

  it.each([1, 2, 3])("reads %i podium entrants in rank order without invented winners", (count) => {
    const entries = makeEntries(count, (index) => ["First with a full wrapping name", "SecondUnbrokenNameThatMustRemainReadable", "Third"][index])
      // The server decides the ranks even when displayed scores are equal.
      .map((entry) => ({ ...entry, wpm: 140 }));
    queries.ranges = { "all-time": [], today: entries, week: [] };
    renderLeaderboard();

    const podium = screen.getByRole("list", { name: "Today podium" });
    const items = within(podium).getAllByRole("listitem");
    expect(items).toHaveLength(count);
    for (const [index, item] of items.entries()) {
      expect(item).toHaveAttribute("data-podium-rank", String(index + 1));
      expect(within(item).getByText(`Rank ${entries[index].rank}`)).toBeInTheDocument();
      expect(within(item).getByText(entries[index].username)).toBeVisible();
      expect(within(item).getByText("140")).toBeVisible();
    }
    expect(screen.queryByRole("list", { name: "Today ranks 4 and below" })).not.toBeInTheDocument();
    expect(screen.queryByText(`Rank ${count + 1}`)).not.toBeInTheDocument();
  });

  it("keeps an initial visible after an avatar fails and tries a replacement URL", () => {
    const entry = {
      userId: "users:ada",
      rank: 1,
      username: "Ada with a missing photo",
      avatarUrl: "/missing-avatar.png",
      wpm: 120,
      createdAt: 1_700_000_000_000,
    };
    queries.ranges = { "all-time": [], today: [entry], week: [] };
    const result = renderLeaderboard();
    const podium = screen.getByRole("list", { name: "Today podium" });
    const avatar = podium.querySelector("img")!;
    expect(avatar).toHaveAttribute("alt", "");
    fireEvent.error(avatar);
    expect(podium.querySelector("img")).toBeNull();
    expect(within(podium).getByText("A")).toBeVisible();
    expect(within(podium).getByText(entry.username)).toBeVisible();
    expect(within(podium).getByText("120")).toBeVisible();

    queries.ranges.today = [{ ...entry, avatarUrl: "/replacement-avatar.png" }];
    result.rerender(<MemoryRouter><Leaderboard /></MemoryRouter>);
    expect(podium.querySelector("img")).toHaveAttribute("src", "/replacement-avatar.png");
  });

  it("uses stable profile links for duplicate and renamed podium and list usernames", () => {
    const entries = makeEntries(4, (index) => (index < 2 ? "Same display name" : `Typist ${index + 1}`));
    queries.ranges = { "all-time": entries, today: entries, week: entries };
    const result = renderLeaderboard();
    for (const period of ["Today", "7 days", "All time"]) {
      choosePeriod(period);
      const panel = screen.getByRole("tabpanel");
      expect(within(panel).getAllByRole("link", { name: "Same display name" }).map((link) => link.getAttribute("href"))).toEqual([
        "/profile/users%3Astable-1", "/profile/users%3Astable-2",
      ]);
    }
    const panel = screen.getByRole("tabpanel");
    const firstLink = within(panel).getAllByRole("link")[0];
    const listLink = within(panel).getByRole("link", { name: "Typist 4" });
    queries.ranges["all-time"] = entries.map((entry) => ({ ...entry, username: `Renamed ${entry.rank}` }));
    result.rerender(<MemoryRouter><Leaderboard /></MemoryRouter>);
    expect(within(panel).getByRole("link", { name: "Renamed 1" })).toBe(firstLink);
    expect(firstLink).toHaveAttribute("href", "/profile/users%3Astable-1");
    expect(within(panel).getByRole("link", { name: "Renamed 4" })).toBe(listLink);
    expect(listLink).toHaveAttribute("href", "/profile/users%3Astable-4");
  });

  it("keeps older deployed responses readable without inventing profile IDs", () => {
    queries.ranges = { "all-time": [], today: [{
      rank: 1, username: "Legacy response", avatarUrl: null, wpm: 120, createdAt: 1_700_000_000_000,
    }], week: [] };
    renderLeaderboard();
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("Legacy response")).toBeVisible();
    expect(within(panel).queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("your standing", () => {
  it("marks the signed-in player and shows the gap to the player above", () => {
    const entries = makeEntries(6);
    queries.ranges = { "all-time": entries, today: entries.slice(0, 2), week: [] };
    account.current = { status: "ready", userId: "users:stable-5" };
    renderLeaderboard();
    choosePeriod("All time");
    const row = screen.getByRole("link", { name: entries[4].username }).closest("li")!;
    expect(within(row).getByText("You")).toBeVisible();
    const standing = screen.getByRole("complementary", { name: "Your standing" });
    expect(standing).toHaveTextContent("You’re #5 of all time");
    expect(standing).toHaveTextContent(`1 WPM behind ${entries[3].username}`);
    expect(standing).toHaveTextContent("156WPM");

    choosePeriod("Today");
    expect(screen.getByRole("complementary", { name: "Your standing" })).toHaveTextContent("You’re not in the top 50 today yet");
    expect(screen.queryByText("You")).not.toBeInTheDocument();
  });

  it("calls out the top spot and is absent while signed out or still connecting", () => {
    const entries = makeEntries(2);
    queries.ranges = { "all-time": entries, today: [], week: [] };
    account.current = { status: "ready", userId: "users:stable-1" };
    const result = renderLeaderboard();
    choosePeriod("All time");
    expect(screen.getByRole("complementary", { name: "Your standing" })).toHaveTextContent("Top of the board");

    account.current = { status: "loading", userId: null };
    result.rerender(<MemoryRouter><Leaderboard /></MemoryRouter>);
    expect(screen.queryByRole("complementary", { name: "Your standing" })).not.toBeInTheDocument();
    expect(screen.queryByText("You")).not.toBeInTheDocument();
  });
});
