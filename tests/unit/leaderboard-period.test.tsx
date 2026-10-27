import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Leaderboard from "@/pages/Leaderboard";
import { resetCountdownUTC } from "@/lib/leaderboard-period";

const queries = vi.hoisted(() => vi.fn(() => []));
vi.mock("convex/react", () => ({ useQuery: queries }));
vi.mock("../../convex/_generated/api", () => ({ api: { testResults: { getLeaderboard: "leaderboard" } } }));
vi.mock("@/components/layout/Header", () => ({ default: () => null }));
vi.mock("@/components/layout/SiteFooter", () => ({ SiteFooter: () => <footer aria-label="Site footer" /> }));

afterEach(() => { cleanup(); vi.useRealTimers(); queries.mockClear(); });

describe("open leaderboard period rollover", () => {
  it("refreshes UTC labels and query arguments at midnight without database writes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T23:59:30Z"));
    render(<MemoryRouter><Leaderboard /></MemoryRouter>);
    // Switching fades the new subtitle in, so these check content rather than finished animation.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Today" }), { button: 0 });
    expect(screen.getByText(/^Tuesday, Sep 22 · Resets in under a minute · UTC$/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(31_000));
    expect(screen.getByText(/^Wednesday, Sep 23 · Resets in \d+h \d+m · UTC$/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByText("Wednesday, Sep 23 · Resets in 23h 59m · UTC")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "7 days" }), { button: 0 });
    expect(screen.getByText("Sep 16 – Sep 23 · Rolls over daily · UTC")).toBeInTheDocument();
    const beforeLimit = 50 + (Math.floor(Date.parse("2026-09-22T00:00:00Z") / 86_400_000) % 2);
    const afterLimit = 50 + (Math.floor(Date.parse("2026-09-23T00:00:00Z") / 86_400_000) % 2);
    expect(beforeLimit).not.toBe(afterLimit);
    expect(queries).toHaveBeenCalledWith("leaderboard", { timeRange: "today", limit: beforeLimit });
    expect(queries).toHaveBeenCalledWith("leaderboard", { timeRange: "today", limit: afterLimit });
    expect(queries).toHaveBeenCalledWith("leaderboard", { timeRange: "week", limit: afterLimit });
  });
});

describe("reset countdown", () => {
  it("counts down to the next UTC midnight", () => {
    expect(resetCountdownUTC(Date.parse("2026-09-22T20:47:10Z"))).toBe("Resets in 3h 12m");
    expect(resetCountdownUTC(Date.parse("2026-09-22T23:15:00Z"))).toBe("Resets in 45m");
    expect(resetCountdownUTC(Date.parse("2026-09-22T23:59:30Z"))).toBe("Resets in under a minute");
  });
});
