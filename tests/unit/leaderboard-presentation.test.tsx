import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Leaderboard from "@/pages/Leaderboard";
import { utcDayStart } from "@/lib/leaderboard-period";

const queries = vi.hoisted(() => ({
  ranges: {} as Record<string, unknown>,
  calls: [] as Array<{ timeRange: string; limit: number; periodStart?: number }>,
}));
vi.mock("convex/react", () => ({
  useQuery: (_query: unknown, args: { timeRange: string; limit: number; periodStart?: number }) => {
    queries.calls.push(args);
    return queries.ranges[args.timeRange];
  },
}));
afterEach(() => {
  cleanup();
  queries.calls = [];
});

function renderLeaderboard() {
  return render(<MemoryRouter><Leaderboard /></MemoryRouter>);
}

describe("leaderboard ranges", () => {
  it("keeps all ranges available with independent loading and empty states", () => {
    queries.ranges = { "all-time": [], today: undefined, week: [] };
    renderLeaderboard();
    const allTime = screen.getByRole("region", { name: "All-Time" });
    const today = screen.getByRole("region", { name: "Today" });
    const week = screen.getByRole("region", { name: "This Week" });
    expect(within(allTime).getByText("No scores yet")).toBeVisible();
    expect(within(today).getByRole("status")).toHaveTextContent("Loading today scores");
    expect(today).toHaveAttribute("aria-busy", "true");
    expect(within(week).getByText("No scores yet")).toBeVisible();
    expect(screen.getByRole("link", { name: "Homepage" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(queries.calls).toEqual([
      { timeRange: "all-time", limit: 50 },
      { timeRange: "today", limit: 50, periodStart: utcDayStart(Date.now()) },
      { timeRange: "week", limit: 50, periodStart: utcDayStart(Date.now()) },
    ]);
  });

  it("shows every score immediately and preserves full long usernames", () => {
    const entries = Array.from({ length: 50 }, (_, index) => ({
      userId: `users:stable-${index + 1}`,
      rank: index + 1,
      username: `VeryLongUsernameThatMustRemainReadable${index + 1}`,
      avatarUrl: null,
      wpm: 160 - index,
      createdAt: 1_700_000_000_000,
    }));
    queries.ranges = { "all-time": entries, today: entries.slice(0, 1), week: entries.slice(0, 2) };
    renderLeaderboard();
    const allTime = screen.getByRole("region", { name: "All-Time" });
    expect(within(allTime).getAllByRole("listitem")).toHaveLength(3);
    expect(within(allTime).getAllByRole("row")).toHaveLength(48);
    expect(within(allTime).getByText(entries[0].username)).toBeVisible();
    expect(within(allTime).getByText(entries[49].username)).toBeVisible();
    expect(within(allTime).getByRole("columnheader", { name: "WPM" })).toBeVisible();
    expect(within(allTime).getAllByRole("link")).toHaveLength(50);
    for (const entry of entries) {
      expect(within(allTime).getByRole("link", { name: entry.username })).toHaveAttribute("href", `/user/${entry.userId}`);
    }
    for (const [index, item] of within(allTime).getAllByRole("listitem").entries()) {
      expect(within(item).getByText(`Rank ${index + 1}`)).toBeInTheDocument();
      expect(within(item).getByText(entries[index].username)).toBeVisible();
    }
    // Available data has no per-row entrance opacity or delayed animation.
    expect(within(allTime).getByText(entries[49].username).closest("tr")).not.toHaveAttribute("style");
  });

  it("replaces loading with received data independently of other ranges", () => {
    queries.ranges = {};
    const result = renderLeaderboard();
    expect(screen.getAllByRole("status")).toHaveLength(3);
    queries.ranges.today = [];
    result.rerender(<MemoryRouter><Leaderboard /></MemoryRouter>);
    expect(screen.getAllByRole("status")).toHaveLength(2);
    const today = screen.getByRole("region", { name: "Today" });
    expect(today).toHaveAttribute("aria-busy", "false");
    expect(within(today).getByText("No scores yet")).toBeVisible();
  });

  it.each([1, 2, 3])("reads %i podium entrants in rank order without invented winners", (count) => {
    const entries = Array.from({ length: count }, (_, index) => ({
      userId: `users:stable-${index + 1}`,
      rank: index + 1,
      username: ["First with a full wrapping name", "SecondUnbrokenNameThatMustRemainReadable", "Third"][index],
      avatarUrl: null,
      // The server decides the ranks even when displayed scores are equal.
      wpm: 140,
      createdAt: 1_700_000_000_000,
    }));
    queries.ranges = { "all-time": entries, today: [], week: [] };
    renderLeaderboard();

    const podium = screen.getByRole("list", { name: "All-Time podium" });
    const items = within(podium).getAllByRole("listitem");
    expect(items).toHaveLength(count);
    for (const [index, item] of items.entries()) {
      expect(within(item).getByText(`Rank ${entries[index].rank}`)).toBeInTheDocument();
      expect(within(item).getByText(entries[index].username)).toBeVisible();
      expect(within(item).getByText("140")).toBeVisible();
    }
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
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
    queries.ranges = { "all-time": [entry], today: [], week: [] };
    const result = renderLeaderboard();
    const podium = screen.getByRole("list", { name: "All-Time podium" });
    const avatar = podium.querySelector("img")!;
    expect(avatar).toHaveAttribute("alt", "");
    fireEvent.error(avatar);
    expect(podium.querySelector("img")).toBeNull();
    expect(within(podium).getByText("A")).toBeVisible();
    expect(within(podium).getByText(entry.username)).toBeVisible();
    expect(within(podium).getByText("120")).toBeVisible();

    queries.ranges["all-time"] = [{ ...entry, avatarUrl: "/replacement-avatar.png" }];
    result.rerender(<MemoryRouter><Leaderboard /></MemoryRouter>);
    expect(podium.querySelector("img")).toHaveAttribute("src", "/replacement-avatar.png");
  });

  it("uses stable profile links for duplicate and renamed podium/table usernames", () => {
    const entries = Array.from({ length: 4 }, (_, index) => ({
      userId: `users:stable-${index + 1}`,
      rank: index + 1,
      username: index < 2 ? "Same display name" : `Typist ${index + 1}`,
      avatarUrl: null,
      wpm: 150 - index,
      createdAt: 1_700_000_000_000,
    }));
    queries.ranges = { "all-time": entries, today: entries, week: entries };
    const result = renderLeaderboard();
    for (const period of ["All-Time", "Today", "This Week"]) {
      const region = screen.getByRole("region", { name: period, exact: true });
      expect(within(region).getAllByRole("link", { name: "Same display name" }).map((link) => link.getAttribute("href"))).toEqual([
        "/user/users:stable-1", "/user/users:stable-2",
      ]);
    }
    const allTime = screen.getByRole("region", { name: "All-Time" });
    const firstLink = within(allTime).getAllByRole("link")[0];
    const tableLink = within(allTime).getByRole("link", { name: "Typist 4" });
    queries.ranges["all-time"] = entries.map((entry) => ({ ...entry, username: `Renamed ${entry.rank}` }));
    result.rerender(<MemoryRouter><Leaderboard /></MemoryRouter>);
    expect(within(allTime).getByRole("link", { name: "Renamed 1" })).toBe(firstLink);
    expect(firstLink).toHaveAttribute("href", "/user/users:stable-1");
    expect(within(allTime).getByRole("link", { name: "Renamed 4" })).toBe(tableLink);
    expect(tableLink).toHaveAttribute("href", "/user/users:stable-4");
  });

  it("keeps older deployed responses readable without inventing profile IDs", () => {
    queries.ranges = { "all-time": [{
      rank: 1, username: "Legacy response", avatarUrl: null, wpm: 120, createdAt: 1_700_000_000_000,
    }], today: [], week: [] };
    renderLeaderboard();
    const allTime = screen.getByRole("region", { name: "All-Time" });
    expect(within(allTime).getByText("Legacy response")).toBeVisible();
    expect(within(allTime).queryByRole("link")).not.toBeInTheDocument();
  });
});
