import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Leaderboard from "@/pages/Leaderboard";

const queries = vi.hoisted(() => vi.fn(() => []));
vi.mock("convex/react", () => ({ useQuery: queries }));
vi.mock("../../convex/_generated/api", () => ({ api: { testResults: { getLeaderboard: "leaderboard" } } }));

afterEach(() => { cleanup(); vi.useRealTimers(); queries.mockClear(); });

describe("open leaderboard period rollover", () => {
  it("refreshes UTC labels and query arguments at midnight without database writes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T23:59:30Z"));
    render(<MemoryRouter><Leaderboard /></MemoryRouter>);
    expect(screen.getByText("Tuesday, Sep 22 · UTC")).toBeVisible();
    act(() => vi.advanceTimersByTime(31_000));
    expect(screen.getByText("Wednesday, Sep 23 · UTC")).toBeVisible();
    const beforeLimit = 50 + (Math.floor(Date.parse("2026-09-22T00:00:00Z") / 86_400_000) % 2);
    const afterLimit = 50 + (Math.floor(Date.parse("2026-09-23T00:00:00Z") / 86_400_000) % 2);
    expect(beforeLimit).not.toBe(afterLimit);
    expect(queries).toHaveBeenCalledWith("leaderboard", { timeRange: "today", limit: beforeLimit });
    expect(queries).toHaveBeenCalledWith("leaderboard", { timeRange: "today", limit: afterLimit });
    expect(queries).toHaveBeenCalledWith("leaderboard", { timeRange: "week", limit: afterLimit });
  });
});
