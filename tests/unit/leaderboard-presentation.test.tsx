import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Leaderboard from "@/pages/Leaderboard";

const queries = vi.hoisted(() => ({ ranges: {} as Record<string, unknown> }));
vi.mock("convex/react", () => ({
  useQuery: (_query: unknown, args: { timeRange: string }) => queries.ranges[args.timeRange],
}));
afterEach(cleanup);

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
  });

  it("shows every score immediately and preserves full long usernames", () => {
    const entries = Array.from({ length: 50 }, (_, index) => ({
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
});
